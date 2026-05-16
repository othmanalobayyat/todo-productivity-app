import React, { useState, useEffect } from 'react';
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
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '../components/Toast';
import AppHeader from '../components/AppHeader';
import api from '../services/api';
import { AUTH_TOKEN_KEY } from '../constants/storage';
import { calculateStreak } from '../utils/streakUtils';

const ACHIEVEMENTS = [
  { id: 'focused_week',  label: 'Focused Week',       icon: 'star',     threshold: (c) => c.completed >= 7  },
  { id: 'task_crusher',  label: 'Task Crusher',        icon: 'bolt',     threshold: (c) => c.completed >= 30 },
  { id: 'streak_7',      label: '7 Day Streak',        icon: 'fire-alt', threshold: (c) => c.streak >= 7     },
  { id: 'consistency',   label: 'Consistency Master',  icon: 'trophy',   threshold: (c) => c.streak >= 30    },
];

export default function ProfileScreen({ navigation, userData, onLogoutSuccess }) {
  const [aboutVisible, setAboutVisible] = useState(false);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = navigation.addListener('focus', fetchTasks);
    return unsubscribe;
  }, [navigation]);

  async function fetchTasks() {
    try {
      const response = await api.get('/tasks');
      setTasks(response.data.filter((t) => t.id && t.title));
    } catch (_) {}
  }

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
  const streak = calculateStreak(tasks);
  const completedCount = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const successRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const ctx = { completed: completedCount, streak };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <AppHeader title="My Profile" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.heroName}>{userData?.name || '—'}</Text>
          <Text style={styles.heroEmail}>{userData?.email || ''}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon5 name="fire-alt" size={18} color="#FF6000" solid />
            <Text style={[styles.statNumber, { color: '#FF6000' }]}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, styles.statCardMiddle]}>
            <Icon5 name="check-circle" size={18} color="#27ae60" solid />
            <Text style={[styles.statNumber, { color: '#27ae60' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Icon5 name="chart-bar" size={16} color="#451E5D" solid />
            <Text style={[styles.statNumber, { color: '#451E5D' }]}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        {/* Achievements */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.achievementsRow}
        >
          {ACHIEVEMENTS.map((a) => {
            const unlocked = a.threshold(ctx);
            return (
              <View key={a.id} style={[styles.badge, !unlocked && styles.badgeLocked]}>
                <Icon5
                  name={a.icon}
                  size={13}
                  color={unlocked ? '#451E5D' : '#ccc'}
                  solid
                />
                <Text style={[styles.badgeText, !unlocked && styles.badgeTextLocked]}>
                  {a.label}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Security */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>Security</Text>
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => navigation.navigate('ChangePassword')}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="lock-closed-outline" size={16} color="#451E5D" />
            </View>
            <Text style={styles.settingsRowText}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsRow, { marginTop: 8 }]}
          onPress={() => navigation.navigate('EditProfile', { userData })}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="person-outline" size={16} color="#451E5D" />
            </View>
            <Text style={styles.settingsRowText}>Edit Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        {/* Log Out */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* App */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>App</Text>
        <TouchableOpacity
          style={styles.settingsRow}
          onPress={() => setAboutVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#F2F2F2' }]}>
              <Ionicons name="information-circle-outline" size={16} color="#888" />
            </View>
            <Text style={styles.settingsRowText}>About Developer</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

      </ScrollView>

      {/* About Developer Modal */}
      <Modal
        visible={aboutVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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
              priorities, and categories — built with React Native and Node.js.
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

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setAboutVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f2f8' },
  scrollContent: { paddingBottom: 48 },

  // Hero
  heroSection: {
    alignItems: 'center',
    paddingTop: 22,
    paddingBottom: 14,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#D9C8EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#451E5D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  heroName:   { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  heroEmail:  { fontSize: 13, color: '#999', fontWeight: '400' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 22,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    gap: 5,
  },
  statCardMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
  },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },

  // Achievements
  achievementsRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EDE7F6',
    borderWidth: 1.5,
    borderColor: '#C9AEE4',
  },
  badgeLocked: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#451E5D',
  },
  badgeTextLocked: {
    color: '#ccc',
  },

  // Settings rows
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
  },

  // Log Out
  logoutButton: {
    backgroundColor: '#451E5D',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  logoutButtonText: { fontSize: 15, color: '#fff', fontWeight: '700' },

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
  modalCloseButton: {
    backgroundColor: '#451E5D',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
