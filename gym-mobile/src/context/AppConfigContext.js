// src/context/AppConfigContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppConfigContext = createContext();

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error('useAppConfig debe ser usado dentro de AppConfigProvider');
  }
  return context;
};

export const AppConfigProvider = ({ children }) => {
  const [appName, setAppName] = useState('Mi Gimnasio');
  const [adminProfile, setAdminProfile] = useState({
    name: 'Administrador',
    email: 'admin@gimnasio.com',
    phone: '',
    gymName: 'Mi Gimnasio',
    gymAddress: '',
    gymPhone: '',
  });

  // Cargar configuraciones al iniciar
  useEffect(() => {
    loadAppConfig();
  }, []);

  const loadAppConfig = async () => {
    try {
      // Cargar nombre de la app
      const savedAppName = await AsyncStorage.getItem('app_name');
      if (savedAppName) {
        setAppName(savedAppName);
      }

      // Cargar perfil del admin
      const savedProfile = await AsyncStorage.getItem('admin_profile');
      if (savedProfile) {
        setAdminProfile(JSON.parse(savedProfile));
      }
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  };

  const updateAppName = async (newName) => {
    try {
      await AsyncStorage.setItem('app_name', newName);
      setAppName(newName);
      
      // También actualizar el nombre del gimnasio en el perfil
      const updatedProfile = { ...adminProfile, gymName: newName };
      await updateAdminProfile(updatedProfile);
      
      return true;
    } catch (error) {
      console.error('Error guardando nombre de la app:', error);
      return false;
    }
  };

  const updateAdminProfile = async (profileData) => {
    try {
      await AsyncStorage.setItem('admin_profile', JSON.stringify(profileData));
      setAdminProfile(profileData);
      return true;
    } catch (error) {
      console.error('Error guardando perfil:', error);
      return false;
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      // Aquí integrarías con tu sistema de autenticación
      await AsyncStorage.setItem('admin_password_hash', newPassword); // En producción usar hash
      return true;
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      return false;
    }
  };

  const resetAppConfig = async () => {
    try {
      await AsyncStorage.removeItem('app_name');
      await AsyncStorage.removeItem('admin_profile');
      setAppName('Mi Gimnasio');
      setAdminProfile({
        name: 'Administrador',
        email: 'admin@gimnasio.com',
        phone: '',
        gymName: 'Mi Gimnasio',
        gymAddress: '',
        gymPhone: '',
      });
      return true;
    } catch (error) {
      console.error('Error reseteando configuraciones:', error);
      return false;
    }
  };

  const value = {
    appName,
    adminProfile,
    updateAppName,
    updateAdminProfile,
    updatePassword,
    resetAppConfig,
  };

  return (
    <AppConfigContext.Provider value={value}>
      {children}
    </AppConfigContext.Provider>
  );
};