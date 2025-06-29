'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { services } from '../services';
import { getConfig, AppConfig } from '../config';

// Define the context shape
interface AppContextValue {
  config: AppConfig;
  services: typeof services;
}

// Create the context
const AppContext = createContext<AppContextValue | undefined>(undefined);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const config = getConfig();

  const value: AppContextValue = {
    config,
    services,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Custom hook to use the app context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Specific hooks for common use cases
export function useAppConfig() {
  const { config } = useApp();
  return config;
}

export function useServices() {
  const { services } = useApp();
  return services;
}

// Export types
export type { AppContextValue };