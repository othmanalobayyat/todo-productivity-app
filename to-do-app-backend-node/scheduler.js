require("dotenv").config();
var webpush = require("web-push");
var Prisma = require("./prismaClient.js");

// ─── Setup ──────────────────────────────────────────────────────────────────

var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
var VAPID_SUBJECT = process.env.VAPID_SUBJECT;

var vapidConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Fixed advisory-lock key for the scheduler, distinct from the per-user keys
// _generateRecurringOccurrences uses in routes/tasks.js (those lock on a
// userId; this locks on one constant), so the two never collide. Guarantees
// two overlapping scheduler ticks (e.g. an overlapping cron run, or two
// scheduler instances) serialize instead of racing on the same reminders.
var SCHEDULER_LOCK_KEY = 913071;

// A reminder more than this far in the past is treated as missed rather than
// sent — this is what prevents a notification-storm after a long offline/
// down period (e.g. a multi-day gap that also backfills several days of
// recurring occurrences) from pushing a burst of stale reminders.
var STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

// Bounds how far back the candidate query looks, purely to keep the scanned
// row-set small; the STALE_MS check above is what actually decides whether a
// found candidate still gets sent.
var LOOKBACK_DAYS = 3;

// ─── Timezone math ──────────────────────────────────────────────────────────

// Converts a local wall-clock time in an IANA timezone to the UTC instant it
// represents, using only built-in Intl (no new dependency) — correctly
// accounts for DST because it asks the platform what that zone's offset
// actually was/is at the relevant instant, rather than assuming a fixed
// offset.
function _zonedTimeToUtc(dateStr, timeStr, timeZone) {
  var dateParts = dateStr.split("-").map(Number);
  var timeParts = timeStr.split(":").map(Number);
  var y = dateParts[0], m = dateParts[1], d = dateParts[2];
  var hh = timeParts[0], mm = timeParts[1];

  // A naive instant using the wall-clock numbers as if they were UTC.
  var naiveUtc = Date.UTC(y, m - 1, d, hh, mm, 0);

  var dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  var parts = dtf.formatToParts(new Date(naiveUtc));
  var map = {};
  for (var i = 0; i < parts.length; i++) map[parts[i].type] = parts[i].value;

  // What the naive-UTC instant reads as when displayed in the target zone.
  var displayedAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  var offsetMs = displayedAsUtc - naiveUtc;

  // The real UTC instant for the intended local wall-clock time is the
  // naive instant shifted back by that offset.
  return new Date(naiveUtc - offsetMs);
}

function _dateStrDaysAgo(days) {
  var d = new Date(Date.now() - days * 86400000);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// ─── One scheduler tick ─────────────────────────────────────────────────────

async function runOnce() {
  var now = new Date();
  var lookbackDateStr = _dateStrDaysAgo(LOOKBACK_DAYS);

  var claimed = await Prisma.$transaction(
    async function (tx) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SCHEDULER_LOCK_KEY})`;

      var candidates = await tx.tasks.findMany({
        where: {
          reminder_enabled: true,
          completed: false,
          reminder_time: { not: null },
          due_date: { gte: lookbackDateStr },
        },
        select: {
          id: true,
          user_id: true,
          title: true,
          due_date: true,
          reminder_time: true,
          reminder_timezone: true,
        },
      });

      var due = [];
      for (var i = 0; i < candidates.length; i++) {
        var t = candidates[i];
        var tz = t.reminder_timezone || "UTC";
        var fireAt;
        try {
          fireAt = _zonedTimeToUtc(t.due_date, t.reminder_time, tz);
        } catch {
          continue; // malformed timezone/time — skip rather than crash the tick
        }
        if (fireAt.getTime() > now.getTime()) continue; // not due yet
        due.push({
          id: t.id,
          user_id: t.user_id,
          title: t.title,
          fireAt: fireAt,
        });
      }

      if (due.length === 0) return [];

      // Atomic claim: only rows that succeed in this insert are "ours" to
      // send. @@unique(task_id) on reminder_log means a task that a
      // concurrent/overlapping tick already claimed (impossible under the
      // advisory lock, but also guarded independently for defense in depth)
      // is silently skipped rather than double-sent — the same
      // skipDuplicates dedup pattern _generateRecurringOccurrences already
      // relies on for task rows.
      var claimedRows = await tx.reminder_log.createManyAndReturn({
        data: due.map(function (t) {
          return { task_id: t.id };
        }),
        skipDuplicates: true,
        select: { task_id: true },
      });
      var claimedIds = new Set(claimedRows.map((r) => r.task_id));
      return due.filter((t) => claimedIds.has(t.id));
    },
    { timeout: 20000, maxWait: 10000 },
  );

  var sent = 0;
  var stale = 0;
  var prunedSubs = 0;

  for (var i = 0; i < claimed.length; i++) {
    var task = claimed[i];
    var ageMs = now.getTime() - task.fireAt.getTime();
    if (ageMs > STALE_MS) {
      // Already claimed (so it will never be retried) but deliberately not
      // sent — this is what avoids a backlog storm after a long offline/
      // downtime period without letting it fire forever on every future tick.
      stale++;
      continue;
    }

    if (!vapidConfigured) continue; // dev/local without keys configured — claim but no-op

    var subs = await Prisma.push_subscriptions.findMany({ where: { user_id: task.user_id } });
    for (var j = 0; j < subs.length; j++) {
      var sub = subs[j];
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ type: "task_reminder", taskId: task.id, title: task.title }),
        );
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          // Push service confirms this subscription is dead — prune it so
          // it isn't retried on every future tick.
          await Prisma.push_subscriptions.delete({ where: { id: sub.id } }).catch(() => {});
          prunedSubs++;
        }
        // Any other failure (network blip, 5xx from the push service, etc.)
        // is swallowed — this reminder is already marked sent and will not
        // be retried; that's an accepted V1 tradeoff over risking duplicate
        // sends on retry.
      }
    }
  }

  console.log(
    "[scheduler] tick complete — candidates_claimed=" +
      claimed.length +
      " sent=" +
      sent +
      " stale_skipped=" +
      stale +
      " pruned_subscriptions=" +
      prunedSubs +
      (vapidConfigured ? "" : " (VAPID keys not configured — claimed but did not send)"),
  );
}

runOnce()
  .then(function () {
    process.exit(0);
  })
  .catch(function (err) {
    console.error("[scheduler] fatal error", err);
    process.exit(1);
  });
