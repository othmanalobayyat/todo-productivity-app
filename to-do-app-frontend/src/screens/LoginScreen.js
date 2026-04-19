import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
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

  const passwordRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    }
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
      console.error('Login error:', error);
      showToast('Incorrect email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back-outline" size={24} color="#0f0835" />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.header}>Welcome back</Text>
          <Text style={styles.subheader}>Log in to your account</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="#b0aec8"
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: null })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View style={[styles.underline, errors.email && styles.underlineError]} />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              placeholder="Your password"
              placeholderTextColor="#b0aec8"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: null })); }}
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9491c7" />
            </TouchableOpacity>
          </View>
          <View style={[styles.underline, errors.password && styles.underlineError]} />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        </View>

        <TouchableOpacity style={styles.forgotPasswordContainer} onPress={() => showToast('Password reset coming soon.')}>
          <Text style={styles.forgotPassword}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.loginButtonText}>Log In</Text>
          }
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
            <Text style={styles.signUpLink}> Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
  },
  textContainer: {
    alignItems: 'flex-start',
    marginBottom: 40,
    marginTop: 30,
  },
  header: {
    fontSize: 38,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#451E5D',
  },
  subheader: {
    fontSize: 16,
    color: '#9491c7',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#451E5D',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  input: {
    fontSize: 16,
    color: '#05017b',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  eyeButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  underline: {
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 4,
  },
  underlineError: {
    borderBottomColor: '#c0392b',
  },
  errorText: {
    fontSize: 12,
    color: '#c0392b',
    marginBottom: 4,
    marginTop: 2,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPassword: {
    color: '#451E5D',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#451E5D',
    width: '100%',
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  signUpText: {
    fontSize: 14,
    color: '#9491c7',
  },
  signUpLink: {
    fontSize: 14,
    color: '#451E5D',
    fontWeight: '700',
  },
});
