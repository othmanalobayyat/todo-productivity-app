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
import api from '../services/api';
import { showToast } from '../components/Toast';
import { Picker } from '@react-native-picker/picker';
import DatePickerField from '../components/DatePickerField';
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
      const resolvedDate = rawDate ? new Date(year, month - 1, day) : new Date();
      setTask({
        title: response.data.title,
        description: response.data.description ?? '',
        dueDate: resolvedDate,
        category: response.data.category_id ?? '',
        completed: response.data.completed,
        priority: response.data.priority ?? 'medium',
      });
    } catch (error) {
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
      showToast('Failed to update task.');
    } finally {
      setIsLoading(false);
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
          <Text style={styles.screenTitle}>Edit Task</Text>
          <Text style={styles.screenSubtitle}>Update the task details below</Text>
        </View>

        <View style={styles.fields}>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              placeholder="Task title"
              placeholderTextColor="#B0AABF"
              value={task.title}
              onChangeText={(text) => setTask({ ...task, title: text })}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              placeholder="Optional description"
              placeholderTextColor="#B0AABF"
              value={task.description}
              onChangeText={(text) => setTask({ ...task, description: text })}
              style={[styles.input, styles.inputMultiline]}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
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
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Priority</Text>
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
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Due Date</Text>
            <DatePickerField
              value={task.dueDate}
              onChange={(date) => setTask((prev) => ({ ...prev, dueDate: date }))}
            />
          </View>

        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          disabled={isLoading}
          activeOpacity={0.88}>
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Saving...' : 'Save Task'}
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
