// ════════════════════════════════════════════════════════════════════════════
// ONCOCONNECT MOBILE APP — MAIN APP FILE
// ════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';
// import * as Notifications from 'expo-notifications';
import { useAuthStore } from './store/authStore';
import { useConsultationStore } from './store/consultationStore';

// Import screens
import OnboardingScreen from './screens/OnboardingScreen';
import InviteCodeScreen from './screens/InviteCodeScreen';
import HomeScreen from './screens/HomeScreen';
import PaymentGateScreen from './screens/PaymentGateScreen';
import MedicationScreen from './screens/MedicationScreen';
import SymptomTrackerScreen from './screens/SymptomTrackerScreen';
import MessagingScreen from './screens/MessagingScreen';
import SettingsScreen from './screens/SettingsScreen';

// Color scheme
const COLORS = {
  dark: '#0A1628',
  card: '#0F1E35',
  teal: '#0B8F8F',
  mint: '#0DD6C8',
  text: '#FFFFFF',
  muted: '#7A9EAE',
  red: '#EF4444',
  green: '#22C55E',
  amber: '#F59E0B',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();



// ────────────────────────────────────────────────────────────────────────────
// AUTH STACK — Onboarding flows
// ────────────────────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.dark },
      }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="InviteCode" component={InviteCodeScreen} />
    </Stack.Navigator>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// HOME STACK — Main app with tabs
// ────────────────────────────────────────────────────────────────────────────
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.dark },
      }}
    >
      <Stack.Screen name="HomeTab" component={HomeScreen} />
      <Stack.Screen name="PaymentGate" component={PaymentGateScreen} />
      <Stack.Screen name="Messaging" component={MessagingScreen} />
    </Stack.Navigator>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TAB NAVIGATOR — Bottom tabs
// ────────────────────────────────────────────────────────────────────────────
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.teal,
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.mint,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 5,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Medications"
        component={MedicationScreen}
        options={{
          tabBarLabel: 'Meds',
          tabBarIcon: ({ color }) => <PillIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Symptoms"
        component={SymptomTrackerScreen}
        options={{
          tabBarLabel: 'Symptoms',
          tabBarIcon: ({ color }) => <HealthIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ICON COMPONENTS (Simple SVG-based)
// ────────────────────────────────────────────────────────────────────────────
function HomeIcon({ color }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>🏠</Text>
    </View>
  );
}

function PillIcon({ color }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>💊</Text>
    </View>
  );
}

function HealthIcon({ color }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>❤️</Text>
    </View>
  );
}

function SettingsIcon({ color }) {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>⚙️</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ────────────────────────────────────────────────────────────────────────────
export default function App() {
  const { isAuthenticated, isLoading, init } = useAuthStore();
  const [notificationPermission, setNotificationPermission] = useState(false);

  useEffect(() => {
  init();
}, []);

  // Request notification permissions
  useEffect(() => {
    // Notifications feature disabled for now
    // Uncomment when ready to implement
    // (async () => {
    //   const { status } = await Notifications.requestPermissionsAsync();
    //   setNotificationPermission(status === 'granted');
    // })();
  }, []);

  

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.dark,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={COLORS.mint} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      {isAuthenticated ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}