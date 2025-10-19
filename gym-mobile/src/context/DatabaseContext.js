// src/context/DatabaseContext.js

import React, { createContext, useContext } from 'react';
import { clientService } from '../database/clientService';
import { routineService } from '../database/routineService';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const value = {
    clients: clientService,
    routines: routineService,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase debe usarse dentro de DatabaseProvider');
  }
  return context;
};