import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "./api";

const WRITE_QUEUE_KEY = "write_queue";

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

  if (type === "toggle") {
    const idx = queue.findIndex(
      (op) => op.type === "toggle" && op.payload.taskId === payload.taskId,
    );
    if (idx !== -1) {
      queue.splice(idx, 1);
      await _saveQueue(queue);
      return null; // second toggle cancels the first — net effect = no change
    }
  }

  if (type === "delete") {
    // Remove any pending toggle for this task
    const tIdx = queue.findIndex(
      (op) => op.type === "toggle" && op.payload.taskId === payload.taskId,
    );
    if (tIdx !== -1) queue.splice(tIdx, 1);

    // If it's an offline-only task (create never synced), just drop the create op
    const cIdx = queue.findIndex(
      (op) => op.type === "create" && op.payload.localId === payload.taskId,
    );
    if (cIdx !== -1) {
      queue.splice(cIdx, 1);
      await _saveQueue(queue);
      return "skip"; // task was never on the server — no DELETE needed
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

// ─── OFFLINE ID REMAPPING ───────────────────────────────────────────────────
// When a create operation succeeds, it receives a real server ID to replace
// the temporary offline ID (e.g., 'offline-123456789' → 42).
// This function updates all queued operations that reference the old ID so they
// point to the server ID. This ensures subsequent operations (like updates)
// use the correct ID and don't fail with 404.
//
// Safe to call because:
// - Queue processes sequentially (no concurrent modifications)
// - Only called after successful create (before next operation runs)
// - Idempotent if called multiple times (remaps same operations)
// - If this function fails, queue still processes normally (graceful degradation)
//
async function remapOfflineIdInQueue(localId, serverId) {
  try {
    const queue = await loadQueue();
    const updated = queue.map((op) => {
      // Check if this operation references the old offline ID
      if (op.payload?.taskId === localId) {
        console.log(
          `[Queue] Remapping offline ID ${localId} → ${serverId} in ${op.type} operation`,
        );
        return {
          ...op,
          payload: { ...op.payload, taskId: serverId },
        };
      }
      return op;
    });
    await _saveQueue(updated);
  } catch (err) {
    // Log but don't throw — queue processing continues.
    // Worst case: an update operation will try to PATCH the offline ID,
    // get a 404, and be skipped (existing error handling).
    console.error("[Queue] Failed to remap offline ID:", err);
  }
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

        if (op.type === "create") {
          const res = await api.post("/tasks", op.payload.taskData);
          result = { serverTask: res.data, localId: op.payload.localId };
          // ★ After successful create, remap any pending operations that reference
          // the temporary offline ID to the new server ID.
          await remapOfflineIdInQueue(op.payload.localId, res.data.id);
        } else if (op.type === "toggle") {
          try {
            const res = await api.patch(
              `/tasks/${op.payload.taskId}/complete`,
              {},
            );
            result = res.data;
          } catch (err) {
            if (err.response?.status === 404) {
              // Task deleted server-side — silently discard this toggle
            } else {
              throw err;
            }
          }
        } else if (op.type === "delete") {
          try {
            await api.delete(`/tasks/${op.payload.taskId}`);
          } catch (err) {
            if (err.response?.status !== 404) throw err;
            // 404 = already deleted server-side → treat as success
          }
        } else if (op.type === "update") {
          // ✓ New: Handle offline task edits.
          // Payload includes taskId (either real or offline ID — remapped above)
          // and updates object with fields to modify (title, description, priority, etc).
          try {
            const res = await api.put(
              `/tasks/${op.payload.taskId}`,
              op.payload.updates,
            );
            result = res.data;
          } catch (err) {
            if (err.response?.status === 404) {
              // Task deleted server-side (shouldn't happen for offline-created tasks
              // that were edited, but handle gracefully). Silently discard.
              console.warn(
                `[Queue] Skipped update for task ${op.payload.taskId}: task not found`,
              );
            } else {
              throw err;
            }
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
