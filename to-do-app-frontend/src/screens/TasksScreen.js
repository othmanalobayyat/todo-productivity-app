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
import { enqueueOperation } from "../services/writeQueue";
import { registerTaskRefreshHandler, unregisterTaskRefreshHandler } from "../services/taskEvents";
import { checkIsOffline } from "../utils/networkUtils";
import AppHeader from "../components/AppHeader";
import TaskItem from "../components/TaskItem";
import { showToast } from "../components/Toast";
import { PRIORITY_RANK } from "../constants/priorities";
import { getTodayString } from "../utils/dateUtils";
import { getInsights, getInsightMessage } from "../utils/insightsUtils";
import { calculateStreak } from "../utils/streakUtils";

function SectionHeader({ label, count, overdue }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionLabel, overdue && styles.sectionLabelOverdue]}>{label}</Text>
      <View style={[styles.sectionLine, overdue && styles.sectionLineOverdue]} />
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
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadFromCacheThenServer() {
      // Always load from cache first so offline/pending tasks are visible immediately.
      const cached = await loadCachedTasks();
      if (!mounted) return;
      if (cached) setTasks(cached);

      try {
        const fresh = await fetchAndCacheTasks();
        if (mounted) setTasks(fresh);
      } catch {
        if (!mounted) return;
        // Network failed — cached data (including any pending_sync tasks) stays visible.
        if (!cached) showToast("Unable to load tasks");
      }
    }

    async function initialLoad() {
      await loadFromCacheThenServer();
      if (mounted) setIsLoading(false);
    }

    initialLoad();

    // On tab focus: refresh, showing cache immediately if the network call fails.
    const unsubscribe = navigation.addListener("focus", async () => {
      if (!mounted) return;
      try {
        const fresh = await fetchAndCacheTasks();
        if (mounted) setTasks(fresh);
      } catch {
        // If fetch fails (e.g. offline), reload from cache so pending tasks are visible.
        const cached = await loadCachedTasks();
        if (cached && mounted) setTasks(cached);
      }
    });

    // Called by App.js via triggerTaskRefresh() after the write queue drains.
    registerTaskRefreshHandler(async () => {
      if (!mounted) return;
      const cached = await loadCachedTasks();
      if (cached && mounted) setTasks(cached);
      try {
        const fresh = await fetchAndCacheTasks();
        if (mounted) setTasks(fresh);
      } catch {}
    });

    return () => {
      mounted = false;
      unsubscribe();
      unregisterTaskRefreshHandler();
    };
  }, [navigation]);

  async function toggleTaskComplete(id) {
    const original = tasks.find((t) => t.id === id);
    if (!original) return;
    const nowCompleted = !original.completed;
    const updatedAt = nowCompleted ? new Date().toISOString() : null;

    // Optimistic update — applies immediately regardless of connectivity.
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: nowCompleted, completed_at: updatedAt } : t,
      ),
    );

    const offline = await checkIsOffline();

    if (offline) {
      // Enqueue the toggle (duplicate toggles cancel each other in the queue).
      await enqueueOperation('toggle', { taskId: id, completed: nowCompleted });
      // Persist the optimistic state to cache so it survives a restart.
      const cached = await loadCachedTasks();
      if (cached) {
        saveTasks(
          cached.map((t) =>
            t.id === id ? { ...t, completed: nowCompleted, completed_at: updatedAt } : t,
          ),
        );
      }
      return;
    }

    // Online path — sync immediately with selective spread to preserve subtask counts.
    try {
      const response = await api.patch(`/tasks/${id}/complete`, {});
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

    // Optimistic removal — applies immediately.
    setTasks(nextTasks);

    const offline = await checkIsOffline();

    if (offline) {
      // enqueueOperation handles the offline-only task case (returns 'skip')
      // and removes any pending toggle for this task automatically.
      await enqueueOperation('delete', { taskId: id });
      saveTasks(nextTasks);
      return;
    }

    // Online path.
    try {
      await api.delete(`/tasks/${id}`);
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

    const overdueItems = sorted.filter((t) => !t.completed && t.due_date && t.due_date < today);
    const pendingItems = sorted.filter((t) => !t.completed && !(t.due_date && t.due_date < today));
    const completedItems = sorted.filter((t) => t.completed);
    const data = [];

    if (overdueItems.length > 0) {
      data.push({ _type: "header", _key: "header-overdue", label: "OVERDUE", count: overdueItems.length, _overdue: true });
      overdueItems.forEach((t) => data.push(t));
    }
    if (pendingItems.length > 0) {
      data.push({ _type: "header", _key: "header-pending", label: "PENDING", count: pendingItems.length });
      pendingItems.forEach((t) => data.push(t));
    }
    if (completedItems.length > 0) {
      data.push({
        _type: "completed-toggle",
        _key: "completed-toggle",
        count: completedItems.length,
      });
      if (showCompleted) {
        completedItems.forEach((t) => data.push(t));
      }
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
      return <SectionHeader label={item.label} count={item.count} overdue={item._overdue} />;
    }
    if (item._type === "completed-toggle") {
      return (
        <TouchableOpacity
          style={styles.completedToggleRow}
          onPress={() => setShowCompleted((v) => !v)}
          activeOpacity={0.7}
        >
          <Icon
            name={showCompleted ? "chevron-up" : "chevron-down"}
            size={11}
            color="#999"
            style={styles.completedToggleIcon}
          />
          <Text style={styles.completedToggleText}>
            {showCompleted ? "Hide completed" : `Show ${item.count} completed`}
          </Text>
        </TouchableOpacity>
      );
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
  sectionLabelOverdue: {
    color: "#c0392b",
  },
  sectionLineOverdue: {
    backgroundColor: "#f5c6c2",
  },
  completedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 4,
    paddingVertical: 6,
    gap: 6,
  },
  completedToggleIcon: {
    marginTop: 1,
  },
  completedToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 0.3,
  },
});
