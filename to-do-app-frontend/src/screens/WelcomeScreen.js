import React from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, Pressable, StatusBar } from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.logoWrapper}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={require("../../assets/background.jpg")}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.copyContainer}>
        <Text style={styles.title}>Get things done.</Text>
        <Text style={styles.subtitle}>
          Plan, organize, and accomplish — everything in one place.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginButtonText}>Log In</Text>
        </TouchableOpacity>
        <Pressable
          style={({ pressed }) => [styles.signupButton, pressed && styles.signupButtonPressed]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.signupButtonText}>Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 28,
  },
  logoWrapper: {
    backgroundColor: "#f4eff8",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  logoImage: {
    width: 140,
    height: 36,
  },
  imageContainer: {
    width: "90%",
    flex: 1,
    marginBottom: 8,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  copyContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#451E5D",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#9491c7",
    textAlign: "center",
    lineHeight: 21,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 16,
  },
  loginButton: {
    backgroundColor: "#451E5D",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  signupButton: {
    borderWidth: 1.5,
    borderColor: "#451E5D",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  signupButtonPressed: {
    backgroundColor: "#f0eaf5",
  },
  signupButtonText: {
    color: "#451E5D",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
