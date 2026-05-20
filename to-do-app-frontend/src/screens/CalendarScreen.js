import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Calendar } from "react-native-calendars";
import { useFocusEffect } from "@react-navigation/native";
import { loadCachedTasks, fetchAndCacheTasks } from "../services/taskCache";
import { getMarkedDates, getTasksForDate } from "../utils/calendarUtils";
import { getTodayString } from "../utils/dateUtils";
import AppHeader from "../components/AppHeader";
import { PRIORITY_COLORS } from "../constants/priorities";

// ─── Day summary visual mode ──────────────────────────────────────────────────
// Change this value to switch between card styles.
// 'simple'  → lightweight stats row + progress bar
// 'premium' → SVG progress ring with hero completion count
const DAY_SUMMARY_STYLE = "simple"; // 'simple' | 'premium'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Computes all day-level stats from a task array.
// Called once in DaySummaryCard and passed as a prop to both card variants.
function computeStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;
  const progress = total > 0 ? completed / total : 0;
  const pct = Math.round(progress * 100);
  const allDone = pending === 0;
  return { total, completed, pending, progress, pct, allDone };
}

// ─── Simple summary card ──────────────────────────────────────────────────────

const S_RING_SIZE = 62;
const S_RING_STROKE = 5;
const S_RING_R = (S_RING_SIZE - S_RING_STROKE) / 2;
const S_RING_CIRC = 2 * Math.PI * S_RING_R;

function SimpleRing({ progress }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = S_RING_CIRC * (1 - clamped);
  const pct = Math.round(clamped * 100);
  const allDone = clamped >= 1;
  const arcColor = allDone ? "#4caf7d" : "#6B3FA0";

  return (
    <View style={styles.simpleRingWrap}>
      <Svg
        width={S_RING_SIZE}
        height={S_RING_SIZE}
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}
      >
        <Circle
          cx={S_RING_SIZE / 2}
          cy={S_RING_SIZE / 2}
          r={S_RING_R}
          stroke="#ede8f5"
          strokeWidth={S_RING_STROKE}
          fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={S_RING_SIZE / 2}
            cy={S_RING_SIZE / 2}
            r={S_RING_R}
            stroke={arcColor}
            strokeWidth={S_RING_STROKE}
            fill="none"
            strokeDasharray={S_RING_CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Text style={[styles.simpleRingNum, allDone && styles.simpleRingNumDone]}>
        {pct}
      </Text>
      <Text style={[styles.simpleRingSign, allDone && styles.simpleRingSignDone]}>
        %
      </Text>
    </View>
  );
}

function SimpleDaySummaryCard({ stats }) {
  const { total, completed, pending, progress, pct, allDone } = stats;

  return (
    <View style={styles.simpleCard}>
      <SimpleRing progress={progress} />
      <View style={styles.simpleBody}>
        <View style={styles.simpleStatsRow}>
          <Text style={[styles.simpleStatNum, { color: "#6B3FA0" }]}>{total}</Text>
          <Text style={styles.simpleStatLbl}> total</Text>
          <Text style={styles.simpleStatDot}>·</Text>
          <Text style={[styles.simpleStatNum, { color: "#4caf7d" }]}>{completed}</Text>
          <Text style={styles.simpleStatLbl}> done</Text>
          <Text style={styles.simpleStatDot}>·</Text>
          <Text style={[styles.simpleStatNum, { color: "#F59E0B" }]}>{pending}</Text>
          <Text style={styles.simpleStatLbl}> left</Text>
        </View>
        <View style={styles.simpleBarTrack}>
          <View
            style={[
              styles.simpleBarFill,
              { width: `${pct}%`, backgroundColor: allDone ? "#4caf7d" : "#6B3FA0" },
            ]}
          />
        </View>
        <Text style={[styles.simpleCompletionText, allDone && styles.simpleCompletionTextDone]}>
          {allDone ? "All tasks complete" : `${pct}% complete`}
        </Text>
      </View>
    </View>
  );
}

// ─── Premium summary card ─────────────────────────────────────────────────────

const RING_SIZE = 64;
const RING_STROKE = 5;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

function ProgressRing({ progress }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = RING_CIRC * (1 - clamped);
  const pct = Math.round(clamped * 100);
  const allDone = clamped >= 1;
  const arcColor = allDone ? "#4caf7d" : "#451E5D";

  return (
    <View style={styles.ringContainer}>
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: "-90deg" }] }]}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_R}
          stroke="#ede8f5"
          strokeWidth={RING_STROKE}
          fill="none"
        />
        {clamped > 0 && (
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke={arcColor}
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={RING_CIRC}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        )}
      </Svg>
      <Text style={[styles.ringNum, allDone && styles.ringNumDone]}>{pct}</Text>
      <Text style={[styles.ringSign, allDone && styles.ringSignDone]}>%</Text>
    </View>
  );
}

function PremiumDaySummaryCard({ stats }) {
  const { completed, pending, total, progress, allDone } = stats;

  const detailText = allDone
    ? `All ${total} complete`
    : `${total} total  ·  ${pending} remaining`;

  return (
    <View style={styles.premiumCard}>
      <ProgressRing progress={progress} />

      <View style={styles.premiumBody}>
        <View style={styles.premiumHeroRow}>
          <Text
            style={[
              styles.premiumHeroNum,
              allDone && styles.premiumHeroNumDone,
            ]}
          >
            {completed}
          </Text>
          <Text style={styles.premiumHeroLabel}> done</Text>
        </View>
        <Text style={styles.premiumDetail}>{detailText}</Text>
      </View>
    </View>
  );
}

// ─── Day summary card (mode router) ──────────────────────────────────────────
// Handles the empty state centrally, computes stats once, then delegates
// to whichever card variant is active via DAY_SUMMARY_STYLE.

function DaySummaryCard({ tasks }) {
  if (tasks.length === 0) {
    return (
      <View style={styles.cardEmpty}>
        <Text style={styles.cardEmptyText}>No tasks scheduled</Text>
      </View>
    );
  }

  const stats = computeStats(tasks);

  return DAY_SUMMARY_STYLE === "premium" ? (
    <PremiumDaySummaryCard stats={stats} />
  ) : (
    <SimpleDaySummaryCard stats={stats} />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }) {
  // Memoized so it never changes during the component's lifetime (date doesn't
  // shift while the app is open), which keeps it stable as a useMemo dependency.
  const today = useMemo(() => getTodayString(), []);

  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadAndRefresh() {
        const cached = await loadCachedTasks();
        if (!mounted) return;
        if (cached) {
          setTasks(cached);
          setLoading(false);
          setFetchError(false);
        }

        try {
          const fresh = await fetchAndCacheTasks();
          if (!mounted) return;
          setTasks(fresh);
          setLoading(false);
          setFetchError(false);
        } catch {
          if (!mounted) return;
          setLoading(false);
          if (!cached) setFetchError(true);
        }
      }

      loadAndRefresh();
      return () => {
        mounted = false;
      };
    }, []),
  );

  // Derived values memoized so they don't recompute on every render.
  const markedDates = useMemo(
    () => getMarkedDates(tasks, selectedDate, today),
    [tasks, selectedDate, today],
  );
  const dayTasks = useMemo(
    () => getTasksForDate(tasks, selectedDate),
    [tasks, selectedDate],
  );

  // Static theme object — memoized so Calendar never receives a new reference
  // on re-renders unrelated to theming, which would force it to re-render.
  const calendarTheme = useMemo(() => ({
    backgroundColor: "#f5f2f8",
    calendarBackground: "#f5f2f8",
    todayTextColor: "#451E5D",
    selectedDayBackgroundColor: "#451E5D",
    selectedDayTextColor: "#fff",
    arrowColor: "#451E5D",
    textDayFontSize: 14,
    textMonthFontSize: 15,
    textMonthFontWeight: "bold",
    monthTextColor: "#1a1a1a",
    dayTextColor: "#2c3e50",
    textDisabledColor: "#c8c8d0",
  }), []);

  // Stable callback — avoids Calendar receiving a new onDayPress reference on
  // every render, which would otherwise bypass its internal shouldComponentUpdate.
  const onDayPress = useCallback(
    (day) => setSelectedDate(day.dateString),
    [],
  );

  // Stable renderItem — without useCallback, FlatList re-renders all visible
  // task rows on every parent state change (e.g. date selection).
  const renderTask = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={[
          styles.taskRow,
          item.priority === "high" && !item.completed && styles.taskRowHigh,
        ]}
        onPress={() => navigation.navigate("TaskDetails", { task: item })}
        activeOpacity={0.7}
      >
        <View style={styles.taskLeft}>
          <Text
            style={[styles.taskTitle, item.completed && styles.taskTitleDone]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View
            style={[
              styles.priorityBadge,
              {
                backgroundColor:
                  PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium,
              },
            ]}
          >
            <Text style={styles.priorityText}>
              {(item.priority || "medium").toUpperCase()}
            </Text>
          </View>
        </View>
        {!!item.completed && <Text style={styles.doneLabel}>Done</Text>}
      </TouchableOpacity>
    ),
    [navigation],
  );

  // The header element is memoized so FlatList does not receive a new element
  // reference on renders where its deps haven't changed, preventing the Calendar
  // from unmounting/remounting unnecessarily. React reconciles props differences
  // when deps do change, so Calendar stays mounted and only updates what changed.
  const ListHeader = useMemo(
    () => (
      <>
        <Calendar
          current={today}
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={calendarTheme}
        />
        <View style={styles.daySection}>
          <Text style={styles.dayLabel}>
            {selectedDate === today
              ? `Today · ${formatDisplayDate(today)}`
              : formatDisplayDate(selectedDate)}
          </Text>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color="#451E5D" style={styles.loader} />
        ) : fetchError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorStateText}>Could not load tasks</Text>
            <Text style={styles.errorStateSub}>
              Check your connection and try again.
            </Text>
          </View>
        ) : (
          <DaySummaryCard tasks={dayTasks} />
        )}
      </>
    ),
    [loading, fetchError, dayTasks, markedDates, selectedDate, today, onDayPress, calendarTheme],
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Calendar" />
      <FlatList
        data={dayTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTask}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f2f8",
  },

  // ── Shared empty state ──────────────────────────────────────────────────────
  cardEmpty: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: "center",
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  cardEmptyText: {
    fontSize: 13,
    color: "#c0b8cc",
  },

  // ── Simple card ─────────────────────────────────────────────────────────────
  simpleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  simpleRingWrap: {
    width: S_RING_SIZE,
    height: S_RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  simpleRingNum: {
    fontSize: 15,
    fontWeight: "700",
    color: "#451E5D",
    lineHeight: 18,
  },
  simpleRingNumDone: {
    color: "#4caf7d",
  },
  simpleRingSign: {
    fontSize: 8,
    fontWeight: "600",
    color: "#b9a8d4",
    lineHeight: 10,
    marginTop: -1,
  },
  simpleRingSignDone: {
    color: "#80c9a0",
  },
  simpleBody: {
    flex: 1,
    gap: 6,
  },
  simpleStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  simpleStatNum: {
    fontSize: 14,
    fontWeight: "700",
  },
  simpleStatLbl: {
    fontSize: 13,
    color: "#b0a8c0",
    fontWeight: "400",
  },
  simpleStatDot: {
    fontSize: 12,
    color: "#d0c8dc",
    marginHorizontal: 5,
  },
  simpleBarTrack: {
    height: 4,
    backgroundColor: "#ede8f5",
    borderRadius: 10,
    overflow: "hidden",
  },
  simpleBarFill: {
    height: "100%",
    borderRadius: 10,
  },
  simpleCompletionText: {
    fontSize: 11,
    color: "#b0a8c0",
    fontWeight: "500",
  },
  simpleCompletionTextDone: {
    color: "#4caf7d",
  },
  // ── Premium ring ────────────────────────────────────────────────────────────
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#451E5D",
    lineHeight: 19,
  },
  ringNumDone: {
    color: "#4caf7d",
  },
  ringSign: {
    fontSize: 9,
    fontWeight: "600",
    color: "#b9a8d4",
    lineHeight: 11,
    marginTop: -1,
  },
  ringSignDone: {
    color: "#80c9a0",
  },

  // ── Premium card ────────────────────────────────────────────────────────────
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  premiumBody: {
    flex: 1,
    justifyContent: "center",
    gap: 5,
  },
  premiumHeroRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  premiumHeroNum: {
    fontSize: 26,
    fontWeight: "800",
    color: "#451E5D",
    lineHeight: 30,
  },
  premiumHeroNumDone: {
    color: "#4caf7d",
  },
  premiumHeroLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#bbb",
    marginLeft: 4,
  },
  premiumDetail: {
    fontSize: 12,
    color: "#c0b8cc",
    fontWeight: "500",
  },

  // ── Day section header ──────────────────────────────────────────────────────
  daySection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#451E5D",
  },
  loader: {
    marginTop: 24,
  },
  listContent: {
    paddingBottom: 20,
  },

  // ── Task rows ───────────────────────────────────────────────────────────────
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginVertical: 5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  taskRowHigh: {
    borderLeftWidth: 3,
    borderLeftColor: "#c0392b",
    backgroundColor: "#fff9f9",
  },
  taskLeft: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    color: "#aaa",
  },
  priorityBadge: {
    alignSelf: "flex-start",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  doneLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#27ae60",
  },

  // ── Error state ─────────────────────────────────────────────────────────────
  errorState: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 40,
  },
  errorStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 6,
  },
  errorStateSub: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
  },
});
