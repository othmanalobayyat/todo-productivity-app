import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../components/Toast';
import AppHeader from '../components/AppHeader';
import api from '../services/api';
import { AUTH_TOKEN_KEY } from '../constants/storage';

export default function ProfileScreen({ navigation, userData, onLogoutSuccess }) {
  const [aboutVisible, setAboutVisible] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      onLogoutSuccess();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      onLogoutSuccess();
      showToast('Error logging out');
    }
  };

  const initials = userData?.name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <AppHeader title="My Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.avatarName}>{userData?.name || 'Loading...'}</Text>
          <Text style={styles.avatarEmail}>{userData?.email || ''}</Text>
        </View>

        {/* Account Info */}
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

        {/* Edit Profile */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile', { userData })}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* About Developer — styled as a settings-style card row */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>App</Text>
        <TouchableOpacity
          style={styles.aboutRow}
          onPress={() => setAboutVisible(true)}
          activeOpacity={0.7}>
          <Text style={styles.aboutRowText}>About Developer</Text>
          <Text style={styles.aboutRowChevron}>›</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* About Developer Modal */}
      <Modal
        visible={aboutVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAboutVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* App identity block */}
            <View style={styles.modalAppBlock}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.modalAppIcon}
                resizeMode="contain"
              />
              <Text style={styles.modalAppName}>Todo Productivity App</Text>
              <Text style={styles.modalVersion}>Version 1.0.0</Text>
            </View>

            <Text style={styles.modalDescription}>
              A full-stack mobile productivity app for managing tasks, subtasks,
              priorities, and categories — built with React Native and Laravel.
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Developer</Text>
              <Text style={styles.modalInfoValue}>Othman Al-Obayyat</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Email</Text>
              <Text style={styles.modalInfoValue}>alobayyat.othman@gmail.com</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalInfoLabel}>Built With</Text>
              <Text style={styles.modalInfoValue}>React Native · Node.js</Text>
            </View>
            {/* ───────────────────────────────────────────────── */}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAboutVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { paddingBottom: 40 },

  // Avatar
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
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  avatarName:  { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  avatarEmail: { fontSize: 13, color: '#999', marginTop: 3 },

  // Section label
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 8,
  },

  // Account info card
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
  infoRow:  { paddingHorizontal: 16, paddingVertical: 14 },
  divider:  { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  infoText: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },

  // Edit Profile button (outlined)
  editButton: {
    borderWidth: 1.5,
    borderColor: '#451E5D',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 20,
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#451E5D',
  },

  // Log Out button (filled)
  logoutButton: {
    backgroundColor: '#451E5D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
  logoutButtonText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },

  // About Developer row — matches the profile card visual language
  aboutRow: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  aboutRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  aboutRowChevron: {
    fontSize: 22,
    color: '#ccc',
    lineHeight: 24,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 36,
  },

  // App identity block inside modal
  modalAppBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalAppIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  modalAppName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  modalVersion: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
  },

  // Description
  modalDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },

  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },

  // Developer info rows — label above value
  modalInfoRow: {
    marginBottom: 16,
  },
  modalInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Close button
  modalCloseButton: {
    backgroundColor: '#451E5D',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
