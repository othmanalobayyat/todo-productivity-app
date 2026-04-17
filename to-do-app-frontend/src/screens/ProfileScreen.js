import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../components/Toast';
import HeaderComponentProfile from '../components/HeaderComponentProfile';
import api from '../services/api';

export default function ProfileScreen({ userData, onLogoutSuccess }) {
  // Logout handler
  const handleLogout = async () => {
    try {
      // Invalidate the token on the server first
      await api.post('/logout');

      // Remove the auth token from AsyncStorage
      await AsyncStorage.removeItem('auth_token');

      // Notify App.js that the user has logged out — App.js handles navigation
      onLogoutSuccess();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      // Still clear the local token so the user is not stuck
      await AsyncStorage.removeItem('auth_token');
      onLogoutSuccess();
      showToast('Error logging out');
    }
  };

  const initials = userData?.name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <HeaderComponentProfile />

      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.avatarName}>{userData?.name || 'Loading...'}</Text>
        <Text style={styles.avatarEmail}>{userData?.email || ''}</Text>
      </View>

      <Text style={styles.sectionTitle}>Account Info</Text>
      <View style={styles.profileInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.infoText}>{userData?.name || 'Loading...'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.infoText}>{userData?.email || 'Loading...'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  avatarSection: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#451E5D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  avatarEmail: {
    fontSize: 13,
    color: '#999',
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  profileInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginHorizontal: 20,
  },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  logoutButton: {
    backgroundColor: '#451E5D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
