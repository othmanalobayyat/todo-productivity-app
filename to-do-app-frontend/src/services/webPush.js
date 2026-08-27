import { Platform } from 'react-native';
import api from './api';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// True when running installed to the Home Screen (iOS's own flag, or the
// standard display-mode media query everywhere else).
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

function _isIphone() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// True only on iPhone when the PWA hasn't been added to the Home Screen yet —
// the one case where Web Push is unavailable specifically because of
// installation state (as opposed to being unavailable at all).
export function needsInstall() {
  if (Platform.OS !== 'web') return false;
  return _isIphone() && !isStandalone();
}

// True when this browser/OS/install-state combination can actually receive
// Web Push while the PWA isn't open. iOS Safari requires Home Screen install
// (16.4+); other browsers that expose the Push API work from a normal tab.
export function isSupported() {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
    return false;
  }
  if (_isIphone()) return isStandalone();
  return true;
}

export function getPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

let _swRegistration = null;

// Registers the service worker. Safe to call unconditionally on app start —
// registration alone does not prompt for permission or subscribe to push.
export async function registerServiceWorker() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    _swRegistration = await navigator.serviceWorker.register('/sw.js');
    return _swRegistration;
  } catch (err) {
    console.warn('[webPush] service worker registration failed', err);
    return null;
  }
}

async function _getRegistration() {
  if (_swRegistration) return _swRegistration;
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    _swRegistration = await navigator.serviceWorker.ready;
    return _swRegistration;
  }
  return null;
}

// Requests Notification permission (must be called from a user gesture,
// e.g. turning a reminder on) and, if granted, subscribes to Web Push and
// registers the subscription with the backend. Returns true only on full
// success — callers should treat anything else as "reminder not enabled".
export async function enable() {
  if (!isSupported() || !VAPID_PUBLIC_KEY) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await _getRegistration();
  if (!reg) return false;

  let subscription = await reg.pushManager.getSubscription();
  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const json = subscription.toJSON();
  await api.post('/push-subscriptions', { endpoint: json.endpoint, keys: json.keys });
  return true;
}

// Re-registers the current push subscription with the backend without
// prompting for permission again — used to recover from
// `pushsubscriptionchange` (the browser silently rotating/invalidating the
// subscription) and to opportunistically refresh registration on app start
// when permission was already granted in an earlier session.
export async function resyncIfAlreadyEnabled() {
  if (!isSupported() || !VAPID_PUBLIC_KEY) return;
  if (Notification.permission !== 'granted') return;
  try {
    const reg = await _getRegistration();
    if (!reg) return;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = subscription.toJSON();
    await api.post('/push-subscriptions', { endpoint: json.endpoint, keys: json.keys });
  } catch {
    // Best-effort — a failure here just means the next explicit enable() will retry.
  }
}

// Unsubscribes this device and tells the backend to drop the subscription.
// Called on logout so a shared/reused device doesn't keep receiving a
// previous account's reminders.
export async function unsubscribe() {
  if (Platform.OS !== 'web') return;
  try {
    const reg = await _getRegistration();
    if (!reg) return;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe().catch(() => {});
    await api.delete('/push-subscriptions', { data: { endpoint } }).catch(() => {});
  } catch {}
}
