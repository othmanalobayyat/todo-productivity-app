import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { changePassword } from '../services/authService';
import { showToast } from '../components/Toast';

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrent]   = useState('');
  const [newPassword, setNew]           = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew, setShowNew]           = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isLoading, setLoading]         = useState(false);
  const [errors, setErrors]             = useState({});
  const [focused, setFocused]           = useState(null);

  const newRef     = useRef(null);
  const confirmRef = useRef(null);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  const validate = () => {
    const e = {};
    if (!currentPassword) e.currentPassword = 'Current password is required.';
    if (!newPassword) e.newPassword = 'New password is required.';
    else if (newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters.';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password.';
    else if (confirmPassword !== newPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast('Password changed successfully.', 'success');
      navigation.goBack();
    } catch (e) {
      const msg = e.response?.data?.message ?? e.response?.data?.errors?.[0]?.msg;
      showToast(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rowStyle = (field) => [
    styles.inputRow,
    focused === field && styles.inputFocused,
    !!errors[field] && styles.inputError,
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionNote}>
          Choose a strong password with at least 8 characters.
        </Text>

        <View style={styles.card}>
          {/* Current password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Current Password</Text>
            <View style={rowStyle('currentPassword')}>
              <TextInput
                placeholder="Your current password"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showCurrent}
                style={styles.inputInner}
                value={currentPassword}
                onChangeText={(v) => { setCurrent(v); clearError('currentPassword'); }}
                onFocus={() => setFocused('currentPassword')}
                onBlur={() => setFocused(null)}
                autoComplete="password"
                textContentType="password"
                returnKeyType="next"
                onSubmitEditing={() => newRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowCurrent((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9A94A8" />
              </TouchableOpacity>
            </View>
            {!!errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
          </View>

          <View style={styles.separator} />

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={rowStyle('newPassword')}>
              <TextInput
                ref={newRef}
                placeholder="At least 8 characters"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showNew}
                style={styles.inputInner}
                value={newPassword}
                onChangeText={(v) => { setNew(v); clearError('newPassword'); }}
                onFocus={() => setFocused('newPassword')}
                onBlur={() => setFocused(null)}
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowNew((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9A94A8" />
              </TouchableOpacity>
            </View>
            {!!errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </View>

          <View style={styles.separator} />

          {/* Confirm new password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm New Password</Text>
            <View style={rowStyle('confirmPassword')}>
              <TextInput
                ref={confirmRef}
                placeholder="Repeat new password"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showConfirm}
                style={styles.inputInner}
                value={confirmPassword}
                onChangeText={(v) => { setConfirm(v); clearError('confirmPassword'); }}
                onFocus={() => setFocused('confirmPassword')}
                onBlur={() => setFocused(null)}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <TouchableOpacity
                onPress={() => setShowConfirm((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9A94A8" />
              </TouchableOpacity>
            </View>
            {!!errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryBtnText}>Update Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionNote: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  fieldGroup: { paddingVertical: 14 },
  separator: { height: 1, backgroundColor: '#f0f0f0' },

  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6FB',
    borderWidth: 1.5,
    borderColor: '#E8E2F0',
    borderRadius: 12,
    paddingRight: 14,
  },
  inputInner: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#1A0A2E',
  },
  inputFocused: { borderColor: '#451E5D', backgroundColor: '#fff' },
  inputError:   { borderColor: '#E05555', backgroundColor: '#FFF8F8' },
  eyeBtn:       { padding: 4 },
  errorText:    { fontSize: 12, color: '#E05555', marginTop: 6 },

  primaryBtn: {
    backgroundColor: '#451E5D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
