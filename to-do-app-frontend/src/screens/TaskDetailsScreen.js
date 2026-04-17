import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { showToast } from '../components/Toast';
import api from '../services/api';

export default function TaskDetailsScreen({ route }) {
  const { task } = route.params;

  const [subtasks, setSubtasks] = useState([]);
  const [loadingSubtasks, setLoadingSubtasks] = useState(true);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchSubtasks = useCallback(async () => {
    try {
      const response = await api.get(`/tasks/${task.id}/subtasks`);
      setSubtasks(response.data);
    } catch (error) {
      showToast('Failed to load subtasks');
    } finally {
      setLoadingSubtasks(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  async function handleAddSubtask() {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      await api.post(`/tasks/${task.id}/subtasks`, { title });
      setNewSubtaskTitle('');
      await fetchSubtasks();
    } catch (error) {
      showToast('Failed to add subtask');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(subtaskId) {
    try {
      await api.patch(`/tasks/${task.id}/subtasks/${subtaskId}/toggle`);
      await fetchSubtasks();
    } catch (error) {
      showToast('Failed to update subtask');
    }
  }

  function handleDelete(subtaskId) {
    Alert.alert(
      'Delete Subtask',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tasks/${task.id}/subtasks/${subtaskId}`);
              await fetchSubtasks();
            } catch (error) {
              showToast('Failed to delete subtask');
            }
          },
        },
      ]
    );
  }

  const doneCount = subtasks.filter((s) => s.completed).length;
  const totalCount = subtasks.length;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar backgroundColor="#451E5D" />

      <Text style={styles.taskTitle}>{task.title}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Due Date</Text>
        <Text style={styles.cardValue}>{task.due_date || 'No due date'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Description</Text>
        <Text style={styles.cardValue}>{task.description || 'No description'}</Text>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: task.completed ? 'green' : 'red' },
          ]}
        />
        <Text style={styles.statusText}>
          {task.completed ? 'Completed' : 'Not Completed'}
        </Text>
      </View>

      {/* Subtasks section */}
      <View style={styles.subtasksSection}>
        <View style={styles.subtasksHeader}>
          <Text style={styles.subtasksTitle}>Subtasks</Text>
          {totalCount > 0 && (
            <View style={styles.subtasksBadge}>
              <Text style={styles.subtasksBadgeText}>{doneCount}/{totalCount}</Text>
            </View>
          )}
        </View>

        {!loadingSubtasks && totalCount > 0 && (
          <View style={styles.subtaskProgressBlock}>
            <View style={styles.subtaskProgressTrack}>
              <View
                style={[
                  styles.subtaskProgressFill,
                  {
                    width: `${Math.round((doneCount / totalCount) * 100)}%`,
                    backgroundColor: doneCount === totalCount ? '#27ae60' : '#451E5D',
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.subtaskProgressPct,
                doneCount === totalCount && styles.subtaskProgressPctDone,
              ]}>
              {Math.round((doneCount / totalCount) * 100)}%
            </Text>
          </View>
        )}

        {loadingSubtasks ? (
          <ActivityIndicator size="small" color="#451E5D" style={styles.subtasksLoader} />
        ) : (
          <>
            {subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskRow}>
                <TouchableOpacity
                  onPress={() => handleToggle(subtask.id)}
                  style={styles.subtaskToggle}>
                  <Icon
                    name={subtask.completed ? 'check-square' : 'square-o'}
                    size={20}
                    color={subtask.completed ? '#27ae60' : '#aaa'}
                  />
                </TouchableOpacity>
                <Text style={[styles.subtaskTitle, subtask.completed && styles.subtaskDone]}>
                  {subtask.title}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(subtask.id)}
                  style={styles.subtaskDelete}>
                  <Icon name="trash" size={16} color="#ccc" />
                </TouchableOpacity>
              </View>
            ))}

            {subtasks.length === 0 && (
              <Text style={styles.emptySubtasks}>No subtasks yet. Add one below.</Text>
            )}
          </>
        )}

        {/* Add subtask row */}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add a subtask..."
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addButton, adding && styles.addButtonDisabled]}
            onPress={handleAddSubtask}
            disabled={adding}>
            <Text style={styles.addButtonText}>{adding ? '...' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#451E5D',
    textAlign: 'center',
    marginVertical: 20,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 4,
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  subtasksSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  subtasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtasksTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#451E5D',
  },
  subtasksBadge: {
    marginLeft: 8,
    backgroundColor: '#ede7f6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subtasksBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#451E5D',
  },
  subtasksLoader: {
    marginVertical: 12,
  },
  subtaskProgressBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  subtaskProgressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  subtaskProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  subtaskProgressPct: {
    fontSize: 11,
    fontWeight: '700',
    color: '#451E5D',
    minWidth: 32,
    textAlign: 'right',
  },
  subtaskProgressPctDone: {
    color: '#27ae60',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  subtaskToggle: {
    marginRight: 10,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  subtaskDone: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  subtaskDelete: {
    marginLeft: 8,
    padding: 4,
  },
  emptySubtasks: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    paddingVertical: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  addButton: {
    marginLeft: 8,
    backgroundColor: '#451E5D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
