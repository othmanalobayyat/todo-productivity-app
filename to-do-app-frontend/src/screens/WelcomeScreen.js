import React from "react";
import {
  StyleSheet, Text, View, Image,
  TouchableOpacity, Pressable, StatusBar, Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Illustration */}
      <View style={styles.illustrationArea}>
        <Image
          source={require("../../assets/background.jpg")}
          style={styles.illustration}
          resizeMode="contain"
        />
      </View>

      {/* Copy */}
      <Text style={styles.headline}>Get things done,{"\n"}your way.</Text>
      <Text style={styles.subtitle}>
        Plan tasks, set deadlines, and stay on top of everything — beautifully.
      </Text>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* CTAs */}
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("Login")}
        activeOpacity={0.88}
      >
        <Text style={styles.primaryBtnText}>Log In</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>

      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.secondaryBtnText}>Create a Free Account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    paddingTop: 56,
    paddingBottom: 40,
  },
  illustrationArea: {
    width: "100%",
    height: height * 0.34,
    marginBottom: 28,
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1A0A2E",
    letterSpacing: -0.6,
    lineHeight: 44,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#7C7A8E",
    lineHeight: 23,
  },
  primaryBtn: {
    backgroundColor: "#451E5D",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
    shadowColor: "#451E5D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D4C5E2",
  },
  secondaryBtnPressed: {
    backgroundColor: "#f5eefa",
    borderColor: "#451E5D",
  },
  secondaryBtnText: {
    color: "#451E5D",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
