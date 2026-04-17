import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const HeaderComponentProfile = () => (
  <View style={styles.container}>
    <Image
      source={require('../../assets/logoWhite.png')}
      style={styles.logo}
      resizeMode="contain"
    />
    <Text style={styles.title}>My Profile</Text>
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
  title: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '700',
  },
});

export default HeaderComponentProfile;
