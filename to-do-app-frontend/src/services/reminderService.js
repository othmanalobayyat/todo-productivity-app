import { Platform } from 'react-native';
import * as androidNotifications from './androidNotifications';
import * as webPush from './webPush';

// Whether this platform can support reminders at all. There is no iOS native
// build (Section A of the audit) — iPhone reminders only exist through the
// installed web PWA.
export function platformSupportsReminders() {
  if (Platform.OS === 'android') return true;
  if (Platform.OS === 'web') return webPush.isSupported() || webPush.needsInstall();
  return false;
}

// Called when the user turns a reminder ON. Requests whatever permission
// this platform needs. Returns { ok, reason }, where reason is one of
// 'denied' | 'unsupported' | 'needs-install' | null (only set when !ok).
export async function requestReminderPermission() {
  if (Platform.OS === 'android') {
    const granted = await androidNotifications.requestPermission();
    if (granted) await androidNotifications.ensureChannel();
    return { ok: granted, reason: granted ? null : 'denied' };
  }

  if (Platform.OS === 'web') {
    if (webPush.needsInstall()) return { ok: false, reason: 'needs-install' };
    if (!webPush.isSupported()) return { ok: false, reason: 'unsupported' };
    const ok = await webPush.enable();
    return { ok, reason: ok ? null : 'denied' };
  }

  return { ok: false, reason: 'unsupported' };
}

// Schedules (Android) a local reminder for a single task. No-op on web —
// iPhone delivery is server-side push, not a local schedule.
export async function scheduleForTask(task) {
  if (Platform.OS === 'android') await androidNotifications.scheduleReminder(task);
}

export async function cancelForTask(taskId) {
  if (Platform.OS === 'android') await androidNotifications.cancelReminder(taskId);
}

// Reconciles Android's local schedules against the full, authoritative task
// list — call after every successful server fetch (see taskCache.js).
export async function reconcileWithTasks(tasks) {
  if (Platform.OS === 'android') await androidNotifications.reconcile(tasks);
}
