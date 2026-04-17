import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import api from '../services/api';
import HeaderComponent from '../components/HeaderComponent';
import { showToast } from '../components/Toast';

export default function TasksScreen({ navigation, userData }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');       // 'all' | 'completed' | 'pending'
  const [sort, setSort] = useState('priority');      // 'priority' | 'due_date'
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = navigation.addListener('focus', fetchTasks);
    return unsubscribe;
  }, [navigation]);

  async function fetchTasks() {
    setIsLoading(true);
    try {
      const response = await api.get('/tasks');
      const validTasks = response.data.filter((task) => task.id && task.title);
      setTasks(validTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast('Unable to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }

  async function markTaskAsComplete(id) {
    setCompletingId(id);
    try {
      await api.patch(`/tasks/${id}/complete`, {});
      fetchTasks();
    } finally {
      setCompletingId(null);
    }
  }

  function confirmDeleteTask(id) {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tasks/${id}`);
              fetchTasks();
            } catch (error) {
              showToast('Failed to delete task');
            }
          },
        },
      ]
    );
  }

  const total     = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending   = total - completed;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;

  const today       = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
  const overdue     = tasks.filter((t) => !t.completed && t.due_date && t.due_date < today).length;
  const dueToday    = tasks.filter((t) => !t.completed && t.due_date === today).length;
  const highPending = tasks.filter((t) => !t.completed && t.priority === 'high').length;

  function getSummaryMessage() {
    if (total === 0)      return 'Add your first task to get started.';
    if (pending === 0)    return 'All done! Great work today.';
    if (overdue > 0)      return `${overdue} task${overdue !== 1 ? 's are' : ' is'} overdue.`;
    if (highPending > 0)  return `${highPending} high-priority task${highPending !== 1 ? 's need' : ' needs'} attention.`;
    if (dueToday > 0)     return `${dueToday} task${dueToday !== 1 ? 's are' : ' is'} due today.`;
    if (progress >= 75)   return `Almost there — just ${pending} task${pending !== 1 ? 's' : ''} left.`;
    return "You're clear for today. Keep it up!";
  }

  const priorityColors = { high: '#c0392b', medium: '#e67e22', low: '#27ae60' };
  const priorityRank  = { high: 1, medium: 2, low: 3 };

  function getDisplayedTasks() {
    let result = [...tasks];

    if (filter === 'completed') result = result.filter((t) => t.completed);
    if (filter === 'pending')   result = result.filter((t) => !t.completed);

    if (sort === 'priority') {
      result.sort((a, b) =>
        (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2)
      );
    } else {
      result.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      });
    }

    return result;
  }

  const EmptyState = ({ filtered }) => (
    <View style={styles.emptyState}>
      <Icon name="inbox" size={48} color="#ddd" />
      <Text style={styles.emptyStateText}>
        {filtered ? 'No matching tasks' : 'No tasks yet'}
      </Text>
      <Text style={styles.emptyStateSub}>
        {filtered
          ? 'Try a different filter.'
          : 'Tap the + button to add your first task.'}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.taskItem,
        completingId === item.id && { opacity: 0.45 },
        item.priority === 'high' && !item.completed && styles.taskItemHighPriority,
      ]}>
      <View style={styles.taskDetails}>
        <Text
          style={[styles.taskTitle, item.completed && styles.completedTask]}>
          {item.title}
        </Text>
        <View style={styles.dueDateRow}>
          <Text style={styles.taskDueDate}>{item.due_date || 'No due date'}</Text>
          {!item.completed && item.due_date && item.due_date < today && (
            <View style={[styles.dateBadge, styles.dateBadgeOverdue]}>
              <Text style={styles.dateBadgeText}>Overdue</Text>
            </View>
          )}
          {!item.completed && item.due_date === today && (
            <View style={[styles.dateBadge, styles.dateBadgeToday]}>
              <Text style={styles.dateBadgeText}>Today</Text>
            </View>
          )}
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColors[item.priority] || priorityColors.medium }]}>
          <Text style={styles.priorityText}>{(item.priority || 'medium').toUpperCase()}</Text>
        </View>
        {item.subtasks_total > 0 && (
          <View style={styles.subtaskProgressRow}>
            <View style={styles.subtaskProgressTrack}>
              <View
                style={[
                  styles.subtaskProgressFill,
                  {
                    width: `${Math.round((item.subtasks_completed / item.subtasks_total) * 100)}%`,
                    backgroundColor:
                      item.subtasks_completed === item.subtasks_total
                        ? '#27ae60'
                        : '#451E5D',
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.subtaskProgressLabel,
                item.subtasks_completed === item.subtasks_total &&
                  styles.subtaskProgressLabelDone,
              ]}>
              {item.subtasks_completed}/{item.subtasks_total}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        {!item.completed && (
          <TouchableOpacity onPress={() => markTaskAsComplete(item.id)}>
            <Icon name="check-circle" size={24} color="#451E5D" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate('TaskDetails', { task: item })}>
          <Icon name="info-circle" size={24} color="#451E5D" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditTask', { taskId: item.id })}>
          <Icon name="edit" size={24} color="#451E5D" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => confirmDeleteTask(item.id)}>
          <Icon name="trash" size={24} color="#451E5D" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <HeaderComponent user={userData} />
      <View style={styles.dashboard}>
        <View style={styles.dashboardHeader}>
          <Text style={styles.title}>Tasks</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreateTask')}>
            <Icon name="plus-circle" size={36} color="#451E5D" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={[styles.statNumber, { color: '#27ae60' }]}>{completed}</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#e67e22' }]}>{pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.summaryMessage}>{getSummaryMessage()}</Text>

        {(overdue > 0 || dueToday > 0 || highPending > 0) && (
          <View style={styles.insightsRow}>
            {overdue > 0 && (
              <View style={[styles.insightPill, styles.insightOverdue]}>
                <Text style={styles.insightPillText}>{overdue} Overdue</Text>
              </View>
            )}
            {dueToday > 0 && (
              <View style={[styles.insightPill, styles.insightToday]}>
                <Text style={styles.insightPillText}>{dueToday} Due Today</Text>
              </View>
            )}
            {highPending > 0 && (
              <View style={[styles.insightPill, styles.insightHigh]}>
                <Text style={styles.insightPillText}>{highPending} High Priority</Text>
              </View>
            )}
          </View>
        )}
      </View>
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          {['all', 'pending', 'completed'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.controlBtn, filter === f && styles.controlBtnActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.controlBtnText, filter === f && styles.controlBtnTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.controlRow}>
          {[['priority', 'Priority'], ['due_date', 'Due Date']].map(([val, label]) => (
            <TouchableOpacity
              key={val}
              style={[styles.controlBtn, sort === val && styles.controlBtnActive]}
              onPress={() => setSort(val)}>
              <Text style={[styles.controlBtnText, sort === val && styles.controlBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <Text style={styles.loadingText}>Loading tasks...</Text>
      ) : tasks.length === 0 ? (
        <EmptyState filtered={false} />
      ) : (
        <FlatList
          data={getDisplayedTasks()}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<EmptyState filtered={true} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboard: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#451E5D',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
    color: '#451E5D',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: '#451E5D',
    borderRadius: 3,
  },
  summaryMessage: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  insightsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  insightPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  insightPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  insightOverdue: {
    backgroundColor: '#c0392b',
  },
  insightToday: {
    backgroundColor: '#451E5D',
  },
  insightHigh: {
    backgroundColor: '#e67e22',
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 5,
    marginHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  taskDetails: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  taskDueDate: {
    fontSize: 12,
    color: '#888',
  },
  dateBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  dateBadgeOverdue: {
    backgroundColor: '#fdecea',
  },
  dateBadgeToday: {
    backgroundColor: '#ede7f6',
  },
  dateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#451E5D',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: 140, // Adjusted width for the additional button
  },
  taskItemHighPriority: {
    borderLeftWidth: 3,
    borderLeftColor: '#c0392b',
    backgroundColor: '#fff9f9',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 40,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 6,
    textAlign: 'center',
  },
  controls: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  controlRow: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  controlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#451E5D',
  },
  controlBtnActive: {
    backgroundColor: '#451E5D',
  },
  controlBtnText: {
    fontSize: 12,
    color: '#451E5D',
  },
  controlBtnTextActive: {
    color: '#fff',
  },
  subtaskProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  subtaskProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subtaskProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  subtaskProgressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#451E5D',
    minWidth: 24,
    textAlign: 'right',
  },
  subtaskProgressLabelDone: {
    color: '#27ae60',
  },
});
