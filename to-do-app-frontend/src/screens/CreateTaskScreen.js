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
import { loadCachedTasks, saveTasks } from '../services/taskCache';
import { enqueueOperation } from '../services/writeQueue';
import { triggerTaskRefresh } from '../services/taskEvents';
import { checkIsOffline } from '../utils/networkUtils';
import { loadCachedCategories, fetchAndCacheCategories } from '../services/categoryCache';

export default function CreateTaskScreen({ navigation }) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate]         = useState(new Date());
  const [category, setCategory]       = useState('');
  const [categories, setCategories]         = useState([]);
  const [categoriesUnavailable, setCategoriesUnavailable] = useState(false);
  const [priority, setPriority]             = useState('medium');
  const [isLoading, setIsLoading]           = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      // Step 1: show cached categories immediately if available.
      const cached = await loadCachedCategories();
      if (mounted && cached) {
        setCategories(cached);
        setCategoriesUnavailable(false);
      }

      // Step 2: fetch fresh data and update the picker.
      try {
        const fresh = await fetchAndCacheCategories();
        if (mounted) {
          setCategories(fresh);
          setCategoriesUnavailable(false);
        }
      } catch {
        // Network failed — keep whatever was shown from cache.
        // Only show the unavailable hint when there is nothing to display.
        if (mounted && !cached) setCategoriesUnavailable(true);
      }
    }

    loadCategories();
    return () => { mounted = false; };
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      showToast('Title is required.');
      return;
    }

    const taskData = {
      title:       title.trim(),
      description,
      due_date:    formatLocalDate(dueDate),
      category_id: category || null,
      priority,
    };

    const offline = await checkIsOffline();

    if (offline) {
      const localId = `offline-${Date.now()}`;
      const offlineTask = {
        id: localId,
        ...taskData,
        completed: false,
        completed_at: null,
        subtasks_total: 0,
        subtasks_completed: 0,
        pending_sync: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const cached = await loadCachedTasks();
      await saveTasks(cached ? [...cached, offlineTask] : [offlineTask]);
      await enqueueOperation('create', { localId, taskData });

      // Notify TasksScreen to reload from cache so the new task appears immediately.
      triggerTaskRefresh();

      showToast('Saved offline. Will sync when connected.', 'success');
      navigation.goBack();
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/tasks', taskData);
      showToast('Task created successfully', 'success');
      navigation.goBack();
    } catch (error) {
      showToast('Unable to create task.');
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
            {categoriesUnavailable && (
              <Text style={styles.fieldHint}>Categories unavailable offline</Text>
            )}
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
            <DatePickerField value={dueDate} onChange={setDueDate} />
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
  fieldHint: {
    fontSize: 12,
    color: '#9c6fb5',
    marginTop: 4,
  },
});
