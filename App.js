import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { CurrencyProvider } from './src/context/CurrencyContext';
import { RatesProvider } from './src/context/RatesContext';
import DashboardScreen from './src/screens/DashboardScreen';
import MyFlipsScreen from './src/screens/MyFlipsScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import AddFlipScreen from './src/screens/AddFlipScreen';
import EditFlipScreen from './src/screens/EditFlipScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TemplatesScreen from './src/screens/TemplatesScreen';
import AddTemplateScreen from './src/screens/AddTemplateScreen';
import EditTemplateScreen from './src/screens/EditTemplateScreen';
import OnboardingScreen from './src/components/OnboardingScreen';

const ONBOARDING_KEY = '@kerf_onboarding_complete_v1';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
      <Stack.Screen
        name="MyFlipsList"
        component={MyFlipsScreen}
        options={({ navigation }) => ({
          title: 'My Jobs',
          headerRight: () => (
            <TouchableOpacity onPress={() => navigation.navigate('Templates')}>
              <Text style={{ color: theme.headerText, fontSize: 15, fontWeight: '600' }}>Templates</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="AddFlip"
        component={AddFlipScreen}
        options={{ title: 'Add Job', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditFlip"
        component={EditFlipScreen}
        options={{ title: 'Edit Job', presentation: 'modal' }}
      />
      <Stack.Screen name="Templates" component={TemplatesScreen} options={{ title: 'Templates' }} />
      <Stack.Screen
        name="AddTemplate"
        component={AddTemplateScreen}
        options={{ title: 'New Template', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditTemplate"
        component={EditTemplateScreen}
        options={{ title: 'Edit Template', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { theme } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => setShowOnboarding(value !== 'true'));
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  return (
    <>
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
              Calendar: focused ? 'calendar' : 'calendar-outline',
              Settings: focused ? 'settings' : 'settings-outline',
            };
            return <Ionicons name={icons[route.name]} size={26} color={color} />;
          },
          tabBarActiveTintColor: theme.brand,
          tabBarInactiveTintColor: theme.textFaint,
          tabBarAllowFontScaling: true,
          tabBarStyle: {
            backgroundColor: theme.tabBar,
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingBottom: 10,
            paddingTop: 8,
            height: 68,
          },
          tabBarItemStyle: {
            paddingHorizontal: 0,
          },
          tabBarLabelStyle: {
            fontSize: 9,
            fontWeight: '700',
            textTransform: 'uppercase',
            marginTop: 2,
          },
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="Flips" component={FlipsStack} options={{ headerShown: false, title: 'My Jobs' }} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
        <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
    <OnboardingScreen visible={showOnboarding} onComplete={completeOnboarding} />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <RatesProvider>
          <AppNavigator />
        </RatesProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
