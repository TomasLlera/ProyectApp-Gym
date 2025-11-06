// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { theme } from '../constants/theme';


// Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ClientsScreen from '../screens/Clients/ClientsScreen';
import ClientDetailScreen from '../screens/Clients/ClientDetailScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import StatisticsScreen from '../screens/Profile/StatisticsScreen';
import RoutinesScreen from '../screens/Routines/RoutinesScreen';
import RoutineDetailScreen from '../screens/Routines/RoutineDetailScreen';
import RoutineTemplatesScreen from '../screens/Routines/RoutineTemplatesScreen';
import CreateRoutineScreen from '../screens/Routines/CreateRoutineScreen';
import CreateTemplateScreen from '../screens/Routines/CreateTemplateScreen';
import GroupDetailScreen from '../screens/Routines/GroupDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ icon }) {
  return <Text style={{ fontSize: 24 }}>{icon}</Text>;
}

function TabNavigator() {
  const { appName } = useAppConfig();
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.white,
        },
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.white,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: `💪 O2 Gym`,
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon icon="📊" />,
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientsScreen}
        options={{
          title: '👥 Clientes',
          tabBarLabel: 'Clientes',
          tabBarIcon: ({ color }) => <TabIcon icon="👥" />,
        }}
      />
      <Tab.Screen
        name="Rutinas"
        component={RoutinesStack}
        options={{
          tabBarLabel: 'Rutinas',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>🏋️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          title: '⚙️ Configuración',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <TabIcon icon="⚙️" />,
        }}
      />
    </Tab.Navigator>
  );
}

// Stack de Rutinas
function RoutinesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RoutinesList" component={RoutinesScreen} />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{
          headerShown: true,
          headerTitle: 'Detalle de Rutina',
          headerStyle: { backgroundColor: theme.colors.white },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="RoutineTemplates"
        component={RoutineTemplatesScreen}
      />
      <Stack.Screen
        name="CreateTemplate"
        component={CreateTemplateScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateRoutine"
        component={CreateRoutineScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <NavigationContainer
      onReady={async () => {
        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setVisibilityAsync("hidden");
          } catch (error) {
            console.log('⚠️ Error configurando navegación en NavigationContainer:', error);
          }
        }
      }}
    >
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={TabNavigator}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={{
                headerShown: true,
                title: 'Detalle del Cliente',
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTintColor: theme.colors.white,
                headerBackTitle: 'Volver',
              }}
            />
            <Stack.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}