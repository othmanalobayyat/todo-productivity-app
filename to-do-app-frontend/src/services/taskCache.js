import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const TASKS_CACHE_KEY = 'tasks_cache';

// In-flight deduplication: screens that call fetchAndCacheTasks() while a
// request is already running receive the same Promise instead of firing a
// redundant network request. Cleared on both success and failure.
let _pendingFetch = null;

// Returns the cached task array, or null if no cache / corrupt entry.
export async function loadCachedTasks() {
  try {
    const raw = await AsyncStorage.getItem(TASKS_CACHE_KEY);
    if (!raw) return null;
    const tasks = JSON.parse(raw);
    return Array.isArray(tasks) ? tasks : null;
  } catch {
    return null;
  }
}

// Persists the task array. Non-fatal if storage is full or unavailable.
export async function saveTasks(tasks) {
  try {
    await AsyncStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(tasks));
  } catch {
    // Storage write failure leaves the previous cache intact — acceptable.
  }
}

export function clearTaskCache() {
  return AsyncStorage.removeItem(TASKS_CACHE_KEY).catch(() => {});
}

// Fetches tasks from the server, updates the cache, and returns the array.
// Concurrent callers during the same in-flight request share one Promise.
export function fetchAndCacheTasks() {
  if (_pendingFetch) return _pendingFetch;

  _pendingFetch = api.get('/tasks')
    .then((res) => {
      const tasks = (res.data || []).filter((t) => t.id && t.title);
      saveTasks(tasks);
      return tasks;
    })
    .finally(() => {
      _pendingFetch = null;
    });

  return _pendingFetch;
}
