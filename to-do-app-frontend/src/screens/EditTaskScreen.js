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

export default function EditTaskScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState({
    title: '',
    description: '',
    dueDate: new Date(),
    category: '',
    completed: false,
    priority: 'medium',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchTask();
    fetchCategories();
  }, []);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/tasks/${taskId}`);
      const rawDate = response.data.due_date;
      const [year, month, day] = rawDate
        ? rawDate.split('-').map(Number)
        : [null, null, null];
      setTask({
        title: response.data.title,
        description: response.data.description,
        dueDate: rawDate ? new Date(year, month - 1, day) : new Date(),
        category: response.data.category_id ?? '',
        completed: response.data.completed,
        priority: response.data.priority ?? 'medium',
      });
    } catch (error) {
      console.error('Error fetching task:', error);
      showToast('Failed to fetch task details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/task-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      showToast('Could not load categories.');
    }
  };

  const handleSave = async () => {
    if (!task.title.trim()) {
      showToast('Title is required.');
      return;
    }

    setIsLoading(true);
    try {
      await api.put(`/tasks/${taskId}`, {
        title:       task.title.trim(),
        description: task.description,
        category_id: task.category || null,
        due_date:    formatLocalDate(task.dueDate),
        completed:   task.completed,
        priority:    task.priority,
      });
      showToast('Task updated successfully', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error updating task:', error);
      showToast('Failed to update task.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTask({ ...task, dueDate: selectedDate });
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

        <Icon name="edit" size={50} color="#451E5D" style={styles.icon} />
        <Text style={styles.screenTitle}>Edit Task</Text>

        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          placeholder="Task title"
          value={task.title}
          onChangeText={(text) => setTask({ ...task, title: text })}
          style={styles.input}
          returnKeyType="next"
        />

        <Text style={styles.fieldLabel}>Description</Text>
        <TextInput
          placeholder="Optional description"
          value={task.description}
          onChangeText={(text) => setTask({ ...task, description: text })}
          style={[styles.input, styles.inputMultiline]}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={task.category}
            onValueChange={(itemValue) => setTask({ ...task, category: itemValue })}
            style={styles.picker}
            dropdownIconColor="#451E5D">
            <Picker.Item label="Select Category" value="" />
            {categories.map((cat) => (
              <Picker.Item key={cat.id} label={cat.name} value={cat.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={task.priority}
            onValueChange={(itemValue) => setTask({ ...task, priority: itemValue })}
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
          <Text style={styles.datePickerText}>{formatLocalDate(task.dueDate)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={task.dueDate}
            mode="date"
            display="spinner"
            textColor="#333"
            onChange={handleDateChange}
          />
        )}

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          disabled={isLoading}>
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'SAVE TASK'}
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
  saveButton: {
    backgroundColor: '#451E5D',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
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
