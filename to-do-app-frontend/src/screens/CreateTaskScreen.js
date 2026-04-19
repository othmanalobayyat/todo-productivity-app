import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { showToast } from '../components/Toast';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatLocalDate } from '../utils/dateUtils';

const isValidDate = (str) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00');
  return !isNaN(d.getTime());
};

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate]         = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory]       = useState('');
  const [categories, setCategories]   = useState([]);
  const [priority, setPriority]       = useState('medium');
  const [isLoading, setIsLoading]     = useState(false);
  const [webDateText, setWebDateText] = useState(formatLocalDate(new Date()));
  const [webDateError, setWebDateError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/task-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      showToast('Could not load categories.');
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      showToast('Title is required.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/tasks', {
        title:       title.trim(),
        description,
        due_date:    formatLocalDate(dueDate),
        category_id: category || null,   // empty string → null for nullable field
        priority,
      });

      showToast('Task created successfully', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating task:', error.message);
      showToast('Unable to create task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleWebDateChange = (text) => {
    setWebDateText(text);
    if (isValidDate(text)) {
      const [y, m, d] = text.split('-').map(Number);
      setDueDate(new Date(y, m - 1, d));
      setWebDateError('');
    } else {
      setWebDateError('Use format YYYY-MM-DD');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar backgroundColor="#451E5D" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">

        <Icon name="task" size={50} color="#451E5D" style={styles.icon} />
        <Text style={styles.screenTitle}>Create Task</Text>

        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          placeholder="Task title"
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          placeholder="Optional description"
          value={description}
          onChangeText={setDescription}
          style={[styles.input, styles.inputMultiline]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            key={categories.length}
            selectedValue={category}
            onValueChange={(itemValue) => setCategory(itemValue)}
            style={styles.picker}
            dropdownIconColor="#451E5D">
            <Picker.Item label="Select Category" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={String(cat.id)} />
            ))}
          </Picker>
        </View>

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={priority}
            onValueChange={(itemValue) => setPriority(itemValue)}
            style={styles.picker}
            dropdownIconColor="#451E5D">
            <Picker.Item label="High"   value="high"   />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="Low"    value="low"    />
          </Picker>
        </View>

        <Text style={styles.fieldLabel}>Due Date</Text>
        {Platform.OS === 'web' ? (
          <View style={{ marginBottom: 24 }}>
            <TextInput
              value={webDateText}
              onChangeText={handleWebDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              style={[styles.input, { marginBottom: 0 }, webDateError ? styles.inputError : null]}
              maxLength={10}
            />
            {webDateError ? (
              <Text style={styles.webDateErrorText}>{webDateError}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.datePickerButton}
              activeOpacity={0.7}>
              <Icon name="calendar-today" size={17} color="#451E5D" />
              <Text style={styles.datePickerText}>{formatLocalDate(dueDate)}</Text>
              <Icon name="chevron-right" size={18} color="#B0AABF" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'default' : 'spinner'}
                textColor="#333"
                onChange={handleDateChange}
              />
            )}
          </>
        )}

        <TouchableOpacity
          onPress={handleCreateTask}
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          disabled={isLoading}>
          <Text style={styles.createButtonText}>
            {isLoading ? 'Creating...' : 'CREATE TASK'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#451E5D',
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 80,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: '#333',
  },
  datePickerButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    marginBottom: 24,
    backgroundColor: '#F8F6FB',
    borderColor: '#E8E2F0',
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1A0A2E',
  },
  inputError: {
    borderColor: '#c00',
  },
  webDateErrorText: {
    fontSize: 12,
    color: '#c00',
    marginTop: 4,
  },
  createButton: {
    backgroundColor: '#451E5D',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
