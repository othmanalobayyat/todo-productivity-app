import React, { useEffect, useState, useCallback } from "react";
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
import api from "../services/api";
import { getMarkedDates, getTasksForDate } from "../utils/calendarUtils";
import AppHeader from "../components/AppHeader";
import { PRIORITY_COLORS } from "../constants/priorities";

function getDeviceLocalDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const today = getDeviceLocalDate();

function formatDisplayDate(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function CalendarScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get("/tasks");
      setTasks(res.data?.data ?? res.data ?? []);
    } catch (e) {
      console.error("CalendarScreen: failed to fetch tasks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks]),
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
          todayTextColor: "#451E5D",
          selectedDayBackgroundColor: "#451E5D",
          selectedDayTextColor: "#fff",
          arrowColor: "#451E5D",
          dotColor: "#451E5D",
          textDayFontSize: 14,
          textMonthFontSize: 15,
          textMonthFontWeight: "bold",
          monthTextColor: "#1a1a1a",
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
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#451E5D",
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
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
});
