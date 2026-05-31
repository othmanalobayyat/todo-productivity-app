import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { PRIORITY_COLORS } from '../constants/priorities';
import { getRelativeDateLabel } from '../utils/dateUtils';
import OverflowMenu from './OverflowMenu';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function TaskItem({ item, today, isCompleting, onToggle, onDetails, onEdit, onDelete }) {
  const overflowRef = useRef(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);

  const hasSubs = item.subtasks_total > 0;
  const subsDone = item.subtasks_completed === item.subtasks_total;
  const subsPercent = hasSubs
    ? Math.round((item.subtasks_completed / item.subtasks_total) * 100)
    : 0;
  const priorityColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
  const isHighPriority = item.priority === 'high' && !item.completed;

  return (
    <>
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onDetails(item)}
      style={[
        styles.card,
        isHighPriority && styles.cardHighPriority,
        isCompleting && styles.cardCompleting,
      ]}
    >
      {/* Row 1: check · title · overflow */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation?.(); onToggle(item.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={item.completed ? 'check-circle' : 'circle-o'}
            size={22}
            color={item.completed ? '#27ae60' : '#c4c4c4'}
          />
        </TouchableOpacity>

        <Text
          style={[styles.title, item.completed && styles.titleDone]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <TouchableOpacity
          ref={overflowRef}
          onPress={(e) => { e.stopPropagation?.(); setMenuVisible(true); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="ellipsis-v" size={16} color="#bbb" />
        </TouchableOpacity>
      </View>

      {/* Row 2: subtask progress (conditional) */}
      {hasSubs && (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${subsPercent}%`,
                  backgroundColor: subsDone ? '#27ae60' : '#451E5D',
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, subsDone && styles.progressLabelDone]}>
            {item.subtasks_completed}/{item.subtasks_total}
          </Text>
        </View>
      )}

      {/* Row 3: priority dot · due date · status badge */}
      <View style={styles.metaRow}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <Text style={[styles.priorityLabel, { color: priorityColor }]}>
          {(item.priority || 'medium').toUpperCase()}
        </Text>
        {item.due_date && (
          <>
            <View style={styles.metaSep} />
            <Text style={styles.dueDate}>{getRelativeDateLabel(item.due_date, today)}</Text>
          </>
        )}
        {!item.completed && item.due_date && item.due_date < today && (
          <View style={[styles.statusBadge, styles.statusOverdue]}>
            <Text style={styles.statusText}>Overdue</Text>
          </View>
        )}
        {!!item.pending_sync && (
          <View style={styles.pendingSyncBadge}>
            <Icon name="clock-o" size={10} color="#9c6fb5" />
            <Text style={styles.pendingSyncText}>Pending</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>

    <OverflowMenu
      visible={menuVisible}
      anchorRef={overflowRef}
      onClose={() => setMenuVisible(false)}
      onEdit={() => onEdit(item.id)}
      onDelete={() => setDeleteVisible(true)}
    />

    <DeleteConfirmModal
      visible={deleteVisible}
      taskTitle={item.title}
      onCancel={() => setDeleteVisible(false)}
      onConfirm={() => { setDeleteVisible(false); onDelete(item.id); }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHighPriority: {
    borderLeftWidth: 4,
    borderLeftColor: '#c0392b',
  },
  cardCompleting: {
    opacity: 0.4,
  },

  // Row 1
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: '#c0c0c0',
  },

  // Row 2
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingLeft: 32,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#451E5D',
    minWidth: 28,
    textAlign: 'right',
  },
  progressLabelDone: {
    color: '#27ae60',
  },

  // Row 3
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    paddingLeft: 32,
  },
  priorityDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaSep: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#d0d0d0',
  },
  dueDate: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusOverdue: {
    backgroundColor: '#fdecea',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#451E5D',
  },
  pendingSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f3eef8',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ddd3ea',
  },
  pendingSyncText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9c6fb5',
  },
});
