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

export function registerLogoutCallback(fn) {
  _logoutCallback = fn;
}

// ── Request interceptor — injects Bearer token ──────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handles expired / invalid sessions ───────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !_isHandlingExpiry) {
      _isHandlingExpiry = true;
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
