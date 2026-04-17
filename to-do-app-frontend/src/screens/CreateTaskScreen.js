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

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/task-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error.message);
    }
  };

  const handleCreateTask = async () => {
    try {
      const formattedDate = dueDate.toISOString().split('T')[0];

      const response = await api.post('/tasks', {
        title,
        description,
        due_date: formattedDate,
        category_id: category,
        priority,
      });

      showToast('Task created successfully', 'success');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating task:', error.message);
      showToast('Unable to create task');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <Icon name="task" size={50} color="#451E5D" />
      <Text style={styles.title}>Create Task</Text>
      <TextInput
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        multiline
      />
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
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
          selectedValue={priority}
          onValueChange={(itemValue) => setPriority(itemValue)}
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
          {`Due Date: ${dueDate.toISOString().split('T')[0]}`}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          textColor="#333"
          onChange={handleDateChange}
        />
      )}
      <TouchableOpacity onPress={handleCreateTask} style={styles.createButton}>
        <Text style={styles.createButtonText}>CREATE TASK</Text>
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
  createButton: {
    backgroundColor: '#451E5D',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
