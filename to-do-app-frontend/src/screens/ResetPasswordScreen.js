import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword } from '../services/authService';
import { showToast } from '../components/Toast';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ResetPasswordScreen({ navigation, route }) {
  const [email, setEmail]               = useState(route.params?.email || '');
  const [token, setToken]               = useState(route.params?.token || '');
  const fromDeepLink = !!(route.params?.token && route.params?.email);
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPassword, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [isLoading, setLoading]         = useState(false);
  const [errors, setErrors]             = useState({});
  const [focused, setFocused]           = useState(null);
  const [done, setDone]                 = useState(false);

  const tokenRef   = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef  = useRef(null);

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!isValidEmail(email.trim())) e.email = 'Enter a valid email address.';
    if (!token.trim()) e.token = 'Reset token is required.';
    if (!password) e.password = 'New password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) e.confirmPassword = 'Please confirm your new password.';
    else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await resetPassword(email.trim(), token.trim(), password, confirmPassword);
      setDone(true);
    } catch (e) {
      const msg = e.response?.data?.message ?? e.response?.data?.errors?.[0]?.msg;
      showToast(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => [
    styles.input,
    focused === field && styles.inputFocused,
    !!errors[field] && styles.inputError,
  ];
  const rowStyle = (field) => [
    styles.inputRow,
    focused === field && styles.inputFocused,
    !!errors[field] && styles.inputError,
  ];

  // ── Success state ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={styles.doneContainer}>
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

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color="#1A0A2E" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="key-outline" size={26} color="#451E5D" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            Open the reset link in your email, copy the token, and choose a new password.
          </Text>
          {fromDeepLink && (
            <View style={styles.deepLinkBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#27ae60" />
              <Text style={styles.deepLinkBadgeText}>Reset link verified from email</Text>
            </View>
          )}
        </View>

        <View style={styles.fields}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#B0AABF"
              style={inputStyle('email')}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError('email'); }}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => tokenRef.current?.focus()}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Token */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Reset Token</Text>
            <TextInput
              ref={tokenRef}
              placeholder="Paste token from your email"
              placeholderTextColor="#B0AABF"
              style={inputStyle('token')}
              value={token}
              onChangeText={(v) => { setToken(v); clearError('token'); }}
              onFocus={() => setFocused('token')}
              onBlur={() => setFocused(null)}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {!!errors.token && <Text style={styles.errorText}>{errors.token}</Text>}
          </View>

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New Password</Text>
            <View style={rowStyle('password')}>
              <TextInput
                ref={passwordRef}
                placeholder="At least 8 characters"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showPassword}
                style={styles.inputInner}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError('password'); }}
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
            : <Text style={styles.primaryBtnText}>Reset Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ── Done / success screen ──
  doneContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
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
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F4F2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
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
  subtitle: { fontSize: 15, color: '#7C7A8E', lineHeight: 22 },
  deepLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#F0FBF4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  deepLinkBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27ae60',
  },

  fields: { gap: 20, marginBottom: 28 },
  fieldGroup: { gap: 6 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3D2055',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F8F6FB',
    borderWidth: 1.5,
    borderColor: '#E8E2F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A0A2E',
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
});
