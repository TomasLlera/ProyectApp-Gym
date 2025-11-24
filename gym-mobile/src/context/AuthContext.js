// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Usuario por defecto - sin necesidad de login
  const [user, setUser] = useState({ 
    id: 'default-user',
    email: 'admin@o2gym.com',
    name: 'Administrador'
  });
  const [loading, setLoading] = useState(false);

  // Ya no necesitamos verificar token ni login
  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // Función mantenida por compatibilidad pero no hace nada
    return { success: true };
  };

  const logout = async () => {
    // Función mantenida por compatibilidad pero no hace nada
    // El usuario siempre estará autenticado
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};