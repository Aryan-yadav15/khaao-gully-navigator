import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { checkAPIHealth } from './src/api/client';

export default function App() {
  useEffect(() => {
    // Check API connection on app start
    checkAPIHealth();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
