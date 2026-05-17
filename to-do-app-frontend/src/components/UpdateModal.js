import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Props:
 *   visible      — boolean
 *   info         — { latestVersion, releaseNotes, required, downloadUrl }
 *   onUpdate     — called when "Update Now" is pressed
 *   onLater      — called when "Later" is pressed (also fires on Android back)
 */
export default function UpdateModal({ visible, info, onUpdate, onLater }) {
  if (!info) return null;

  const { latestVersion, releaseNotes, required } = info;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onLater}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="arrow-up-circle" size={44} color="#451E5D" />
          </View>

          {/* Header */}
          <Text style={styles.title}>Update Available</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{latestVersion}</Text>
            </View>
            {required && (
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>Required</Text>
              </View>
            )}
          </View>

          {/* Release notes */}
          {!!releaseNotes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>What's New</Text>
              <ScrollView
                style={styles.notesScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}>
                <Text style={styles.notesText}>{releaseNotes}</Text>
              </ScrollView>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={onLater}
              activeOpacity={0.7}>
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={onUpdate}
              activeOpacity={0.85}>
              <Text style={styles.updateText}>Update Now</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    // Subtle purple-tinted shadow on the sheet
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },

  // Icon
  iconWrap: {
    alignSelf: 'center',
    marginBottom: 16,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A0A2E',
    textAlign: 'center',
    marginBottom: 12,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  versionBadge: {
    backgroundColor: '#EDE7F6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#C9AEE4',
  },
  versionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#451E5D',
    letterSpacing: 0.3,
  },
  requiredBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: '#FFB74D',
  },
  requiredBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
  },

  // Release notes
  notesBox: {
    backgroundColor: '#F8F6FB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EDE7F6',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#451E5D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  notesScroll: {
    maxHeight: 120,
  },
  notesText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 21,
  },

  // Buttons
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  laterBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
  },
  laterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  updateBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#451E5D',
    alignItems: 'center',
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  updateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
});
