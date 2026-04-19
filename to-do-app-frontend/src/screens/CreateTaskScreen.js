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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.screenTitle}>Create Task</Text>
          <Text style={styles.screenSubtitle}>Fill in the details below</Text>
        </View>

        <View style={styles.fields}>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              placeholder="Task title"
              placeholderTextColor="#B0AABF"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              placeholder="Optional description"
              placeholderTextColor="#B0AABF"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.inputMultiline]}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
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
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Priority</Text>
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
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Due Date</Text>
            {Platform.OS === 'web' ? (
              <View>
                <TextInput
                  value={webDateText}
                  onChangeText={handleWebDateChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#B0AABF"
                  style={[styles.input, webDateError ? styles.inputError : null]}
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
          </View>

        </View>

        <TouchableOpacity
          onPress={handleCreateTask}
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          disabled={isLoading}
          activeOpacity={0.88}>
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Creating...' : 'Create Task'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A0A2E',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#7C7A8E',
  },
  fields: {
    gap: 20,
    marginBottom: 32,
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
  required: {
    color: '#E05555',
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
  inputMultiline: {
    minHeight: 90,
  },
  pickerContainer: {
    backgroundColor: '#F8F6FB',
    borderWidth: 1.5,
    borderColor: '#E8E2F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    color: '#1A0A2E',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F6FB',
    borderWidth: 1.5,
    borderColor: '#E8E2F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1A0A2E',
  },
  inputError: {
    borderColor: '#E05555',
  },
  webDateErrorText: {
    fontSize: 12,
    color: '#E05555',
    marginTop: 4,
  },
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
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
