import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { finalizeAuth } from '../services/authService';
import { showToast } from '../components/Toast';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focused, setFocused] = useState(null);

  const passwordRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!isValidEmail(email.trim())) newErrors.email = 'Enter a valid email address.';
    if (!password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await api.post('/login', { email: email.trim(), password });
      if (response.data.token) {
        await finalizeAuth(response.data.token, onLoginSuccess);
      } else {
        showToast('Login failed. Please try again.');
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      showToast(msg || 'Incorrect email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (field) => [
    styles.input,
    focused === field && styles.inputFocused,
    errors[field] && styles.inputError,
  ];

  const rowStyle = (field) => [
    styles.inputRow,
    focused === field && styles.inputFocused,
    errors[field] && styles.inputError,
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color="#1A0A2E" />
        </TouchableOpacity>

        {/* Logo */}
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to your account to continue</Text>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor="#B0AABF"
              style={inputStyle('email')}
              value={email}
              onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={rowStyle('password')}>
              <TextInput
                ref={passwordRef}
                placeholder="Your password"
                placeholderTextColor="#B0AABF"
                secureTextEntry={!showPassword}
                style={styles.inputInner}
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9A94A8" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>
        </View>

        {/* Forgot */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => showToast('Password reset coming soon.')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.primaryBtnText}>Log In</Text>
          }
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
            <Text style={styles.footerLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 16,
  },
  logo: {
    width: 180,
    height: 50,
    alignSelf: 'center',
    marginBottom: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#7C7A8E',
    lineHeight: 22,
  },
  fields: {
    gap: 20,
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
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
  inputFocused: {
    borderColor: '#451E5D',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#E05555',
    backgroundColor: '#FFF8F8',
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#E05555',
    marginTop: 2,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginTop: 12,
  },
  forgotText: {
    color: '#451E5D',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#451E5D',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#7C7A8E',
  },
  footerLink: {
    fontSize: 14,
    color: '#451E5D',
    fontWeight: '700',
  },
});
