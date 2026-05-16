import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function OverflowMenu({ visible, anchorRef, onClose, onEdit, onDelete }) {
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16 });
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      if (anchorRef?.current) {
        anchorRef.current.measureInWindow((x, y, width, height) => {
          setMenuPos({
            top: y + height + 6,
            right: SCREEN_WIDTH - x - width,
          });
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 220,
            friction: 18,
          }).start();
        });
      }
    } else {
      anim.setValue(0);
    }
  }, [visible]);

  const menuStyle = {
    opacity: anim,
    transform: [
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.menu,
                { top: menuPos.top, right: menuPos.right },
                menuStyle,
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.65}
                onPress={() => { onClose(); onEdit(); }}
              >
                <Icon name="pencil" size={13} color="#444" style={styles.menuIcon} />
                <Text style={styles.menuText}>Edit</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.65}
                onPress={() => { onClose(); onDelete(); }}
              >
                <Icon name="trash" size={13} color="#c0392b" style={styles.menuIcon} />
                <Text style={[styles.menuText, styles.menuTextDestructive]}>Delete</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 148,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 9,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  menuIcon: {
    width: 18,
    marginRight: 10,
    textAlign: 'center',
  },
  menuText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  menuTextDestructive: {
    color: '#c0392b',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ebebeb',
    marginHorizontal: 12,
  },
});
