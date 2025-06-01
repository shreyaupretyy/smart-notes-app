// App.js
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';
import { apiService } from './src/services/api';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        const connected = await apiService.initialize();
        
        if (!connected) {
          setConnectionError(true);
          setErrorMessage('Could not connect to backend server');
        } else {
          console.log('✅ App initialized successfully');
        }
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setConnectionError(true);
        setErrorMessage(error.message);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 16, fontSize: 16 }}>Connecting to Smart Notes API...</Text>
          <Text style={{ marginTop: 8, color: '#666' }}>Setting up AI services</Text>
        </View>
      </PaperProvider>
    );
  }

  if (connectionError) {
    return (
      <PaperProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 16, color: '#d32f2f' }}>
            ❌ Unable to connect to backend
          </Text>
          <Text style={{ textAlign: 'center', color: '#666', marginBottom: 16 }}>
            {errorMessage}
          </Text>
          <Text style={{ textAlign: 'center', color: '#666', fontSize: 12 }}>
            Make sure your backend is running at the configured address
          </Text>
        </View>
      </PaperProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </PaperProvider>
    </QueryClientProvider>
  );
}
