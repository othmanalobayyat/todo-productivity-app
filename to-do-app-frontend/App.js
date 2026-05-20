import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Text,
  View,
  StyleSheet,
  StatusBar,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import NetInfo from "@react-native-community/netinfo";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import api, { registerLogoutCallback } from "./src/services/api";
import { AUTH_TOKEN_KEY, USER_PROFILE_KEY } from "./src/constants/storage";
import { checkForUpdate } from "./src/services/updateService";
import UpdateModal from "./src/components/UpdateModal";
import IosInstallSheet from "./src/components/IosInstallSheet";
import { useIosInstallPrompt } from "./src/hooks/useIosInstallPrompt";

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
import Toast, { toastRef, showToast } from "./src/components/Toast";
import { drainQueue, loadQueue, clearQueue } from "./src/services/writeQueue";
import {
  loadCachedTasks,
  saveTasks,
  fetchAndCacheTasks,
} from "./src/services/taskCache";
import { triggerTaskRefresh } from "./src/services/taskEvents";

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

// ─── DEBUG OVERLAY ────────────────────────────────────────────────────────────
// Floating readout of safe-area insets and computed tab bar dimensions.
// pointerEvents="none" so it never blocks taps. REMOVE before shipping.
function DebugInsetsOverlay() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 49 + insets.bottom + 4;
  const conditionActive = Platform.OS === "web" && insets.bottom > 0;
  return (
    <View pointerEvents="none" style={debugStyles.overlay}>
      <Text style={debugStyles.text}>
        {[
          `[DEBUG] platform=${Platform.OS}`,
          `insets  T=${insets.top} B=${insets.bottom} L=${insets.left} R=${insets.right}`,
          `tabBar  height=${tabBarHeight}  paddingBottom=${insets.bottom}`,
          `webCondition=${conditionActive}`,
        ].join("\n")}
      </Text>
    </View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function TabNavigator({ userData, onLogoutSuccess, onProfileUpdate }) {
  const insets = useSafeAreaInsets();

  // DEBUG: tab bar painted semi-transparent red so its exact bounds are visible.
  // The top red border shows where the tab bar begins; the bottom of the red
  // area shows where it ends (should touch the physical screen bottom on iOS PWA).
  const webTabBarStyle =
    Platform.OS === "web" && insets.bottom > 0
      ? {
          backgroundColor: "rgba(255,0,0,0.15)",
          borderTopWidth: 2,
          borderTopColor: "red",
          height: 49 + insets.bottom + 4,
          paddingBottom: insets.bottom,
        }
      : {
          backgroundColor: "rgba(0,0,255,0.15)",
          borderTopWidth: 2,
          borderTopColor: "blue",
        };

  return (
    // DEBUG: sceneContainerStyle=lime so each tab screen's container is visible.
    // If lime bleeds outside the screen area you'll see it behind the tab bar.
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: "rgba(0,200,0,0.25)" }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Icon
            name={TAB_ICONS[route.name] ?? "circle"}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: "#451E5D",
        tabBarInactiveTintColor: "gray",
        tabBarStyle: webTabBarStyle,
        tabBarLabelStyle: { fontSize: 12 },
      })}
    >
      <Tab.Screen name="Tasks" options={{ headerShown: false }}>
        {(props) => <TasksScreen {...props} userData={userData} />}
      </Tab.Screen>
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
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

// Compact overlay shown at the top of the screen when the device has no network.
// pointerEvents="none" so it never intercepts taps on content beneath it.
function OfflineBanner({ visible }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View
      pointerEvents="none"
      style={[styles.offlineBanner, { paddingTop: insets.top + 6 }]}
    >
      <Text style={styles.offlineBannerText}>No internet connection</Text>
    </View>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const { shouldShow: showInstallSheet, dismiss: dismissInstallSheet } =
    useIosInstallPrompt();

  // Subscribe to network state changes.
  // Tracks the previous connection value so we can detect the offline→online
  // transition and drain any queued offline writes.
  const wasConnected = useRef(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isConnected = !!state.isConnected;
      setIsOffline(!isConnected);

      if (wasConnected.current === false && isConnected) {
        // Just came back online — drain the write queue if it has anything.
        const queue = await loadQueue();
        if (queue.length > 0) {
          showToast("Syncing offline changes...", "success");

          const { success } = await drainQueue(async (op, result) => {
            // For offline creates: replace the local placeholder in the cache
            // with the real server task before the full refresh fires.
            if (op.type === "create" && result?.serverTask) {
              const cached = await loadCachedTasks();
              if (cached) {
                await saveTasks(
                  cached.map((t) =>
                    t.id === result.localId ? { ...result.serverTask } : t,
                  ),
                );
              }
            }
          });

          // Fetch a clean server snapshot regardless of drain outcome.
          try {
            await fetchAndCacheTasks();
          } catch {}

          // Tell TasksScreen to re-render with the refreshed data.
          triggerTaskRefresh();

          if (success) {
            showToast("Offline changes synced", "success");
          } else {
            showToast("Some changes could not be synced");
          }
        }
      }

      wasConnected.current = isConnected;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const start = Date.now();

    // Called when a cached profile exists and the app is already showing.
    // Verifies the token silently; on 401 the api.js interceptor forces logout.
    // Network/server errors are ignored so the cached session stays alive.
    function verifyTokenBackground() {
      api
        .get("/profile")
        .then(async (response) => {
          setUserData(response.data);
          await AsyncStorage.setItem(
            USER_PROFILE_KEY,
            JSON.stringify(response.data),
          );
        })
        .catch(() => {
          // 401 → handled by the api.js response interceptor (calls handleLogoutSuccess).
          // Network error → keep the cached session alive; do nothing here.
        });
    }

    // Called when there is no cached profile. Waits for the server before
    // deciding whether the user is logged in. Any failure shows the login screen;
    // the api.js interceptor removes the token on 401.
    async function verifyTokenBlocking() {
      try {
        const response = await api.get("/profile");
        setUserData(response.data);
        setIsLoggedIn(true);
        await AsyncStorage.setItem(
          USER_PROFILE_KEY,
          JSON.stringify(response.data),
        );
      } catch {
        setIsLoggedIn(false);
      }
    }

    async function checkAuthStatus() {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      // Try to restore the session from the local cache for an instant startup.
      let hasCachedProfile = false;
      try {
        const cached = await AsyncStorage.getItem(USER_PROFILE_KEY);
        if (cached) {
          const user = JSON.parse(cached);
          setUserData(user);
          setIsLoggedIn(true);
          hasCachedProfile = true;
        }
      } catch {
        // Corrupt cache — fall through to the blocking network path.
      }

      if (hasCachedProfile) {
        // User sees the app immediately; token is verified in the background.
        verifyTokenBackground();
      } else {
        // No cache — must confirm the token over the network first.
        await verifyTokenBlocking();
      }
    }

    async function initApp() {
      // Update checks are only meaningful on the Android APK — "Update Now"
      // opens an APK download URL, which is useless on web or iOS native.
      // iOS native updates come from the App Store, not a download link.
      if (Platform.OS === "android") {
        checkForUpdate()
          .then((info) => {
            if (info) setUpdateInfo(info);
          })
          .catch(() => {});
      }

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
    // Cache the profile so future startups don't need to block on the network.
    AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(user)).catch(
      () => {},
    );
  };

  // Called on both manual logout (from ProfileScreen) and automatic 401 logout
  // (from the api.js interceptor). Clears the profile cache and any pending
  // offline operations that belong to this session.
  const handleLogoutSuccess = useCallback(async () => {
    await AsyncStorage.removeItem(USER_PROFILE_KEY).catch(() => {});
    await clearQueue();
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
    // Keep the cache in sync when the user edits their name or email.
    AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedUser)).catch(
      () => {},
    );
  };

  const headerOptions = (title) => ({
    title,
    headerStyle: { backgroundColor: "#451E5D" },
    headerTitleStyle: { color: "#fff" },
    headerTintColor: "#fff",
  });

  return (
    // DEBUG: outer View with chartreuse border traces SafeAreaProvider's bounds.
    <View style={debugStyles.safeAreaProviderWrap}>
    <SafeAreaProvider>
      {isLoading ? (
        <SplashScreen />
      ) : (
        <>
          <NavigationContainer
            linking={linking}
            documentTitle={{
              // On web, React Navigation defaults to route.name ("Tasks",
              // "Calendar", etc.) for screens with no explicit title option.
              // Safari reads document.title for the Share Sheet and the
              // "Add to Home Screen" label — so without this override the
              // share sheet shows "Tasks" instead of "Orvia".
              // Screens that have an explicit title (Change Password, Edit
              // Task, etc.) still show their own title in the browser tab.
              formatter: (options, route) => options?.title ?? "ToDo",
            }}
          >
            <StatusBar backgroundColor="#451E5D" />
            {/* DEBUG: cyan tint on Stack scene container. */}
            <Stack.Navigator
              sceneContainerStyle={{ backgroundColor: "rgba(0,200,255,0.2)" }}
              initialRouteName={isLoggedIn ? "Main" : "Welcome"}>
              {!isLoggedIn && (
                <>
                  <Stack.Screen
                    name="Welcome"
                    component={WelcomeScreen}
                    options={{ headerShown: false }}
                  />
                  <Stack.Screen name="Login" options={{ headerShown: false }}>
                    {(props) => (
                      <LoginScreen
                        {...props}
                        onLoginSuccess={handleLoginSuccess}
                      />
                    )}
                  </Stack.Screen>
                  <Stack.Screen
                    name="Register"
                    options={{ headerShown: false }}
                  >
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
          <IosInstallSheet
            visible={showInstallSheet}
            onDismiss={dismissInstallSheet}
          />
          <Toast ref={toastRef} />
          <OfflineBanner visible={isOffline} />
          {/* DEBUG: floating inset/height readout — remove before shipping */}
          <DebugInsetsOverlay />
        </>
      )}
    </SafeAreaProvider>
    </View>
  );
}

// ─── DEBUG STYLES (remove before shipping) ────────────────────────────────────
const debugStyles = StyleSheet.create({
  safeAreaProviderWrap: {
    flex: 1,
    borderWidth: 3,
    borderColor: "chartreuse",
  },
  overlay: {
    position: "absolute",
    // Sit just above the tab bar area so the label doesn't overlap the icons.
    // Adjust this value if the readout overlaps something important.
    bottom: 100,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 6,
    padding: 6,
    zIndex: 99999,
    elevation: 99,
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontFamily: Platform.OS === "web" ? "monospace" : "Courier",
    lineHeight: 16,
  },
});
// ─────────────────────────────────────────────────────────────────────────────

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
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#2d2d2d",
    alignItems: "center",
    paddingBottom: 10,
    zIndex: 9998,
    elevation: 9,
  },
  offlineBannerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
