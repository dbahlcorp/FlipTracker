import React from 'react';
import { TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import DashboardScreen from './src/screens/DashboardScreen';
import MyFlipsScreen from './src/screens/MyFlipsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AddFlipScreen from './src/screens/AddFlipScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 16, padding: 4 }}>
      <Ionicons
        name={theme.isDark ? 'sunny-outline' : 'moon-outline'}
        size={22}
        color={theme.headerText}
      />
    </TouchableOpacity>
  );
}

function FlipsStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.header },
        headerTintColor: theme.headerText,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="MyFlipsList" component={MyFlipsScreen} options={{ title: 'My Flips' }} />
      <Stack.Screen
        name="AddFlip"
        component={AddFlipScreen}
        options={{ title: 'Add Flip', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  return (
    <NavigationContainer>
      <StatusBar style={theme.statusBar} />
      <Tab.Navigator
        sceneContainerStyle={{ backgroundColor: theme.bg }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Dashboard: focused ? 'grid' : 'grid-outline',
              Flips: focused ? 'albums' : 'albums-outline',
              Analytics: focused ? 'bar-chart' : 'bar-chart-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#22c55e',
          tabBarInactiveTintColor: theme.textFaint,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopWidth: 1,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          headerRight: () => <ThemeToggle />,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="Flips" component={FlipsStack} options={{ headerShown: false, title: 'My Flips' }} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
