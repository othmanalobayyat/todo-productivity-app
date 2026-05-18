// Lightweight single-callback bridge so App.js can notify TasksScreen to
// reload after the write queue drains. Mirrors the registerLogoutCallback
// pattern in api.js — no libraries, no global store.

let _onRefresh = null;

export function registerTaskRefreshHandler(fn) {
  _onRefresh = fn;
}

export function unregisterTaskRefreshHandler() {
  _onRefresh = null;
}

export function triggerTaskRefresh() {
  if (_onRefresh) _onRefresh();
}
