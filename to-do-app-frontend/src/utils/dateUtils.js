// Format a Date as YYYY-MM-DD in LOCAL timezone.
// Avoids the UTC shift bug from toISOString() for users behind UTC.
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTodayString() {
  return formatLocalDate(new Date());
}
