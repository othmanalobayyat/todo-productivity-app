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

// Format a Date as YYYY-MM-DD in LOCAL timezone.
// Avoids the UTC shift bug from toISOString() for users behind UTC.
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate]         = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory]       = useState('');
  const [categories, setCategories]   = useState([]);
  const [priority, setPriority]       = useState('medium');
  const [isLoading, setIsLoading]     = useState(false);

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

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar backgroundColor="#451E5D" />
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
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.datePickerButton}>
          <Text style={styles.datePickerText}>{formatLocalDate(dueDate)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="spinner"
            textColor="#333"
            onChange={handleDateChange}
          />
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderColor: '#ccc',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
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
