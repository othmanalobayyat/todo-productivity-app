import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import api from "../services/api";
import { loadCachedTasks, fetchAndCacheTasks, saveTasks } from "../services/taskCache";
import AppHeader from "../components/AppHeader";
import TaskItem from "../components/TaskItem";
import { showToast } from "../components/Toast";
import { PRIORITY_RANK } from "../constants/priorities";
import { getTodayString } from "../utils/dateUtils";
import { getInsights, getInsightMessage } from "../utils/insightsUtils";
import { calculateStreak } from "../utils/streakUtils";

function SectionHeader({ label, count }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionCount}>{count}</Text>
    </View>
  );
}

// Lightweight skeleton that mirrors the TaskItem card shape without animations.
// Purple-tinted placeholder blocks (`#ede7f6`) match the app's design language.
function TaskSkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonCheckbox} />
        <View style={styles.skeletonBody}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonMeta} />
        </View>
        <View style={styles.skeletonBadge} />
      </View>
    </View>
  );
}

export default function TasksScreen({ navigation, userData }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'completed' | 'pending'
  const [sort, setSort] = useState("priority"); // 'priority' | 'due_date'

  useEffect(() => {
    let mounted = true;

    async function initialLoad() {
      // Step 1: Serve cached tasks immediately — avoids blank screen
      const cached = await loadCachedTasks();
      if (!mounted) return;
      if (cached) {
        setTasks(cached);
        setIsLoading(false);
      }

      // Step 2: Fetch fresh data. Deduplication in fetchAndCacheTasks() ensures
      // only one network request fires even if CalendarScreen or ProfileScreen
      // also calls this simultaneously during the same tab-switch.
      try {
        const fresh = await fetchAndCacheTasks();
        if (mounted) {
          setTasks(fresh);
          setIsLoading(false);
        }
      } catch {
        if (!mounted) return;
        setIsLoading(false);
        if (!cached) showToast("Unable to load tasks");
        // With stale cache: keep it visible — the offline banner provides context.
      }
    }

    initialLoad();

    // On tab focus: silently refresh in background; stale data stays visible.
    const unsubscribe = navigation.addListener("focus", async () => {
      if (!mounted) return;
      try {
        const fresh = await fetchAndCacheTasks();
        if (mounted) setTasks(fresh);
      } catch {
        // Focus refresh failed — current tasks remain visible.
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [navigation]);

  async function toggleTaskComplete(id) {
    const original = tasks.find((t) => t.id === id);
    if (!original) return;
    const nowCompleted = !original.completed;
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, completed: nowCompleted, completed_at: nowCompleted ? new Date().toISOString() : null }
          : t,
      ),
    );
    try {
      const response = await api.patch(`/tasks/${id}/complete`, {});
      // Spread only the fields the PATCH endpoint returns to preserve
      // subtasks_total and subtasks_completed (added by GET /tasks, not PATCH).
      // With the updated backend these fields are now included too, but this
      // selective spread makes the frontend safe regardless of backend version.
      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, completed: response.data.completed, completed_at: response.data.completed_at }
            : t,
        ),
      );
    } catch (error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? original : t)));
      showToast("Failed to update task");
    }
  }

  async function deleteTask(id) {
    const prevTasks = tasks;
    const nextTasks = tasks.filter((t) => t.id !== id);
    setTasks(nextTasks);
    try {
      await api.delete(`/tasks/${id}`);
      // Sync the cache immediately so the deleted task never reappears on restart.
      saveTasks(nextTasks);
    } catch (error) {
      setTasks(prevTasks);
      showToast("Failed to delete task");
    }
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

  function getListData() {
    const sorted = getDisplayedTasks();

    if (filter !== "all") return sorted;

    const pendingItems = sorted.filter((t) => !t.completed);
    const completedItems = sorted.filter((t) => t.completed);
    const data = [];

    if (pendingItems.length > 0) {
      data.push({ _type: "header", _key: "header-pending", label: "PENDING", count: pendingItems.length });
      pendingItems.forEach((t) => data.push(t));
    }
    if (completedItems.length > 0) {
      data.push({ _type: "header", _key: "header-completed", label: "COMPLETED", count: completedItems.length });
      completedItems.forEach((t) => data.push(t));
    }

    return data;
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

  const renderItem = ({ item }) => {
    if (item._type === "header") {
      return <SectionHeader label={item.label} count={item.count} />;
    }
    return (
      <TaskItem
        item={item}
        today={today}
        onToggle={toggleTaskComplete}
        onDetails={(task) => navigation.navigate("TaskDetails", { task })}
        onEdit={(id) => navigation.navigate("EditTask", { taskId: id })}
        onDelete={deleteTask}
      />
    );
  };

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
        <>
          <TaskSkeletonCard />
          <TaskSkeletonCard />
          <TaskSkeletonCard />
          <TaskSkeletonCard />
        </>
      ) : tasks.length === 0 ? (
        <EmptyState filtered={false} />
      ) : (
        <FlatList
          data={getListData()}
          renderItem={renderItem}
          keyExtractor={(item) => item._key || item.id.toString()}
          ListEmptyComponent={<EmptyState filtered={true} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f2f8",
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
  listContent: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#451E5D",
    letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e4dced",
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "#bbb",
  },
  // ── Skeleton loader ──────────────────────────────────────────────────────────
  skeletonCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 14,
    marginVertical: 5,
    padding: 16,
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ede7f6",
    marginRight: 12,
  },
  skeletonBody: {
    flex: 1,
  },
  skeletonTitle: {
    height: 13,
    borderRadius: 6,
    backgroundColor: "#ede7f6",
    width: "75%",
    marginBottom: 8,
  },
  skeletonMeta: {
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f0eaf7",
    width: "45%",
  },
  skeletonBadge: {
    width: 44,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f0eaf7",
    marginLeft: 8,
  },
});
