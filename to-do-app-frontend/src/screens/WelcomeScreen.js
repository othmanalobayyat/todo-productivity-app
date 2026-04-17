import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, StatusBar } from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
    <StatusBar backgroundColor="#FFF" />
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      {/* Illustration */}
      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/background.jpg")}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>Hello !</Text>
      <Text style={styles.subtitle}>
        Transform your plans into accomplishments and your dreams into reality, one task at a time.
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate('Login')} >
          <Text style={styles.buttonText}>LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signupButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.signupText}>SIGNUP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 50,
  },
  logoContainer: {
  flex: 2,
  flexDirection: 'row',
  alignSelf: 'flex-start',
  marginTop:20,
  height: 200, // Set an explicit height
  width: 100, // Set an explicit width
},
  imageContainer: {
    width: "80%",
    flex: 4, // Allow the container to expand with the screen size
    marginBottom: 5,
  },
  image: {
    width: "100%",
    height: "100%",
    
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    marginTop: 5,
    color: '#451E5D',
  },
  subtitle: {
    fontSize: 14,
    color: '#9491c7',
    textAlign: "center",
    marginBottom: 20,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 20, // Add padding to bottom for better spacing
  },
  loginButton: {
    backgroundColor: "#451E5D",
    width: "80%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 5,
  },
  signupButton: {
    borderWidth: 1,
    borderColor: "#451E5D",
    width: "80%",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signupText: {
    color: "#451E5D",
    fontSize: 16,
    fontWeight: "bold",
  },
});
