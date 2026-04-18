import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import api from "../services/api";
import AppHeader from "../components/AppHeader";
import TaskItem from "../components/TaskItem";
import { showToast } from "../components/Toast";
import { PRIORITY_RANK } from "../constants/priorities";
import { getTodayString } from "../utils/dateUtils";
import { getInsights, getInsightMessage } from "../utils/insightsUtils";
import { calculateStreak } from "../utils/streakUtils";

export default function TasksScreen({ navigation, userData }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'completed' | 'pending'
  const [sort, setSort] = useState("priority"); // 'priority' | 'due_date'
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    fetchTasks();
    const unsubscribe = navigation.addListener("focus", fetchTasks);
    return unsubscribe;
  }, [navigation]);

  async function fetchTasks() {
    setIsLoading(true);
    try {
      const response = await api.get("/tasks");
      const validTasks = response.data.filter((task) => task.id && task.title);
      setTasks(validTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      showToast("Unable to fetch tasks");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleTaskComplete(id) {
    setCompletingId(id);
    try {
      await api.patch(`/tasks/${id}/complete`, {});
      await fetchTasks();
    } catch (error) {
      showToast("Failed to update task");
    } finally {
      setCompletingId(null);
    }
  }

  function confirmDeleteTask(id) {
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/tasks/${id}`);
            fetchTasks();
          } catch (error) {
            showToast("Failed to delete task");
          }
        },
      },
    ]);
  }

  const today = getTodayString();
  const insights = getInsights(tasks, today);
  const streak = calculateStreak(tasks);
  const { total, completed, overdue, dueToday, highPending } = insights;
  const pending = total - completed;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  function getDisplayedTasks() {
    let result = [...tasks];

    if (filter === "completed") result = result.filter((t) => t.completed);
    if (filter === "pending") result = result.filter((t) => !t.completed);

    if (sort === "priority") {
      result.sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2),
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
        {filtered ? "No matching tasks" : "No tasks yet"}
      </Text>
      <Text style={styles.emptyStateSub}>
        {filtered
          ? "Try a different filter."
          : "Tap the + button to add your first task."}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TaskItem
      item={item}
      today={today}
      isCompleting={completingId === item.id}
      onToggle={toggleTaskComplete}
      onDetails={(task) => navigation.navigate("TaskDetails", { task })}
      onEdit={(id) => navigation.navigate("EditTask", { taskId: id })}
      onDelete={confirmDeleteTask}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#451E5D" />
      <AppHeader user={userData} />
      <View style={styles.dashboard}>
        <View style={styles.dashboardHeader}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Tasks</Text>
            <View style={[styles.streakBadge, streak === 0 && styles.streakBadgeInactive]}>
              <Icon5
                name="fire-alt"
                size={14}
                color={streak === 0 ? "#bbb" : "#FF6000"}
              />
              <Text style={[styles.streakText, streak === 0 && styles.streakTextInactive]}>
                {streak}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate("CreateTask")}>
            <Icon name="plus-circle" size={36} color="#451E5D" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxMiddle]}>
            <Text style={[styles.statNumber, { color: "#27ae60" }]}>
              {completed}
            </Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: "#e67e22" }]}>
              {pending}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.summaryMessage}>{getInsightMessage(insights)}</Text>

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
                <Text style={styles.insightPillText}>
                  {highPending} High Priority
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.controls}>
        {["all", "pending", "completed"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.controlBtn, filter === f && styles.controlBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.controlBtnText,
                filter === f && styles.controlBtnTextActive,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.controlDivider} />
        {[
          ["priority", "Priority"],
          ["due_date", "Due Date"],
        ].map(([val, label]) => (
          <TouchableOpacity
            key={val}
            style={[styles.controlBtn, sort === val && styles.controlBtnActive]}
            onPress={() => setSort(val)}
          >
            <Text
              style={[
                styles.controlBtnText,
                sort === val && styles.controlBtnTextActive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dashboardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#451E5D",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: "#FF6000",
    backgroundColor: "#FFF0E6",
  },
  streakBadgeInactive: {
    borderColor: "#d0d0d0",
    backgroundColor: "#f5f5f5",
  },
  streakText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF6000",
  },
  streakTextInactive: {
    color: "#bbb",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statBoxMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#f0f0f0",
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "700",
    color: "#451E5D",
  },
  statLabel: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
    fontWeight: "500",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    marginBottom: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    backgroundColor: "#451E5D",
    borderRadius: 3,
  },
  summaryMessage: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  insightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    fontWeight: "600",
    color: "#fff",
  },
  insightOverdue: {
    backgroundColor: "#c0392b",
  },
  insightToday: {
    backgroundColor: "#451E5D",
  },
  insightHigh: {
    backgroundColor: "#e67e22",
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 40,
    color: "#999",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#555",
    marginTop: 16,
  },
  emptyStateSub: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 6,
    textAlign: "center",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 6,
    gap: 6,
  },
  controlDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  controlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#451E5D",
  },
  controlBtnActive: {
    backgroundColor: "#451E5D",
  },
  controlBtnText: {
    fontSize: 12,
    color: "#451E5D",
  },
  controlBtnTextActive: {
    color: "#fff",
  },
});
