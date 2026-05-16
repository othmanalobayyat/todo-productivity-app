import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../services/authService';

export default function ResetPasswordScreen({ navigation, route }) {
  // Token and email come from URL query params — never shown to the user.
  const email = route.params?.email || '';
  const token = route.params?.token || '';
  const isValidLink = !!(token && email);

  const [password, setPassword]       = useState('');
  const [confirmPassword, setConfirm] = useState('');
  const [showPassword, setShowPass]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setLoading]       = useState(false);
  const [errors, setErrors]           = useState({});
  const [focused, setFocused]         = useState(null);
  const [done, setDone]               = useState(false);
  const [apiError, setApiError]       = useState('');

  const confirmRef = useRef(null);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  const validate = () => {
    const e = {};
    if (!password) e.password = 'New password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password.';
    else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setApiError('');
    setLoading(true);
    try {
      await resetPassword(email, token, password, confirmPassword);
      setDone(true);
    } catch (e) {
      const msg = e.response?.data?.message ?? e.response?.data?.errors?.[0]?.msg;
      setApiError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const rowStyle = (field) => [
    styles.inputRow,
    focused === field && styles.inputFocused,
    !!errors[field] && styles.inputError,
  ];

  // ── Invalid / missing link params ──────────────────────────────────────────
  if (!isValidLink) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.invalidIconCircle}>
          <Ionicons name="warning-outline" size={36} color="#E05555" />
        </View>
        <Text style={styles.invalidTitle}>Invalid Reset Link</Text>
        <Text style={styles.invalidBody}>
          This link is missing required information. Please use the link sent to your email, or request a new one.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('ForgotPassword')}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Request New Link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.centeredContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.doneIconCircle}>
          <Ionicons name="checkmark-circle" size={64} color="#27ae60" />
        </View>
        <Text style={styles.doneTitle}>Password Updated!</Text>
        <Text style={styles.doneBody}>
          Your password has been reset successfully.{'\n'}
          You can now log in with your new password.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={26} color="#451E5D" />
          </View>
          <Text style={styles.title}>Choose a New Password</Text>
          <Text style={styles.subtitle}>Create a strong password for your account.</Text>

          {/* Read-only account pill — shows which account is being reset */}
          <View style={styles.emailChip}>
            <Ionicons name="person-circle-outline" size={15} color="#451E5D" />
            <Text style={styles.emailChipText} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        {/* Inline API error — shown for expired/invalid token responses */}
        {!!apiError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#c0392b" />
            <Text style={styles.errorBannerText}>{apiError}</Text>
          </View>
        )}

        <View style={styles.fields}>
          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={rowStyle('password')}>
              <TextInput
                autoFocus
                placeholder="At least 8 characters"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showPassword}
                style={styles.inputInner}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError('password'); setApiError(''); }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9A94A8" />
              </TouchableOpacity>
            </View>
            {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm password */}
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
                onChangeText={(v) => { setConfirm(v); clearError('confirmPassword'); setApiError(''); }}
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
            : <Text style={styles.primaryBtnText}>Reset Password</Text>}
        </TouchableOpacity>

        {/* Request new link shortcut — visible only after an expired/invalid token error */}
        {!!apiError && (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.linkText}>Request a new reset link</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Shared centered layout (invalid + done screens) ──
  centeredContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },

  // ── Invalid link state ──
  invalidIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  invalidTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: 'center',
  },
  invalidBody: {
    fontSize: 15,
    color: '#7C7A8E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },

  // ── Success state ──
  doneIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FBF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  doneTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: 'center',
  },
  doneBody: {
    fontSize: 15,
    color: '#7C7A8E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },

  // ── Form screen ──
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  header: { marginBottom: 28 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0EBF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#7C7A8E',
    lineHeight: 22,
    marginBottom: 16,
  },

  // Account email pill
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#F0EBF8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emailChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#451E5D',
    maxWidth: 260,
  },

  // API error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#c0392b',
    lineHeight: 18,
  },

  fields: { gap: 20, marginBottom: 28 },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D2055',
    letterSpacing: 0.2,
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
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A0A2E',
  },
  inputFocused: { borderColor: '#451E5D', backgroundColor: '#fff' },
  inputError:   { borderColor: '#E05555', backgroundColor: '#FFF8F8' },
  eyeBtn:       { padding: 4 },
  errorText:    { fontSize: 12, color: '#E05555', marginTop: 2 },

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

  linkRow: { alignItems: 'center', paddingVertical: 16 },
  linkText: { fontSize: 14, color: '#451E5D', fontWeight: '600' },
});
