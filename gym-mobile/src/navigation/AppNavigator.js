// src/navigation/AppNavigator.js - CON RESET DE NAVEGACIÓN
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as NavigationBar from 'expo-navigation-bar';
import { useAuth } from '../context/AuthContext';
import { useAppConfig } from '../context/AppConfigContext';
import { theme } from '../constants/theme';

// Screens
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import ClientsScreen from '../screens/Clients/ClientsScreen';
import ClientDetailScreen from '../screens/Clients/ClientDetailScreen';
import ImportContactsScreen from '../screens/Clients/ImportContactsScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import StatisticsScreen from '../screens/Profile/StatisticsScreen';
import GoogleCalendarScreen from '../screens/Profile/GoogleCalendarScreen';
import RoutinesScreen from '../screens/Routines/RoutinesScreen';
import RoutineDetailScreen from '../screens/Routines/RoutineDetailScreen';
import RoutineTemplatesScreen from '../screens/Routines/RoutineTemplatesScreen';
import CreateRoutineScreen from '../screens/Routines/CreateRoutineScreen';
import CreateTemplateScreen from '../screens/Routines/CreateTemplateScreen';
import GroupDetailScreen from '../screens/Routines/GroupDetailScreen';
import BibliotecaEjerciciosScreen from '../screens/Exercises/BibliotecaEjerciciosScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

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
          backgroundColor: theme.colors.card,
        },
        headerStyle: {
          backgroundColor: theme.colors.card,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        unmountOnBlur: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Clientes"
        component={ClientsScreen}
        options={{
          title: 'Clientes',
          tabBarLabel: 'Clientes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Rutinas"
        component={RoutinesStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Rutinas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="barbell-outline" size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Rutinas', { screen: 'RoutinesList' });
          },
        })}
      />
      <Tab.Screen
        name="Perfil"
        component={ProfileScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Stack de Rutinas con configuración mejorada
function RoutinesStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        // ✅ Animación más fluida
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="RoutinesList"
        component={RoutinesScreen}
        options={{
          headerShown: true,
          headerTitle: 'Rutinas',
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen
        name="RoutineDetail"
        component={RoutineDetailScreen}
        options={{ headerShown: false }}
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
      <Stack.Screen
        name="BibliotecaEjercicios"
        component={BibliotecaEjerciciosScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
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
            headerStyle: { backgroundColor: theme.colors.card },
            headerTintColor: theme.colors.text.primary,
            headerBackTitle: 'Volver',
          }}
        />
        <Stack.Screen
          name="ImportContacts"
          component={ImportContactsScreen}
          options={{
            headerShown: true,
            title: 'Importar Contactos',
            headerStyle: { backgroundColor: theme.colors.card },
            headerTintColor: theme.colors.text.primary,
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
        <Stack.Screen
          name="GoogleCalendar"
          component={GoogleCalendarScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}