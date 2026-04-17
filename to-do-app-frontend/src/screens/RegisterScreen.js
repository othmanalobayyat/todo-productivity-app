import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showToast } from '../components/Toast';

export default function RegisterScreen({ navigation, onRegisterSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (password !== passwordConfirmation) {
      showToast("Passwords don't match!");
      return;
    }

    if (!name || !email || !password || !passwordConfirmation) {
      showToast('Please fill all fields!');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/register', { name, email, password });
      const { token } = response.data;
      await AsyncStorage.setItem('auth_token', token);

      const userResponse = await api.get('/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = userResponse.data;
      onRegisterSuccess(user);
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      showToast('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrow-back-outline" size={24} color="#0f0835" />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <Text style={styles.header}>Register</Text>
        <Text style={styles.subheader}>Create your account</Text>
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <View style={styles.underline} />
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
        <TextInput
          placeholder="Confirm Password"
          secureTextEntry
          style={styles.input}
          value={passwordConfirmation}
          onChangeText={setPasswordConfirmation}
        />
        <View style={styles.underline} />
      </View>
      <TouchableOpacity
        style={styles.signUpButton}
        onPress={handleRegister}
        disabled={isLoading}
      >
        <Text style={styles.signUpButtonText}>{isLoading ? 'Registering...' : 'SIGN UP'}</Text>
      </TouchableOpacity>
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
    alignItems: 'left',
    marginBottom: 60,
    marginTop: 30,
  },
  header: {
    fontSize: 50,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#451E5D',
  },
  subheader: {
    fontSize: 27,
    color: '#9491c7',
    marginBottom: 40,
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
  signUpButton: {
    backgroundColor: '#451E5D',
    width: '100%',
    padding: 15,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
