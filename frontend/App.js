import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { NoteProvider } from './src/contexts/NoteContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible until the app is ready
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  React.useEffect(() => {
    async function prepare() {
      try {
        // Perform any pre-loading tasks here
        // For example: load fonts, initialize storage, etc.
        
        // Artificial delay to show splash screen
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NoteProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </NoteProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}