export function getMarkedDates(tasks, selectedDate, today) {
  const marks = {};

  tasks.forEach((task) => {
    if (!task.due_date) return;

    const date = task.due_date;

    marks[date] = {
      ...(marks[date] || {}),
      marked: true,
      dotColor: "#451E5D",
    };
  });

  if (today) {
    marks[today] = {
      ...(marks[today] || {}),
      todayTextColor: "#451E5D",
    };
  }

  if (selectedDate) {
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
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
