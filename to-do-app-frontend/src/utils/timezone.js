// Returns the device's IANA timezone (e.g. "Europe/Istanbul"), captured at
// the moment a reminder is created/edited and stored alongside it — this is
// what lets the backend scheduler (scheduler.js) fire a recurring reminder
// at the correct local time regardless of which server timezone it runs in,
// and stays correct across DST transitions since it's a zone name, not a
// fixed offset.
export function getDeviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
