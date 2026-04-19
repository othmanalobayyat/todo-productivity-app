import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../services/api';
import { finalizeAuth } from '../services/authService';
import { showToast } from '../components/Toast';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function RegisterScreen({ navigation, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (!passwordConfirmation) {
      newErrors.passwordConfirmation = 'Please confirm your password.';
    } else if (password !== passwordConfirmation) {
      newErrors.passwordConfirmation = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await api.post('/register', { name: name.trim(), email: email.trim(), password });
      await finalizeAuth(response.data.token, onRegisterSuccess);
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      const serverMsg = error.response?.data?.message;
      showToast(serverMsg || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = (field) => setErrors((e) => ({ ...e, [field]: null }));

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Icon name="arrow-back-outline" size={24} color="#0f0835" />
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.header}>Create Account</Text>
          <Text style={styles.subheader}>Join and start getting things done.</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Your name"
            placeholderTextColor="#b0aec8"
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <View style={[styles.underline, errors.name && styles.underlineError]} />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
          <TextInput
            ref={emailRef}
            placeholder="you@example.com"
            placeholderTextColor="#b0aec8"
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <View style={[styles.underline, errors.email && styles.underlineError]} />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={passwordRef}
              placeholder="At least 6 characters"
              placeholderTextColor="#b0aec8"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError('password'); }}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
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

          <Text style={[styles.label, { marginTop: 16 }]}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              ref={confirmRef}
              placeholder="Repeat your password"
              placeholderTextColor="#b0aec8"
              secureTextEntry={!showConfirmPassword}
              style={[styles.input, styles.passwordInput]}
              value={passwordConfirmation}
              onChangeText={(v) => { setPasswordConfirmation(v); clearError('passwordConfirmation'); }}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9491c7" />
            </TouchableOpacity>
          </View>
          <View style={[styles.underline, errors.passwordConfirmation && styles.underlineError]} />
          {errors.passwordConfirmation && <Text style={styles.errorText}>{errors.passwordConfirmation}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.signUpButtonText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
            <Text style={styles.loginLink}> Log in</Text>
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
    marginBottom: 36,
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
    marginBottom: 24,
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
  signUpButton: {
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
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#9491c7',
  },
  loginLink: {
    fontSize: 14,
    color: '#451E5D',
    fontWeight: '700',
  },
});
