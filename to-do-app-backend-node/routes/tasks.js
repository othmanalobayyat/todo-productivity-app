var express = require("express");
var Prisma = require("../prismaClient.js");
var authMiddleware = require("../middleware/auth.js");
var router = express.Router();
var { body, validationResult } = require("express-validator");

// ─── Recurring task helpers ────────────────────────────────────────────────

function _addOneDay(dateStr) {
  var parts = dateStr.split("-").map(Number);
  var dt = new Date(parts[0], parts[1] - 1, parts[2] + 1);
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, "0"),
    String(dt.getDate()).padStart(2, "0"),
  ].join("-");
}

// Inserts one row per missing day for every active recurring chain owned by
// userId, up to and including today, optionally copying subtasks from the
// latest occurrence when that chain has repeat_subtasks enabled.
//
// Concurrency: the whole function runs inside a single transaction guarded by
// a Postgres session-level advisory lock scoped to userId
// (pg_advisory_xact_lock). Two simultaneous GET /tasks calls for the same
// user serialize on this lock — the second call only starts its own
// chain/latest lookup after the first has committed, so it always sees the
// first call's newly-created occurrences and never re-derives the same
// "latest" row twice. This makes both the task rows and their copied
// subtasks safe to generate concurrently without relying on timing, in
// addition to (not instead of) the existing unique(recur_chain_id, due_date)
// constraint on tasks, which still guards against duplicate occurrences from
// any other write path.
//
// Task rows for a chain's gap are inserted in one batched
// createManyAndReturn (skipDuplicates) call rather than per-day round trips,
// so a multi-day (or multi-chain) gap stays fast under real network latency;
// subtasks are then copied in one batched createMany per chain, keyed off
// the ids that call actually returns.
async function _generateRecurringOccurrences(userId) {
  var now = new Date();
  var todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  await Prisma.$transaction(
    async function (tx) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;

      var allRecurring = await tx.tasks.findMany({
        where: { user_id: userId, is_recurring: true, recur_chain_id: { not: null } },
        orderBy: { due_date: "desc" },
        select: {
          id: true,
          due_date: true,
          recur_chain_id: true,
          title: true,
          description: true,
          priority: true,
          category_id: true,
          repeat_subtasks: true,
        },
      });

      // Keep only the latest (highest due_date) occurrence per chain.
      var chainLatest = new Map();
      for (var t of allRecurring) {
        if (!chainLatest.has(t.recur_chain_id)) {
          chainLatest.set(t.recur_chain_id, t);
        }
      }

      for (var [chainId, latest] of chainLatest) {
        if (!latest.due_date || latest.due_date >= todayStr) continue;

        var toCreate = [];
        var cursor = latest.due_date;
        var count = 0;
        while (count < 365) {
          cursor = _addOneDay(cursor);
          if (cursor > todayStr) break;
          count++;
          toCreate.push({
            user_id: userId,
            title: latest.title,
            description: latest.description,
            priority: latest.priority,
            category_id: latest.category_id,
            due_date: cursor,
            is_recurring: true,
            recur_from_id: latest.id,
            recur_chain_id: chainId,
            repeat_subtasks: latest.repeat_subtasks,
            completed: false,
          });
        }

        if (toCreate.length === 0) continue;

        var createdRows = await tx.tasks.createManyAndReturn({
          data: toCreate,
          skipDuplicates: true,
          select: { id: true },
        });

        if (createdRows.length === 0 || !latest.repeat_subtasks) continue;

        // Copied from the latest occurrence once per chain, so every day
        // generated in this gap inherits the same source subtask set —
        // mirroring how title/description/priority above are also copied
        // from `latest` rather than re-derived per generated day. Deletes
        // made to the latest occurrence's subtasks after that lookup simply
        // aren't in this list; additions made before it are.
        var sourceSubtasks = await tx.subtasks.findMany({
          where: { task_id: latest.id },
          select: { title: true },
        });

        if (sourceSubtasks.length === 0) continue;

        var subtaskRows = [];
        for (var row of createdRows) {
          for (var s of sourceSubtasks) {
            subtaskRows.push({ task_id: row.id, title: s.title, completed: false });
          }
        }
        await tx.subtasks.createMany({ data: subtaskRows });
      }
    },
    { timeout: 20000, maxWait: 10000 },
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────

router.get("/tasks", authMiddleware, async function (req, res) {
  try {
    // Generate any missing daily occurrences before fetching. Failure here
    // must not break the response — tasks are still returned without it.
    try {
      await _generateRecurringOccurrences(req.user.userId);
    } catch {}

    var tasks = await Prisma.tasks.findMany({
      where: { user_id: req.user.userId },
      include: {
        _count: { select: { subtasks: true } },
        subtasks: { where: { completed: true }, select: { id: true } },
      },
    });
    var result = tasks.map(function (task) {
      var { _count, subtasks: completedSubs, ...taskFields } = task;
      return {
        ...taskFields,
        subtasks_total: _count.subtasks,
        subtasks_completed: completedSubs.length,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("GET /tasks error:", error);
    res.status(500).json({ message: "Error fetching tasks" });
  }
});

router.post(
  "/tasks",
  authMiddleware,
  [body("title").notEmpty().withMessage("Task title is required")],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      var task = await Prisma.tasks.create({
        data: {
          title: req.body.title,
          user_id: req.user.userId,
          description: req.body.description,
          due_date: req.body.due_date,
          priority: req.body.priority || "medium",
          category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
          is_recurring: req.body.is_recurring === true || req.body.is_recurring === "true",
          repeat_subtasks: req.body.repeat_subtasks === true || req.body.repeat_subtasks === "true",
        },
      });

      // Bootstrap the chain: the root task points to itself as the chain anchor.
      if (task.is_recurring) {
        task = await Prisma.tasks.update({
          where: { id: task.id },
          data: { recur_chain_id: task.id },
        });
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error creating task" });
    }
  },
);

router.get("/tasks/:id", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task" });
  }
});

router.put(
  "/tasks/:id",
  authMiddleware,
  [
    body("title").notEmpty().withMessage("Task title is required"),
    body("priority").optional().isIn(["high", "medium", "low"]).withMessage("Priority must be high, medium, or low"),
    body("completed").not().exists().withMessage("Use PATCH /tasks/:id/complete to change completion status"),
  ],
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      var task = await Prisma.tasks.findFirst({
        where: { id: parseInt(req.params.id), user_id: req.user.userId },
      });
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      var updateData = {
        title: req.body.title,
        description: req.body.description,
        due_date: req.body.due_date,
        priority: req.body.priority || "medium",
        category_id: req.body.category_id ? parseInt(req.body.category_id) : null,
      };
      if (req.body.is_recurring !== undefined) {
        updateData.is_recurring = req.body.is_recurring === true || req.body.is_recurring === "true";
      }
      if (req.body.repeat_subtasks !== undefined) {
        updateData.repeat_subtasks = req.body.repeat_subtasks === true || req.body.repeat_subtasks === "true";
      }

      var updated = await Prisma.tasks.update({
        where: { id: parseInt(req.params.id) },
        data: updateData,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating task" });
    }
  },
);

router.delete("/tasks/:id", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    await Prisma.tasks.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting task" });
  }
});

router.patch("/tasks/:id/complete", authMiddleware, async function (req, res) {
  try {
    var task = await Prisma.tasks.findFirst({
      where: { id: parseInt(req.params.id), user_id: req.user.userId },
    });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    var nowCompleting = !task.completed;
    var updated = await Prisma.tasks.update({
      where: { id: parseInt(req.params.id) },
      data: {
        completed: nowCompleting,
        completed_at: nowCompleting ? new Date() : null,
      },
      include: {
        _count: { select: { subtasks: true } },
        subtasks: { where: { completed: true }, select: { id: true } },
      },
    });
    var { _count, subtasks: completedSubs, ...taskFields } = updated;
    res.json({
      ...taskFields,
      subtasks_total: _count.subtasks,
      subtasks_completed: completedSubs.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating task" });
  }
});

module.exports = router;
