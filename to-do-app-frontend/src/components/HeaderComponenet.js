import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const HeaderComponent = ({ user }) => (
  <View style={styles.container}>
    <Image
      source={require('../../assets/logoWhite.png')}
      style={styles.logo}
      resizeMode="contain"
    />
    <View>
      <Text style={styles.greeting}>Hello,</Text>
      <Text style={styles.name} numberOfLines={1}>
        {user?.name || 'Guest'}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#451E5D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    // overflow must be absent (not 'hidden') so the shadow renders on iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 6,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  greeting: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
  },
});

export default HeaderComponent;
