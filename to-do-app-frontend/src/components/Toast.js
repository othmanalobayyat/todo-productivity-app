import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

export const toastRef = React.createRef();

export function showToast(message, type = 'error') {
  toastRef.current?.show(message, type);
}

const Toast = forwardRef((_, ref) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const [state, setState] = useState({ message: '', type: 'error' });

  useImperativeHandle(ref, () => ({
    show(message, type = 'error') {
      setState({ message, type });
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    },
  }));

  const backgroundColor = state.type === 'success' ? '#2e7d32' : '#c62828';

  return (
    <Animated.View style={[styles.container, { opacity, backgroundColor }]}>
      <Text style={styles.text}>{state.message}</Text>
    </Animated.View>
  );
});

export default Toast;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 8,
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
