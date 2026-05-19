import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function Step({ number, iconName, text, hint }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBubble}>
        <Text style={styles.stepBubbleText}>{number}</Text>
      </View>
      <Ionicons name={iconName} size={20} color="#451E5D" style={styles.stepIcon} />
      <View style={styles.stepTextWrap}>
        <Text style={styles.stepText}>{text}</Text>
        {!!hint && <Text style={styles.stepHint}>{hint}</Text>}
      </View>
    </View>
  );
}

/**
 * Props:
 *   visible   — boolean
 *   onDismiss — called when "Not Now" is pressed
 */
export default function IosInstallSheet({ visible, onDismiss }) {
  // Safety net: never mount on native — hook already prevents shouldShow from
  // being true on non-web, but this guard keeps the import tree clean.
  if (Platform.OS !== 'web') return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Drag handle — matches native iOS sheet aesthetic */}
          <View style={styles.handle} />

          {/* App icon */}
          <View style={styles.iconWrap}>
            <Image
              source={require('../../assets/logoPurple.png')}
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <Text style={styles.title}>Add Orvia to your{'\n'}Home Screen</Text>
          <Text style={styles.subtitle}>Works offline. Opens like a real app.</Text>

          {/* Step-by-step instructions */}
          <View style={styles.stepsBox}>
            <Step
              number="1"
              iconName="ellipsis-horizontal"
              text="Open the browser menu"
            />
            <View style={styles.stepDivider} />
            <Step
              number="2"
              iconName="share-outline"
              text="Tap Share"
            />
            <View style={styles.stepDivider} />
            <Step
              number="3"
              iconName="add-circle-outline"
              text={'Tap "Add to Home Screen"'}
              hint="You may need to tap View More first"
            />
          </View>

          {/* Dismiss */}
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text style={styles.dismissText}>Not Now</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 44,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },

  // Handle
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DEDEDE',
    alignSelf: 'center',
    marginBottom: 28,
  },

  // Icon
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#EDE7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#451E5D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  appIcon: {
    width: 48,
    height: 48,
  },

  // Text
  title: {
    fontSize: 21,
    fontWeight: '700',
    color: '#1A0A2E',
    textAlign: 'center',
    lineHeight: 29,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },

  // Steps container
  stepsBox: {
    backgroundColor: '#F8F6FB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EDE7F6',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  stepBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#451E5D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    // Prevent bubble from shrinking on small screens
    flexShrink: 0,
  },
  stepBubbleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  stepHint: {
    fontSize: 12,
    color: '#AAA',
    lineHeight: 17,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    backgroundColor: '#EDE7F6',
    // Bleed divider to the edges of the stepsBox padding
    marginHorizontal: -16,
  },

  // Dismiss button — matches UpdateModal's "Later" style
  dismissBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
});
