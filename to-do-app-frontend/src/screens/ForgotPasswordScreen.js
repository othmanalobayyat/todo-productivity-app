import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forgotPassword } from '../services/authService';
import { showToast } from '../components/Toast';

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [isLoading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState('');
  const [focused, setFocused]   = useState(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) return setError('Email is required.');
    if (!isValidEmail(trimmed)) return setError('Enter a valid email address.');
    setError('');
    setLoading(true);
    try {
      await forgotPassword(trimmed);
      setSubmitted(true);
    } catch (e) {
      showToast(e.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 12, 56) }]}
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

        {!submitted ? (
          <>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-open-outline" size={26} color="#451E5D" />
              </View>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>
                Enter your account email and we'll send you a password reset link.
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor="#B0AABF"
                style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(''); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.primaryBtnText}>Send Reset Link</Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* ── Success state ── */
          <View style={styles.successBox}>
            <View style={styles.successIconCircle}>
              <Ionicons name="mail-unread-outline" size={38} color="#451E5D" />
            </View>

            <Text style={styles.successTitle}>Check your inbox</Text>

            <Text style={styles.successBody}>
              We sent a reset link to{'\n'}
              <Text style={styles.successEmail}>{email.trim()}</Text>
            </Text>

            <Text style={styles.successHint}>
              Don't see it? Check your spam or junk folder.
            </Text>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => { setSubmitted(false); setEmail(''); }}
              activeOpacity={0.85}
            >
              <Text style={styles.outlineBtnText}>Try a different email</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
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

  // ── Form state ──
  header: { marginBottom: 32 },
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
  },
  fieldGroup: { marginBottom: 24, gap: 6 },
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
  inputFocused: { borderColor: '#451E5D', backgroundColor: '#fff' },
  inputError:   { borderColor: '#E05555', backgroundColor: '#FFF8F8' },
  errorText:    { fontSize: 12, color: '#E05555', marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#451E5D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled:     { opacity: 0.6 },
  primaryBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  // ── Success state ──
  successBox: {
    flex: 1,
    paddingTop: 12,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#F0EBF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.4,
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 15,
    color: '#7C7A8E',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  successEmail: { color: '#451E5D', fontWeight: '700' },
  successHint: {
    fontSize: 13,
    color: '#B0AABF',
    textAlign: 'center',
    marginBottom: 36,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#451E5D',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: '#451E5D' },
});
