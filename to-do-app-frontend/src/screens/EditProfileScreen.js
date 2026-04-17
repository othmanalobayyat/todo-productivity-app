import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import api from '../services/api';
import { showToast } from '../components/Toast';

export default function EditProfileScreen({ route, navigation, onProfileUpdate }) {
  const { userData } = route.params;

  const [name, setName]   = useState(userData?.name  || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    const trimmedName  = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      showToast('Name and email are required.');
      return;
    }

    // Basic email format check before hitting the server.
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      showToast('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/profile', {
        name:  trimmedName,
        email: trimmedEmail,
      });
      onProfileUpdate(response.data);
      showToast('Profile updated successfully.', 'success');
      navigation.goBack();
    } catch (error) {
      const status  = error.response?.status;
      const message =
        status === 409
          ? 'That email address is already in use.'
          : 'Failed to update profile. Please try again.';
      showToast(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={styles.fieldLabel}>Email</Text>
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Your email"
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={handleSave}
      />

      <TouchableOpacity
        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={isLoading}>
        <Text style={styles.saveButtonText}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
  },
  saveButton: {
    backgroundColor: '#451E5D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
