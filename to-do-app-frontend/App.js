import React, { useCallback, useEffect, useState } from "react";
import { Image, View, StyleSheet, StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import api, { registerLogoutCallback } from "./src/services/api";
import { AUTH_TOKEN_KEY } from "./src/constants/storage";
import { checkForUpdate } from "./src/services/updateService";
import UpdateModal from "./src/components/UpdateModal";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "./src/screens/ResetPasswordScreen";
import ChangePasswordScreen from "./src/screens/ChangePasswordScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import TasksScreen from "./src/screens/TasksScreen";
import CreateTaskScreen from "./src/screens/CreateTaskScreen";
import EditTaskScreen from "./src/screens/EditTaskScreen";
import TaskDetailsScreen from "./src/screens/TaskDetailsScreen";
import WelcomeScreen from "./src/screens/WelcomeScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import Toast, { toastRef } from "./src/components/Toast";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MIN_SPLASH_MS = 1500;

const linking = {
  prefixes: [Linking.createURL("/"), "todoapp://"],
  config: {
    screens: {
      ResetPassword: "reset-password",
    },
  },
};

const SplashScreen = () => (
  <View style={styles.splashContainer}>
    <Image source={require("./assets/logoWhite.png")} style={styles.logo} />
  </View>
);

// Defined outside App so it is not recreated on every render.
const TAB_ICONS = { Tasks: "tasks", Calendar: "calendar", Profile: "user" };

function TabNavigator({ userData, onLogoutSuccess, onProfileUpdate }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Icon name={TAB_ICONS[route.name] ?? "circle"} size={size} color={color} />
        ),
        tabBarActiveTintColor: "#451E5D",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: { backgroundColor: "#fff" },
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="Tasks" options={{ headerShown: false }}>
        {(props) => <TasksScreen {...props} userData={userData} />}
      </Tab.Screen>
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Profile" options={{ headerShown: false }}>
        {(props) => (
          <ProfileScreen
            {...props}
            onLogoutSuccess={onLogoutSuccess}
            onProfileUpdate={onProfileUpdate}
            userData={userData}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    const start = Date.now();

    async function checkAuthStatus() {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        try {
          const userResponse = await api.get("/profile");
          setUserData(userResponse.data);
          setIsLoggedIn(true);
        } catch (error) {
          console.error("Failed to fetch user data.", error);
          await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    }

    async function initApp() {
      // Fire update check in the background — never blocks or delays startup.
      // Resolves during the splash window on a normal connection; if slower,
      // the modal simply appears shortly after the app loads.
      checkForUpdate()
        .then((info) => { if (info) setUpdateInfo(info); })
        .catch(() => {});

      await checkAuthStatus();
      // Keep splash visible for at least MIN_SPLASH_MS, but no longer.
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setIsLoading(false);
    }

    initApp();
  }, []);

  const handleLoginSuccess = (user) => {
    setIsLoggedIn(true);
    setUserData(user);
  };

  const handleLogoutSuccess = useCallback(() => {
    setIsLoggedIn(false);
    setUserData(null);
  }, []);

  // Register the logout callback with the Axios response interceptor so that
  // any mid-session 401 (expired token) immediately triggers a clean logout
  // without requiring an app restart.
  useEffect(() => {
    registerLogoutCallback(handleLogoutSuccess);
  }, [handleLogoutSuccess]);

  const handleProfileUpdate = (updatedUser) => {
    setUserData(updatedUser);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  const headerOptions = (title) => ({
    title,
    headerStyle: { backgroundColor: "#451E5D" },
    headerTitleStyle: { color: "#fff" },
    headerTintColor: "#fff",
  });

  return (
    <>
      <NavigationContainer linking={linking}>
        <StatusBar backgroundColor="#451E5D" />
        <Stack.Navigator initialRouteName={isLoggedIn ? "Main" : "Welcome"}>
          {!isLoggedIn && (
            <>
              <Stack.Screen
                name="Welcome"
                component={WelcomeScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Login" options={{ headerShown: false }}>
                {(props) => (
                  <LoginScreen {...props} onLoginSuccess={handleLoginSuccess} />
                )}
              </Stack.Screen>
              <Stack.Screen name="Register" options={{ headerShown: false }}>
                {(props) => (
                  <RegisterScreen
                    {...props}
                    onRegisterSuccess={handleLoginSuccess}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="ForgotPassword"
                component={ForgotPasswordScreen}
                options={{ headerShown: false }}
              />
            </>
          )}
          {isLoggedIn && (
            <>
              <Stack.Screen name="Main" options={{ headerShown: false }}>
                {() => (
                  <TabNavigator
                    userData={userData}
                    onLogoutSuccess={handleLogoutSuccess}
                    onProfileUpdate={handleProfileUpdate}
                  />
                )}
              </Stack.Screen>
              <Stack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
                options={headerOptions("Create Task")}
              />
              <Stack.Screen
                name="EditTask"
                component={EditTaskScreen}
                options={headerOptions("Edit Task")}
              />
              <Stack.Screen
                name="TaskDetails"
                component={TaskDetailsScreen}
                options={headerOptions("Task Details")}
              />
              <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={headerOptions("Change Password")}
              />
              <Stack.Screen
                name="EditProfile"
                options={headerOptions("Edit Profile")}
              >
                {(props) => (
                  <EditProfileScreen
                    {...props}
                    onProfileUpdate={handleProfileUpdate}
                  />
                )}
              </Stack.Screen>
            </>
          )}
          {/* Always registered so deep links work regardless of auth state */}
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <UpdateModal
        visible={updateInfo !== null}
        info={updateInfo}
        onUpdate={() => {
          Linking.openURL(updateInfo.downloadUrl);
          setUpdateInfo(null);
        }}
        onLater={() => setUpdateInfo(null)}
      />
      <Toast ref={toastRef} />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#451E5D",
  },
  logo: {
    width: 150,
    height: 200,
  },
});
