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

const _WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const _MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Returns a human-friendly label for dueDateStr relative to todayStr.
// Both strings must be YYYY-MM-DD in the device's local timezone.
// Appending T00:00:00 forces local-midnight parsing and avoids the UTC
// shift that Date('YYYY-MM-DD') produces for users behind UTC.
export function getRelativeDateLabel(dueDateStr, todayStr) {
  const due   = new Date(dueDateStr + 'T00:00:00');
  const today = new Date(todayStr   + 'T00:00:00');
  // Math.round absorbs the ±1 h DST drift that can occur when crossing
  // a daylight-saving boundary between the two dates.
  const diff  = Math.round((due - today) / 86400000);

  if (diff ===  0) return 'Today';
  if (diff ===  1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  return `${_WEEKDAYS[due.getDay()]}, ${due.getDate()} ${_MONTHS[due.getMonth()]}`;
}
