import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const WRITE_QUEUE_KEY = 'write_queue';

let _isDraining = false;

export async function loadQueue() {
  try {
    const raw = await AsyncStorage.getItem(WRITE_QUEUE_KEY);
    if (!raw) return [];
    const q = JSON.parse(raw);
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

async function _saveQueue(queue) {
  try {
    await AsyncStorage.setItem(WRITE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

// Adds an operation to the queue.
// Special deduplication rules:
//   toggle × 2 on the same task → cancel each other (removes the first, returns null)
//   delete on a task with a pending toggle → removes the toggle first
//   delete on an offline-only task (pending create) → removes the create, returns 'skip'
// Returns the new op id, null (cancelled), or 'skip' (no-op needed).
export async function enqueueOperation(type, payload) {
  const queue = await loadQueue();

  if (type === 'toggle') {
    const idx = queue.findIndex(
      (op) => op.type === 'toggle' && op.payload.taskId === payload.taskId,
    );
    if (idx !== -1) {
      queue.splice(idx, 1);
      await _saveQueue(queue);
      return null; // second toggle cancels the first — net effect = no change
    }
  }

  if (type === 'delete') {
    // Remove any pending toggle for this task
    const tIdx = queue.findIndex(
      (op) => op.type === 'toggle' && op.payload.taskId === payload.taskId,
    );
    if (tIdx !== -1) queue.splice(tIdx, 1);

    // If it's an offline-only task (create never synced), just drop the create op
    const cIdx = queue.findIndex(
      (op) => op.type === 'create' && op.payload.localId === payload.taskId,
    );
    if (cIdx !== -1) {
      queue.splice(cIdx, 1);
      await _saveQueue(queue);
      return 'skip'; // task was never on the server — no DELETE needed
    }
  }

  const op = {
    id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  queue.push(op);
  await _saveQueue(queue);
  return op.id;
}

export async function removeOperation(opId) {
  const queue = await loadQueue();
  await _saveQueue(queue.filter((op) => op.id !== opId));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(WRITE_QUEUE_KEY).catch(() => {});
}

// Drains the queue sequentially.
// onItemDrained(op, result) is called after each successful item for cache surgery.
// Stops on the first failure to preserve ordering; remaining items stay queued.
// Returns { success: boolean, remaining: number }.
export async function drainQueue(onItemDrained) {
  if (_isDraining) return { success: false, remaining: -1 };
  _isDraining = true;

  try {
    const queue = await loadQueue();
    if (queue.length === 0) return { success: true, remaining: 0 };

    for (const op of queue) {
      try {
        let result = null;

        if (op.type === 'create') {
          const res = await api.post('/tasks', op.payload.taskData);
          result = { serverTask: res.data, localId: op.payload.localId };
        } else if (op.type === 'toggle') {
          try {
            const res = await api.patch(`/tasks/${op.payload.taskId}/complete`, {});
            result = res.data;
          } catch (err) {
            if (err.response?.status === 404) {
              // Task deleted server-side — silently discard this toggle
            } else {
              throw err;
            }
          }
        } else if (op.type === 'delete') {
          try {
            await api.delete(`/tasks/${op.payload.taskId}`);
          } catch (err) {
            if (err.response?.status !== 404) throw err;
            // 404 = already deleted server-side → treat as success
          }
        }

        if (onItemDrained) await onItemDrained(op, result);
        await removeOperation(op.id);
      } catch {
        // Stop on first unrecoverable error; remaining items stay queued
        const remaining = await loadQueue();
        return { success: false, remaining: remaining.length };
      }
    }

    return { success: true, remaining: 0 };
  } finally {
    _isDraining = false;
  }
}
