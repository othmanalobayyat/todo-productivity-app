export function getInsights(tasks, today) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  return {
    total,
    completed,
    overdue: tasks.filter((t) => !t.completed && t.due_date && t.due_date < today).length,
    dueToday: tasks.filter((t) => !t.completed && t.due_date === today).length,
    highPending: tasks.filter((t) => !t.completed && t.priority === "high").length,
  };
}

export function getInsightMessage({ total, completed, overdue, highPending, dueToday }) {
  const pending = total - completed;

  if (total === 0)          return "💡 Add your first task to get started.";
  if (overdue > 0)          return `⚠️ ${overdue} overdue — tackle ${overdue === 1 ? "it" : "those"} first.`;
  if (highPending >= 2)     return `🔥 ${highPending} high-priority items need your focus.`;
  if (dueToday > 0)         return `📅 ${dueToday} due today — don't let ${dueToday === 1 ? "it" : "them"} slip.`;
  if (pending === 0)        return "✅ All caught up. Nice work!";
  if (completed > 0)        return `💪 ${completed} done, ${pending} to go — keep the momentum.`;
  return "💡 You're all set. Pick a task and get started.";
}
