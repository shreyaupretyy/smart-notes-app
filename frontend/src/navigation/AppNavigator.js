// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import NotesListScreen from '../screens/NotesListScreen';
import CreateNoteScreen from '../screens/CreateNoteScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import AIFeaturesScreen from '../screens/AIFeaturesScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Notes Stack Navigator
function NotesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="NotesList" 
        component={NotesListScreen}
        options={{ title: 'Smart Notes' }}
      />
      <Stack.Screen 
        name="CreateNote" 
        component={CreateNoteScreen}
        options={{ title: 'New Note' }}
      />
      <Stack.Screen 
        name="NoteDetail" 
        component={NoteDetailScreen}
        options={{ title: 'Note Details' }}
      />
    </Stack.Navigator>
  );
}

// AI Features Stack Navigator (add CreateNote here too)
function AIFeaturesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="AIFeaturesList" 
        component={AIFeaturesScreen}
        options={{ title: 'AI Tools' }}
      />
      <Stack.Screen 
        name="CreateNote" 
        component={CreateNoteScreen}
        options={{ title: 'New Note' }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            if (route.name === 'Notes') {
              iconName = 'note';
            } else if (route.name === 'AI Features') {
              iconName = 'psychology';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            }
            
            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen 
          name="Notes" 
          component={NotesStack}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="AI Features" 
          component={AIFeaturesStack}  // ✅ Changed to stack
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}