export function getMarkedDates(tasks, selectedDate, today) {
  const marks = {};

  if (selectedDate) {
    marks[selectedDate] = {
      selected: true,
      selectedColor: "#451E5D",
      selectedTextColor: "#fff",
    };
  }

  return marks;
}

export function getTasksForDate(tasks, date) {
  if (!date) return [];
  return tasks.filter((task) => task.due_date === date);
}
