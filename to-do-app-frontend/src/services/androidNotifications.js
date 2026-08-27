import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Maps taskId (String) -> the identifier expo-notifications returned when it
// was scheduled, so a later edit/delete/disable can cancel the right one.
const MAP_KEY = 'android_reminder_notification_ids';
const CHANNEL_ID = 'task-reminders';

// Notifications delivered while the app is in the foreground still show as a
// system alert — otherwise a reminder firing while the user happens to have
// the app open would be silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function isSupported() {
  return Platform.OS === 'android';
}

export async function ensureChannel() {
  if (!isSupported()) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// Requests permission only if not already decided — safe to call from a
// deliberate user action (turning a reminder on). Returns whether reminders
// can actually be scheduled.
export async function requestPermission() {
  if (!isSupported()) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function getPermissionGranted() {
  if (!isSupported()) return false;
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

async function _loadMap() {
  try {
    const raw = await AsyncStorage.getItem(MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function _saveMap(map) {
  try {
    await AsyncStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {}
}

export async function cancelReminder(taskId) {
  if (!isSupported()) return;
  const key = String(taskId);
  const map = await _loadMap();
  const notifId = map[key];
  if (notifId) {
    await Notifications.cancelScheduledNotificationAsync(notifId).catch(() => {});
    delete map[key];
    await _saveMap(map);
  }
}

// Interprets due_date ("YYYY-MM-DD") + reminder_time ("HH:mm") in device-local
// time — matches the local-timezone convention formatLocalDate/DatePickerField
// already use for due_date everywhere else in this app.
function _nextFireDate(dueDateStr, timeStr) {
  const [y, m, d] = dueDateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

// (Re)schedules a local reminder for one task, always cancelling any
// previous schedule for the same id first — safe to call unconditionally
// after every create/edit/sync, including for tasks that don't (or no
// longer) qualify: it just cancels and no-ops.
export async function scheduleReminder(task) {
  if (!isSupported()) return;
  await cancelReminder(task.id);

  if (!task.reminder_enabled || !task.reminder_time || !task.due_date) return;
  if (task.completed) return;

  const fireDate = _nextFireDate(task.due_date, task.reminder_time);
  // Never schedule a reminder whose time has already passed — this is what
  // keeps a multi-day offline gap (or a stale cached task) from replaying
  // old reminders once the device reconnects.
  if (fireDate.getTime() <= Date.now()) return;

  const granted = await getPermissionGranted();
  if (!granted) return;
  await ensureChannel();

  const trigger = Notifications.SchedulableTriggerInputTypes
    ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate, channelId: CHANNEL_ID }
    : { date: fireDate, channelId: CHANNEL_ID };

  const notifId = await Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: 'Task reminder',
      data: { taskId: task.id },
    },
    trigger,
  });

  const map = await _loadMap();
  map[String(task.id)] = notifId;
  await _saveMap(map);
}

// Reconciles local schedules against the authoritative task list (called
// after every server fetch) — cancels schedules for tasks that no longer
// exist (deleted while offline, or on another device) and (re)schedules the
// rest. scheduleReminder() cancel-then-reschedules, so this is safe to call
// on every fetch without accumulating duplicate native schedules.
export async function reconcile(tasks) {
  if (!isSupported()) return;
  const map = await _loadMap();
  const liveIds = new Set(tasks.map((t) => String(t.id)));
  for (const idStr of Object.keys(map)) {
    if (!liveIds.has(idStr)) await cancelReminder(idStr);
  }
  for (const task of tasks) {
    await scheduleReminder(task);
  }
}

// Reads which task (if any) launched the app via a tapped local
// notification. Returns null if the app wasn't opened this way.
export async function getInitialNotificationTaskId() {
  if (!isSupported()) return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response?.notification?.request?.content?.data?.taskId ?? null;
  } catch {
    return null;
  }
}

// Subscribes to notification taps that occur while the app is already
// running. Returns an unsubscribe function.
export function subscribeToNotificationTaps(onTaskId) {
  if (!isSupported()) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const taskId = response?.notification?.request?.content?.data?.taskId;
    if (taskId != null) onTaskId(taskId);
  });
  return () => sub.remove();
}
