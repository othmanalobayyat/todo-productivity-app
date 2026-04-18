import { getTodayString, formatLocalDate } from './dateUtils';

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.completed_at)
      .map((t) => formatLocalDate(new Date(t.completed_at)))
  );

  if (completedDates.size === 0) return 0;

  const today = getTodayString();
  // If nothing completed today yet, start checking from yesterday —
  // the day isn't over so the streak isn't broken.
  let cursor = completedDates.has(today) ? today : shiftDate(today, -1);

  let streak = 0;
  while (completedDates.has(cursor)) {
    streak++;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}
