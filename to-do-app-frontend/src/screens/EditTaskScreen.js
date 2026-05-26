import React, { useState, useEffect } from "react";
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
} from "react-native";
import api from "../services/api";
import { showToast } from "../components/Toast";
import { checkIsOffline } from "../utils/networkUtils";
import { Picker } from "@react-native-picker/picker";
import DatePickerField from "../components/DatePickerField";
import { formatLocalDate } from "../utils/dateUtils";
import { loadCachedTasks, saveTasks } from "../services/taskCache";
import { enqueueOperation } from "../services/writeQueue";
import { triggerTaskRefresh } from "../services/taskEvents";

export default function EditTaskScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState({
    title: "",
    description: "",
    dueDate: new Date(),
    category: "",
    completed: false,
    priority: "medium",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchTask();
    fetchCategories();
  }, []);

  const fetchTask = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/tasks/${taskId}`);
      _populateTaskForm(response.data);
    } catch (error) {
      // ★ NEW: If online fetch fails (offline or network error),
      // try to load from cache. This allows editing offline-created tasks
      // that haven't synced yet, or viewing cached tasks when offline.
      setIsLoadingCache(true);
      try {
        const cached = await loadCachedTasks();
        const found = cached?.find((t) => t.id === taskId);
        if (found) {
          _populateTaskForm(found);
        } else {
          showToast("Failed to load task details.");
        }
      } catch {
        showToast("Failed to load task details.");
      } finally {
        setIsLoadingCache(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Helper to populate form from task data (used by both online & offline paths)
  const _populateTaskForm = (taskData) => {
    const rawDate = taskData.due_date;
    const [year, month, day] = rawDate
      ? rawDate.split("-").map(Number)
      : [null, null, null];
    const resolvedDate = rawDate ? new Date(year, month - 1, day) : new Date();
    setTask({
      title: taskData.title,
      description: taskData.description ?? "",
      dueDate: resolvedDate,
      category: taskData.category_id ?? "",
      completed: taskData.completed,
      priority: taskData.priority ?? "medium",
    });
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/task-categories");
      setCategories(response.data);
    } catch (error) {
      showToast("Could not load categories.");
    }
  };

  const handleSave = async () => {
    if (!task.title.trim()) {
      showToast("Title is required.");
      return;
    }

    const offline = await checkIsOffline();

    // ★ NEW OFFLINE PATH: Queue the edit and update cache optimistically.
    // This allows users to edit tasks even when the backend is unavailable.
    // The operation will sync when the device reconnects (handled by App.js).
    if (offline) {
      setIsLoading(true);
      try {
        const updates = {
          title: task.title.trim(),
          description: task.description,
          category_id: task.category || null,
          due_date: formatLocalDate(task.dueDate),
          completed: task.completed,
          priority: task.priority,
        };

        // 1. Queue the update operation for later sync
        await enqueueOperation("update", {
          taskId,
          updates,
        });

        // 2. Update the cache optimistically so the change is visible immediately
        const cached = await loadCachedTasks();
        if (cached) {
          const updated = cached.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t,
          );
          await saveTasks(updated);
        }

        // 3. Notify other screens (like TasksScreen) to refresh from cache
        triggerTaskRefresh();

        showToast("Saving offline. Will sync when connected.", "success");
        navigation.goBack();
      } catch (error) {
        console.error("[EditTask] Offline save failed:", error);
        showToast("Failed to save task offline.");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ✓ EXISTING ONLINE PATH: Send directly to API (unchanged)
    setIsLoading(true);
    try {
      await api.put(`/tasks/${taskId}`, {
        title: task.title.trim(),
        description: task.description,
        category_id: task.category || null,
        due_date: formatLocalDate(task.dueDate),
        completed: task.completed,
        priority: task.priority,
      });
      showToast("Task updated successfully", "success");
      navigation.goBack();
    } catch (error) {
      showToast("Failed to update task.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar backgroundColor="#451E5D" barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Edit Task</Text>
          <Text style={styles.screenSubtitle}>
            Update the task details below
          </Text>
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
                onValueChange={(itemValue) =>
                  setTask({ ...task, category: itemValue })
                }
                style={styles.picker}
                dropdownIconColor="#451E5D"
              >
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
                onValueChange={(itemValue) =>
                  setTask({ ...task, priority: itemValue })
                }
                style={styles.picker}
                dropdownIconColor="#451E5D"
              >
                <Picker.Item label="High" value="high" />
                <Picker.Item label="Medium" value="medium" />
                <Picker.Item label="Low" value="low" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Due Date</Text>
            <DatePickerField
              value={task.dueDate}
              onChange={(date) =>
                setTask((prev) => ({ ...prev, dueDate: date }))
              }
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          <Text style={styles.primaryBtnText}>
            {isLoading ? "Saving..." : "Save Task"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#fff",
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
    fontWeight: "800",
    color: "#1A0A2E",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
    color: "#7C7A8E",
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
    fontWeight: "600",
    color: "#3D2055",
    letterSpacing: 0.2,
  },
  required: {
    color: "#E05555",
  },
  input: {
    backgroundColor: "#F8F6FB",
    borderWidth: 1.5,
    borderColor: "#E8E2F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A0A2E",
  },
  inputMultiline: {
    minHeight: 90,
  },
  pickerContainer: {
    backgroundColor: "#F8F6FB",
    borderWidth: 1.5,
    borderColor: "#E8E2F0",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    color: "#1A0A2E",
  },
  primaryBtn: {
    backgroundColor: "#451E5D",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
