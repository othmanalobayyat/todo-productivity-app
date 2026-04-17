import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { showToast } from '../components/Toast';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

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
        category: response.data.category_id,
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
      showToast('Failed to fetch categories.');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const formattedDate = task.dueDate.toISOString().split('T')[0];

      const response = await api.put(`/tasks/${taskId}`, {
        title: task.title,
        description: task.description,
        category_id: task.category,
        due_date: formattedDate,
        completed: task.completed,
        priority: task.priority,
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
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <Icon name="edit" size={50} color="#451E5D" />
      <Text style={styles.title}>Edit Task</Text>
      <TextInput
        placeholder="Title"
        value={task.title}
        onChangeText={(text) => setTask({ ...task, title: text })}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={task.description}
        onChangeText={(text) => setTask({ ...task, description: text })}
        style={styles.input}
        multiline
      />
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={task.category}
          onValueChange={(itemValue) => setTask({ ...task, category: itemValue })}
          style={styles.picker}
          dropdownIconColor="#451E5D">
          <Picker.Item label="Select Category" value="" />
          {categories.map((categoryItem) => (
            <Picker.Item
              key={categoryItem.id}
              label={categoryItem.name}
              value={categoryItem.id}
            />
          ))}
        </Picker>
      </View>

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={task.priority}
          onValueChange={(itemValue) => setTask({ ...task, priority: itemValue })}
          style={styles.picker}
          dropdownIconColor="#451E5D">
          <Picker.Item label="High Priority" value="high" />
          <Picker.Item label="Medium Priority" value="medium" />
          <Picker.Item label="Low Priority" value="low" />
        </Picker>
      </View>

      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.datePickerButton}>
        <Text style={styles.datePickerText}>
          {`Due Date: ${task.dueDate.toISOString().split('T')[0]}`}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={task.dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          textColor="#333"
          onChange={handleDateChange}
        />
      )}
      <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{isLoading ? 'Saving...' : 'SAVE TASK'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#451E5D',
  },
  input: {
    width: '80%',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    fontSize: 16,
  },
  pickerContainer: {
    width: '80%',
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
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    alignItems: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
