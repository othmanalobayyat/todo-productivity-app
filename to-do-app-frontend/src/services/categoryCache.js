import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CATEGORIES_CACHE_KEY = 'categories_cache';

export async function loadCachedCategories() {
  try {
    const raw = await AsyncStorage.getItem(CATEGORIES_CACHE_KEY);
    if (!raw) return null;
    const categories = JSON.parse(raw);
    return Array.isArray(categories) ? categories : null;
  } catch {
    return null;
  }
}

export async function saveCategories(categories) {
  try {
    await AsyncStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categories));
  } catch {}
}

export async function fetchAndCacheCategories() {
  const res = await api.get('/task-categories');
  const categories = (res.data || []).filter((c) => c.id && c.name);
  saveCategories(categories);
  return categories;
}
