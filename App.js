import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import MaterialsScreen from './src/screens/MaterialsScreen';
import AddMaterialScreen from './src/screens/AddMaterialScreen';
import EditMaterialScreen from './src/screens/EditMaterialScreen';
import OnboardingScreen from './src/components/OnboardingScreen';

const ONBOARDING_KEY = '@kerf_onboarding_complete_v1';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const TAB_ITEM_WIDTH = 82;

function ScrollableTabBar({ state, descriptors, navigation, theme }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const scrollRef = useRef(null);

  useEffect(() => {
    const selectedTabCenter = state.index * TAB_ITEM_WIDTH + TAB_ITEM_WIDTH / 2;
    const scrollX = Math.max(0, selectedTabCenter - screenWidth / 2);
    scrollRef.current?.scrollTo({ x: scrollX, animated: true });
  }, [screenWidth, state.index]);

  return (
    <View
      style={{
        backgroundColor: theme.tabBar,
        paddingBottom: Math.max(insets.bottom, 8),
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: Math.max(insets.left, insets.right, 8),
          paddingTop: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const color = focused ? theme.brand : theme.textFaint;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={{
                width: TAB_ITEM_WIDTH,
                minHeight: 50,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {options.tabBarIcon?.({ focused, color, size: 26 })}
              <Text
                numberOfLines={1}
                allowFontScaling
                style={{
                  color,
                  fontSize: 9,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
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

function MaterialsStack() {
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
        name="MaterialsList"
        component={MaterialsScreen}
        options={{ title: 'Materials' }}
      />
      <Stack.Screen
        name="AddMaterial"
        component={AddMaterialScreen}
        options={{ title: 'Add Material', presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditMaterial"
        component={EditMaterialScreen}
        options={{ title: 'Edit Material', presentation: 'modal' }}
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
        tabBar={(props) => <ScrollableTabBar {...props} theme={theme} />}
        sceneContainerStyle={{ backgroundColor: theme.bg }}
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Dashboard: focused ? 'grid' : 'grid-outline',
              Flips: focused ? 'albums' : 'albums-outline',
              Analytics: focused ? 'bar-chart' : 'bar-chart-outline',
              Materials: focused ? 'layers' : 'layers-outline',
              Calendar: focused ? 'calendar' : 'calendar-outline',
              Settings: focused ? 'settings' : 'settings-outline',
            };
            return <Ionicons name={icons[route.name]} size={26} color={color} />;
          },
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
        <Tab.Screen name="Flips" component={FlipsStack} options={{ headerShown: false, title: 'My Jobs' }} />
        <Tab.Screen name="Materials" component={MaterialsStack} options={{ headerShown: false, title: 'Materials' }} />
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
