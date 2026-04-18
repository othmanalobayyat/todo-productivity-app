import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { PRIORITY_COLORS } from '../constants/priorities';

export default function TaskItem({ item, today, isCompleting, onToggle, onDetails, onEdit, onDelete }) {
  return (
    <View
      style={[
        styles.taskItem,
        isCompleting && { opacity: 0.45 },
        item.priority === 'high' && !item.completed && styles.taskItemHighPriority,
      ]}>
      <View style={styles.taskDetails}>
        <Text style={[styles.taskTitle, item.completed && styles.completedTask]}>
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
        <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium }]}>
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
                      item.subtasks_completed === item.subtasks_total ? '#27ae60' : '#451E5D',
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.subtaskProgressLabel,
                item.subtasks_completed === item.subtasks_total && styles.subtaskProgressLabelDone,
              ]}>
              {item.subtasks_completed}/{item.subtasks_total}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.iconContainer}>
        <TouchableOpacity onPress={() => onToggle(item.id)}>
          <Icon
            name={item.completed ? 'times-circle' : 'check-circle'}
            size={24}
            color={item.completed ? '#888' : '#451E5D'}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDetails(item)}>
          <Icon name="info-circle" size={24} color="#451E5D" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onEdit(item.id)}>
          <Icon name="edit" size={24} color="#451E5D" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(item.id)}>
          <Icon name="trash" size={24} color="#451E5D" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  taskItemHighPriority: {
    borderLeftWidth: 3,
    borderLeftColor: '#c0392b',
    backgroundColor: '#fff9f9',
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
    width: 140,
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
