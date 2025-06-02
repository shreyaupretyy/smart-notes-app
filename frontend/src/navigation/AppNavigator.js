// src/navigation/AppNavigator.js - Fix back navigation for edit mode
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import NotesListScreen from '../screens/NotesListScreen';
import CreateNoteScreen from '../screens/CreateNoteScreen';
import NoteDetailScreen from '../screens/NoteDetailScreen';
import AIFeaturesScreen from '../screens/AIFeaturesScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ✅ Custom back button that goes to Notes List
const CustomBackButton = ({ navigation }) => {
  return (
    <IconButton
      icon="arrow-left"
      size={24}
      onPress={() => navigation.navigate('NotesList')}
    />
  );
};

// ✅ Custom back button for Edit Note that goes to Note Detail
const EditNoteBackButton = ({ navigation, noteId }) => {
  return (
    <IconButton
      icon="arrow-left"
      size={24}
      onPress={() => navigation.navigate('NoteDetail', { noteId })}
    />
  );
};

// Notes Stack Navigator
function NotesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="NotesList" 
        component={NotesListScreen}
        options={{ 
          title: 'Smart Notes',
          headerLeft: null // ✅ Remove back button from home screen
        }}
      />
      <Stack.Screen 
        name="CreateNote" 
        component={CreateNoteScreen}
        options={({ navigation, route }) => {
          // ✅ Check if we're editing a note
          const noteToEdit = route.params?.noteToEdit;
          const isEditing = !!noteToEdit;
          
          return {
            title: isEditing ? 'Edit Note' : 'New Note',
            headerLeft: () => {
              if (isEditing) {
                // ✅ If editing, go back to note detail
                return <EditNoteBackButton navigation={navigation} noteId={noteToEdit.id} />;
              } else {
                // ✅ If creating new note, go to notes list
                return <CustomBackButton navigation={navigation} />;
              }
            }
          };
        }}
      />
      <Stack.Screen 
        name="NoteDetail" 
        component={NoteDetailScreen}
        options={({ navigation }) => ({
          title: 'Note Details',
          headerLeft: () => <CustomBackButton navigation={navigation} /> // ✅ Always go to notes list
        })}
      />
    </Stack.Navigator>
  );
}

// AI Features Stack Navigator
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
        options={({ navigation }) => ({
          title: 'New Note',
          headerLeft: () => <CustomBackButton navigation={navigation} />
        })}
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
          component={AIFeaturesStack}
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