import Constants from 'expo-constants';

const VERSION_URL = 'https://www.othmanalobayyat.online/todo/version.json';
const DOWNLOAD_URL = 'https://www.othmanalobayyat.online/todo';
const FETCH_TIMEOUT_MS = 6000;

// Parse "1.2.10" → [1, 2, 10].  parseInt strips any pre-release suffix.
function parseVersion(str) {
  return String(str)
    .split('.')
    .map((part) => parseInt(part, 10) || 0);
}

// Returns true when `remote` is strictly newer than `local`.
// Iterates segment-by-segment so 1.0.10 > 1.0.9 is handled correctly.
function isNewerVersion(remote, local) {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] ?? 0;
    const lv = l[i] ?? 0;
    if (rv !== lv) return rv > lv;
  }
  return false; // identical versions
}

/**
 * Fetches the remote version manifest and compares it against the installed
 * app version from Expo Constants.
 *
 * Returns an update-info object when a newer version is available:
 *   { latestVersion, releaseNotes, required, downloadUrl }
 *
 * Returns null on: no update available, network error, timeout, parse error.
 * Never throws.
 *
 * Expected version.json schema:
 * {
 *   "latestVersion": "1.1.0",
 *   "releaseNotes": "Bug fixes and new features.",
 *   "required": false          // optional — reserved for future forced-update use
 * }
 */
export async function checkForUpdate() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(VERSION_URL, { signal: controller.signal });
    if (!response.ok) return null;

    const data = await response.json();
    if (!data?.latestVersion) return null;

    const localVersion = Constants.expoConfig?.version ?? '0.0.0';

    if (!isNewerVersion(data.latestVersion, localVersion)) return null;

    return {
      latestVersion: String(data.latestVersion),
      releaseNotes: data.releaseNotes ?? data.release_notes ?? '',
      required: Boolean(data.required),
      downloadUrl: data.downloadUrl ?? DOWNLOAD_URL,
    };
  } catch {
    // AbortError (timeout), NetworkError, JSON.parse failure — all silent
    return null;
  } finally {
    clearTimeout(timer);
  }
}
