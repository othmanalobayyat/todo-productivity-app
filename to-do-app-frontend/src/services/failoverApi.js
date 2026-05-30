import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, API_FALLBACK_URL } from "../config";
import { AUTH_TOKEN_KEY } from "../constants/storage";

/**
 * Axios wrapper with automatic failover to Fly.io if Render backend fails.
 *
 * Features:
 * - Automatic retry on Fly.io for timeouts, network errors, and 5xx responses
 * - Preserves auth tokens across both backends
 * - Same interface as regular axios (get, post, put, patch, delete)
 * - Only retries on retryable errors (not 4xx client errors)
 *
 * Usage:
 *   import failoverApi from '../services/failoverApi';
 *   const response = await failoverApi.get('/tasks');
 *   const newTask = await failoverApi.post('/tasks', { title: 'Test' });
 */

const FAILOVER_TIMEOUT = 5000; // 5 seconds before attempting fallback

// Temporary token cache for this request (avoids AsyncStorage calls per retry)
let _currentToken = null;

async function _getAuthToken() {
  if (_currentToken !== null) {
    return _currentToken;
  }
  _currentToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return _currentToken;
}

/**
 * Make an HTTP request with automatic failover.
 * Tries primary backend first, then falls back to secondary on retryable errors.
 */
async function _makeRequestWithFailover(method, endpoint, data, customHeaders) {
  const token = await _getAuthToken();
  _currentToken = null; // Reset for next request

  const baseConfig = {
    method,
    url: endpoint,
    data,
    timeout: FAILOVER_TIMEOUT,
    headers: {
      "Content-Type": "application/json",
      ...customHeaders,
    },
  };

  // Add auth token if available
  if (token) {
    baseConfig.headers.Authorization = `Bearer ${token}`;
  }

  // ── Attempt 1: Try primary backend (Render) ────────────────────────────
  try {
    const response = await axios({
      ...baseConfig,
      url: `${API_BASE_URL}${endpoint}`,
    });
    return response.data;
  } catch (primaryError) {
    // Check if this error is worth retrying on fallback
    const errorCode = primaryError.code;
    const status = primaryError.response?.status;
    const isNetworkError = !primaryError.response; // No response = network error
    const isTimeout = errorCode === "ECONNABORTED"; // Axios timeout
    const is5xx = status >= 500; // Server error

    const isRetryable = isNetworkError || isTimeout || is5xx;

    if (!isRetryable || !API_FALLBACK_URL) {
      // Not a retryable error, or no fallback available → reject immediately
      throw primaryError;
    }

    // ── Attempt 2: Try fallback backend (Fly.io) ────────────────────────────
    console.warn(
      `[Failover] Primary backend failed (${errorCode || status}). Attempting fallback...`,
    );

    try {
      const response = await axios({
        ...baseConfig,
        url: `${API_FALLBACK_URL}${endpoint}`,
      });
      console.log("[Failover] Request succeeded on fallback backend");
      return response.data;
    } catch (fallbackError) {
      console.error(
        "[Failover] Fallback backend also failed:",
        fallbackError.message,
      );
      throw fallbackError;
    }
  }
}

/**
 * Export axios-like interface with built-in failover.
 * Use this instead of regular `api` when you need automatic backend failover.
 */
const failoverApi = {
  /**
   * GET request with failover
   * @param {string} endpoint - e.g., '/tasks', '/profile'
   * @param {object} config - optional { headers: {...} }
   * @returns {Promise<any>}
   */
  get: (endpoint, config) =>
    _makeRequestWithFailover("GET", endpoint, null, config?.headers),

  /**
   * POST request with failover
   * @param {string} endpoint - e.g., '/tasks'
   * @param {object} data - request body
   * @param {object} config - optional { headers: {...} }
   * @returns {Promise<any>}
   */
  post: (endpoint, data, config) =>
    _makeRequestWithFailover("POST", endpoint, data, config?.headers),

  /**
   * PUT request with failover
   * @param {string} endpoint - e.g., '/tasks/42'
   * @param {object} data - request body
   * @param {object} config - optional { headers: {...} }
   * @returns {Promise<any>}
   */
  put: (endpoint, data, config) =>
    _makeRequestWithFailover("PUT", endpoint, data, config?.headers),

  /**
   * PATCH request with failover
   * @param {string} endpoint - e.g., '/tasks/42'
   * @param {object} data - request body
   * @param {object} config - optional { headers: {...} }
   * @returns {Promise<any>}
   */
  patch: (endpoint, data, config) =>
    _makeRequestWithFailover("PATCH", endpoint, data, config?.headers),

  /**
   * DELETE request with failover
   * @param {string} endpoint - e.g., '/tasks/42'
   * @param {object} config - optional { headers: {...} }
   * @returns {Promise<any>}
   */
  delete: (endpoint, config) =>
    _makeRequestWithFailover("DELETE", endpoint, null, config?.headers),
};

export default failoverApi;
