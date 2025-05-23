import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import CreateNoteScreen from './src/screens/CreateNoteScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';

// Context
import { NotesProvider } from './src/contexts/NotesContext';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NotesProvider>
          <NavigationContainer>
            <Stack.Navigator 
              initialRouteName="Home"
              screenOptions={{ headerShown: false }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="CreateNote" component={CreateNoteScreen} />
              <Stack.Screen name="NoteDetail" component={NoteDetailScreen} />
            </Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="auto" />
        </NotesProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}