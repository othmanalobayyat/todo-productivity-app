import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatLocalDate } from '../utils/dateUtils';

// Web-only: wraps a native <input type="date"> behind a styled button.
// Metro resolves this file instead of DatePickerField.js on the web platform.
export default function DatePickerField({ value, onChange }) {
  function handleChange(e) {
    const raw = e.target.value; // "YYYY-MM-DD" from the browser, or "" on clear
    if (!raw) return;
    const [y, m, d] = raw.split('-').map(Number);
    // Construct in local timezone to match formatLocalDate — avoids UTC shift
    onChange(new Date(y, m - 1, d));
  }

  return (
    <View style={styles.container}>
      {/* Visual button — pointer-events disabled so clicks fall through to the input */}
      <View style={styles.button} pointerEvents="none">
        <Icon name="calendar-today" size={17} color="#451E5D" />
        <Text style={styles.dateText}>{formatLocalDate(value)}</Text>
        <Icon name="chevron-right" size={18} color="#B0AABF" />
      </View>

      {/*
        Transparent native date input covering the entire button.
        The browser opens its own calendar picker on click without any JS.
        tabIndex={-1} keeps it out of the tab order (the button is the visible target).
        aria-hidden keeps screen readers off the invisible element.
      */}
      <input
        type="date"
        value={formatLocalDate(value)}
        onChange={handleChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 1,
          border: 'none',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8F6FB',
    borderWidth: 1.5,
    borderColor: '#E8E2F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: '#1A0A2E',
  },
});
