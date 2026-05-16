import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { AUTH_TOKEN_KEY } from '../constants/storage';

// Store token then fetch the user profile. Called after every successful auth request.
export async function finalizeAuth(token, onSuccess) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  const { data: user } = await api.get('/profile');
  onSuccess(user);
}

export async function forgotPassword(email) {
  const { data } = await api.post('/forgot-password', { email });
  return data;
}

export async function resetPassword(email, token, password, passwordConfirmation) {
  const { data } = await api.post('/reset-password', {
    email,
    token,
    password,
    password_confirmation: passwordConfirmation,
  });
  return data;
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await api.put('/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}
