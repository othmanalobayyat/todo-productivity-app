import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { AUTH_TOKEN_KEY } from '../constants/storage';

// Store token then fetch the user profile. Called after every successful auth request.
export async function finalizeAuth(token, onSuccess) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  const { data: user } = await api.get('/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  onSuccess(user);
}
