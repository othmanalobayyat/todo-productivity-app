import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatTimeLabel, formatLocalTime } from '../utils/dateUtils';

// Web-only: wraps a native <input type="time"> behind a styled button.
// Metro resolves this file instead of TimePickerField.js on the web platform.
export default function TimePickerField({ value, onChange }) {
  function handleChange(e) {
    const raw = e.target.value; // "HH:mm" from the browser, or "" on clear
    if (!raw) return;
    const [hh, mm] = raw.split(':').map(Number);
    const next = new Date(value);
    next.setHours(hh, mm, 0, 0);
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <View style={styles.button} pointerEvents="none">
        <Icon name="access-time" size={17} color="#451E5D" />
        <Text style={styles.timeText}>{formatTimeLabel(formatLocalTime(value))}</Text>
        <Icon name="chevron-right" size={18} color="#B0AABF" />
      </View>

      <input
        type="time"
        value={formatLocalTime(value)}
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
  timeText: {
    flex: 1,
    fontSize: 15,
    color: '#1A0A2E',
  },
});
