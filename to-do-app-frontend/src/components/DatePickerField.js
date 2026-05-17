import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatLocalDate } from '../utils/dateUtils';

export default function DatePickerField({ value, onChange }) {
  const [show, setShow] = useState(false);

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={styles.button}
        activeOpacity={0.7}>
        <Icon name="calendar-today" size={17} color="#451E5D" />
        <Text style={styles.dateText}>{formatLocalDate(value)}</Text>
        <Icon name="chevron-right" size={18} color="#B0AABF" />
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode="date"
          display={Platform.OS === 'ios' ? 'default' : 'spinner'}
          textColor="#333"
          onChange={(event, selectedDate) => {
            setShow(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
