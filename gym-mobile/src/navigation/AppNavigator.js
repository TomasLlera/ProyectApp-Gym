// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';


// Screens
import LoginScreen from '../screens/Auth/LoginScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ClientsScreen from '../screens/Clients/ClientsScreen';
import ClientDetailScreen from '../screens/Clients/ClientDetailScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          backgroundColor: '#fff',
        },
        headerStyle: {
          backgroundColor: '#4F46E5',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: '🏋️ Mi Gimnasio',
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
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#1F2937',
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
    <NavigationContainer>
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
                headerStyle: { backgroundColor: '#4F46E5' },
                headerTintColor: '#fff',
                headerBackTitle: 'Volver',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}