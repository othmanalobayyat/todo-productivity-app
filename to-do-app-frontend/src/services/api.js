import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_BASE_URL from "../config";
import { AUTH_TOKEN_KEY } from "../constants/storage";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Registered by App.js on mount via registerLogoutCallback().
// Kept at module level so the response interceptor can reach it
// without creating a circular dependency.
let _logoutCallback = null;

// Guards against multiple simultaneous 401 responses all triggering logout.
let _isHandlingExpiry = false;

// In-memory token cache — avoids an AsyncStorage filesystem read on every
// request. Warmed lazily on first request, set explicitly after login, and
// cleared on logout or 401.
let _cachedToken = null;

export function registerLogoutCallback(fn) {
  _logoutCallback = fn;
}

export function setCachedToken(token) {
  _cachedToken = token;
}

export function clearCachedToken() {
  _cachedToken = null;
}

// ── Request interceptor — injects Bearer token ──────────────────────────────
api.interceptors.request.use(async (config) => {
  if (_cachedToken === null) {
    _cachedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  }
  if (_cachedToken) {
    config.headers.Authorization = `Bearer ${_cachedToken}`;
  }
  return config;
});

// ── Response interceptor — handles expired / invalid sessions ───────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !_isHandlingExpiry) {
      _isHandlingExpiry = true;
      _cachedToken = null;
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      if (_logoutCallback) {
        _logoutCallback();
      }
      // Reset the guard after a short window so a fresh login attempt
      // can produce a legitimate 401 (wrong credentials) without being swallowed.
      setTimeout(() => {
        _isHandlingExpiry = false;
      }, 3000);
    }
    return Promise.reject(error);
  },
);

export default api;
