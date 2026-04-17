import React, { useEffect, useState } from 'react';
import { Image, View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/FontAwesome';
import api from './src/services/api';
import {getToken} from './auth';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TasksScreen from './src/screens/TasksScreen';
import CreateTaskScreen from './src/screens/CreateTaskScreen';
import EditTaskScreen from './src/screens/EditTaskScreen';
import TaskDetailsScreen from './src/screens/TaskDetailsScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import Toast, { toastRef } from './src/components/Toast';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const SplashScreen = () => {
  return (
    <View style={styles.splashContainer}>
      <Image source={require('./assets/logoWhite.png')} style={styles.logo} />
    </View>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Added for splash screen delay

  useEffect(() => {
    setTimeout(async () => {
      async function checkAuthStatus() {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          try {
            const userResponse = await api.get('/profile');
            setUserData(userResponse.data);
            setIsLoggedIn(true);
          } catch (error) {
            console.error('Failed to fetch user data.', error);
            setIsLoggedIn(false);
          }
        } else {
          setIsLoggedIn(false);
        }
      }
      await checkAuthStatus();
      setIsLoading(false);
    }, 3000); // Splash screen delay
  }, []);

const handleLoginSuccess = async (userData) => {
    const token = await getToken();
    if (token) {
      setIsLoggedIn(true);
      setUserData(userData);
    }
  };

  const handleLogoutSuccess = () => {
    setIsLoggedIn(false);
    setUserData(null);
  };

  function TabNavigator() {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Tasks') {
              iconName = 'tasks';
            } else if (route.name === 'Profile') {
              iconName = 'user';
            }

            // Return the icon component
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#451E5D', // Active icon color
          tabBarInactiveTintColor: 'gray', // Inactive icon color
          tabBarStyle: {
            backgroundColor: '#fff', // Tab bar background color
          },
          tabBarLabelStyle: {
            fontSize: 12,
          },
        })}>
        <Tab.Screen
          name="Tasks"
          options={{ headerShown: false }}
        >
        {(props) => (<TasksScreen {...props} userData={userData}/>)}
        </Tab.Screen>
        <Tab.Screen
          name="Profile"
          options={{ headerShown: false }}
        >
        {(props) => (<ProfileScreen {...props} onLogoutSuccess={handleLogoutSuccess} userData={userData}/>)}
        </Tab.Screen>
      </Tab.Navigator>
    );
  }

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <>
    <NavigationContainer>
      <StatusBar backgroundColor="#451E5D" />
      <Stack.Navigator initialRouteName={isLoggedIn ? 'Main' : 'Welcome'}>
        {!isLoggedIn ? (
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
          </>
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
              options={{
                title: 'Create Task', // Set the title of the screen
                headerStyle: { backgroundColor: '#451E5D' }, // Set the background color of the header
                headerTitleStyle: { color: '#fff' }, // Set the text color of the title
                headerTintColor: '#fff', // Set the color of the back button and other header icons
              }}
            />
            <Stack.Screen
              name="EditTask"
              component={EditTaskScreen}
              options={{
                title: 'Edit Task', // Set the title of the screen
                headerStyle: { backgroundColor: '#451E5D' }, // Set the background color of the header
                headerTitleStyle: { color: '#fff' }, // Set the text color of the title
                headerTintColor: '#fff', // Set the color of the back button and other header icons
              }}
            />
            <Stack.Screen
              name="TaskDetails"
              component={TaskDetailsScreen}
              options={{
                title: 'Task Details', // Set the title of the screen
                headerStyle: { backgroundColor: '#451E5D' }, // Set the background color of the header
                headerTitleStyle: { color: '#fff' }, // Set the text color of the title
                headerTintColor: '#fff', // Set the color of the back button and other header icons
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
      <Toast ref={toastRef} />
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#451E5D',
  },
  logo: {
    width: 150,
    height: 200,
  },
});
