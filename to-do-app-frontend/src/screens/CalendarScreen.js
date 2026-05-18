import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { useFocusEffect } from "@react-navigation/native";
import { loadCachedTasks, fetchAndCacheTasks } from "../services/taskCache";
import { getMarkedDates, getTasksForDate } from "../utils/calendarUtils";
import { getTodayString } from "../utils/dateUtils";
import AppHeader from "../components/AppHeader";
import { PRIORITY_COLORS } from "../constants/priorities";

function formatDisplayDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function CalendarScreen({ navigation }) {
  // Computed inside the component so it refreshes correctly after midnight
  // (the module-level constant only evaluated once at import time).
  const today = getTodayString();

  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadAndRefresh() {
        // Step 1: Show cached tasks immediately — no blank calendar
        const cached = await loadCachedTasks();
        if (!mounted) return;
        if (cached) {
          setTasks(cached);
          setLoading(false);
          setFetchError(false);
        }

        // Step 2: Fetch fresh data. Deduplication prevents a redundant request
        // if TasksScreen or ProfileScreen is already fetching simultaneously.
        try {
          const fresh = await fetchAndCacheTasks();
          if (!mounted) return;
          setTasks(fresh);
          setLoading(false);
          setFetchError(false);
        } catch {
          if (!mounted) return;
          setLoading(false);
          // Only show the error state when there is nothing cached to display.
          // If stale cache is showing, the offline banner covers the context.
          if (!cached) setFetchError(true);
        }
      }

      loadAndRefresh();

      return () => { mounted = false; };
    }, []),
  );

  const markedDates = getMarkedDates(tasks, selectedDate, today);
  const dayTasks = getTasksForDate(tasks, selectedDate);

  const renderTask = ({ item }) => (
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
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Calendar" />

      <Calendar
        current={today}
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        markingType="dot"
        theme={{
          backgroundColor: "#f5f2f8",
          calendarBackground: "#f5f2f8",

          todayTextColor: "#451E5D",
          selectedDayBackgroundColor: "#451E5D",
          selectedDayTextColor: "#fff",

          arrowColor: "#451E5D",
          dotColor: "#451E5D",

          textDayFontSize: 14,
          textMonthFontSize: 15,
          textMonthFontWeight: "bold",

          monthTextColor: "#1a1a1a",
          dayTextColor: "#2c3e50",
          textDisabledColor: "#c8c8d0",
        }}
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
      ) : dayTasks.length === 0 ? (
        <Text style={styles.emptyText}>No tasks for this day.</Text>
      ) : (
        <FlatList
          data={dayTasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTask}
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
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    color: "#888",
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
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
