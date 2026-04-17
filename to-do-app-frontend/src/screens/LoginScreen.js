import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../components/Toast';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

const handleLogin = async () => {
    try {
      const response = await api.post('/login', { email, password });
      if (response.data.token) {
        await AsyncStorage.setItem('auth_token', response.data.token);
        const userResponse = await api.get('/profile');
        const user = userResponse.data;
        onLoginSuccess(user);
      } else {
        showToast('Login failed, please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Unable to log in. Please check your connection and try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrow-back-outline" size={24} color="#0f0835" />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <Text style={styles.header}>Welcome!</Text>
        <Text style={styles.subheader}>Sign in to continue</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.underline} />
        <TextInput
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.underline} />
      </View>
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>LOGIN</Text>
      </TouchableOpacity>
      <View style={styles.forgotPasswordContainer}>
        <TouchableOpacity onPress={() => showToast('Coming soon', 'error')}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.signUpContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signUpText}>Don't have an account? <Text style={styles.signUpLink}>Sign up</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: 48,
    marginTop: 30,
  },
  header: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#451E5D',
  },
  subheader: {
    fontSize: 18,
    color: '#9491c7',
    marginBottom: 0,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    color: '#05017b',
    paddingVertical: 8,
  },
  underline: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#451E5D',
    width: '100%',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  forgotPassword: {
    color: '#4A00E0',
    fontSize: 16,
  },
  signUpText: {
    fontSize: 14,
    color: '#9491c7',
  },
  signUpLink: {
    color: '#4A00E0',
    fontWeight: 'bold',
  },
  signUpContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  }
});
