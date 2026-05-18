export function getMarkedDates(tasks, selectedDate, today) {
  const marks = {};

  // Single muted dot for any day that has at least one task
  tasks.forEach((task) => {
    if (!task.due_date) return;
    const existing = marks[task.due_date] || {};
    marks[task.due_date] = {
      ...existing,
      marked: true,
      dotColor: "#c4aee0",
    };
  });

  // Selected day overlays on top — preserves dot if present
  if (selectedDate) {
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: "#451E5D",
      selectedTextColor: "#fff",
      dotColor: "#fff",
    };
  }

  return marks;
}

export function getTasksForDate(tasks, date) {
  if (!date) return [];
  return tasks.filter((task) => task.due_date === date);
}
