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
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (total === 0)       return "Add your first task to get started.";
  if (pending === 0)     return "All done! Great work today.";
  if (overdue > 0)       return `${overdue} task${overdue !== 1 ? "s are" : " is"} overdue.`;
  if (highPending > 0)   return `${highPending} high-priority task${highPending !== 1 ? "s need" : " needs"} attention.`;
  if (dueToday > 0)      return `${dueToday} task${dueToday !== 1 ? "s are" : " is"} due today.`;
  if (progress >= 75)    return `Almost there — just ${pending} task${pending !== 1 ? "s" : ""} left.`;
  return "You're clear for today. Keep it up!";
}
