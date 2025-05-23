import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, List, Switch, Divider, Button, Dialog, Portal, TextInput, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotes } from '../contexts/NoteContext';
import * as FileSystem from 'expo-file-system';
import { formatFileSize } from '../utils/helpers';

const SettingsScreen = () => {
  const { isOnline } = useNotes();
  const [darkTheme, setDarkTheme] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [syncOnStart, setSyncOnStart] = useState(true);
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [resetDialogVisible, setResetDialogVisible] = useState(false);
  const [apiDialogVisible, setApiDialogVisible] = useState(false);
  const [apiUrl, setApiUrl] = useState('https://api.example.com');
  const [confirmReset, setConfirmReset] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    calculateCacheSize();
  }, []);

  // Load settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setDarkTheme(parsedSettings.darkTheme || false);
        setAutoSave(parsedSettings.autoSave !== false); // default to true
        setSyncOnStart(parsedSettings.syncOnStart !== false); // default to true
        setApiUrl(parsedSettings.apiUrl || 'https://api.example.com');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async (key, value) => {
    try {
      const settings = await AsyncStorage.getItem('app_settings');
      const parsedSettings = settings ? JSON.parse(settings) : {};
      
      const updatedSettings = {
        ...parsedSettings,
        [key]: value
      };
      
      await AsyncStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Toggle settings
  const toggleDarkTheme = () => {
    const newValue = !darkTheme;
    setDarkTheme(newValue);
    saveSettings('darkTheme', newValue);
  };

  const toggleAutoSave = () => {
    const newValue = !autoSave;
    setAutoSave(newValue);
    saveSettings('autoSave', newValue);
  };

  const toggleSyncOnStart = () => {
    const newValue = !syncOnStart;
    setSyncOnStart(newValue);
    saveSettings('syncOnStart', newValue);
  };

  // Calculate cache size
  const calculateCacheSize = async () => {
    try {
      const offlineNotesStr = await AsyncStorage.getItem('OFFLINE_NOTES_KEY');
      const offlineQueueStr = await AsyncStorage.getItem('OFFLINE_QUEUE_KEY');
      
      const notesSize = offlineNotesStr ? offlineNotesStr.length : 0;
      const queueSize = offlineQueueStr ? offlineQueueStr.length : 0;
      
      // Approximate size in bytes
      const totalSize = notesSize + queueSize;
      
      setCacheSize(formatFileSize(totalSize));
    } catch (error) {
      console.error('Error calculating cache size:', error);
      setCacheSize('Unknown');
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      await AsyncStorage.removeItem('OFFLINE_NOTES_KEY');
      await AsyncStorage.removeItem('OFFLINE_QUEUE_KEY');
      
      alert('Cache cleared successfully!');
      calculateCacheSize();
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache');
    }
  };

  // Reset app data
  const resetAppData = async () => {
    if (confirmReset !== 'RESET') {
      alert('Please type RESET to confirm');
      return;
    }
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      await AsyncStorage.multiRemove(keys);
      
      alert('All app data has been reset. The app will now restart.');
      // In a real app, you would implement app restart logic here
      setResetDialogVisible(false);
    } catch (error) {
      console.error('Error resetting app data:', error);
      alert('Failed to reset app data');
    }
  };

  // Save API URL
  const saveApiUrl = async () => {
    try {
      await saveSettings('apiUrl', apiUrl);
      alert('API URL saved successfully! Changes will take effect after restarting the app.');
      setApiDialogVisible(false);
    } catch (error) {
      console.error('Error saving API URL:', error);
      alert('Failed to save API URL');
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Settings" />
        {!isOnline && <Appbar.Action icon="wifi-off" />}
      </Appbar.Header>

      <ScrollView>
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item 
            title="Dark Theme"
            description="Use dark theme throughout the app"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => <Switch value={darkTheme} onValueChange={toggleDarkTheme} />}
          />
          
          <Divider />
          
          <List.Subheader>Behavior</List.Subheader>
          <List.Item 
            title="Auto Save"
            description="Automatically save notes while typing"
            left={props => <List.Icon {...props} icon="content-save" />}
            right={() => <Switch value={autoSave} onValueChange={toggleAutoSave} />}
          />
          <List.Item 
            title="Sync on Startup"
            description="Sync notes with server when app starts"
            left={props => <List.Icon {...props} icon="sync" />}
            right={() => <Switch value={syncOnStart} onValueChange={toggleSyncOnStart} />}
          />
          
          <Divider />
          
          <List.Subheader>Data</List.Subheader>
          <List.Item 
            title="Cache Size"
            description={cacheSize}
            left={props => <List.Icon {...props} icon="database" />}
          />
          <List.Item 
            title="Clear Cache"
            description="Delete offline data cache"
            left={props => <List.Icon {...props} icon="broom" />}
            onPress={clearCache}
          />
          <List.Item 
            title="Reset App Data"
            description="Delete all app data and settings"
            left={props => <List.Icon {...props} icon="delete-forever" color="#f44336" />}
            onPress={() => setResetDialogVisible(true)}
          />
          
          <Divider />
          
          <List.Subheader>Connection</List.Subheader>
          <List.Item 
            title="API Configuration"
            description={apiUrl}
            left={props => <List.Icon {...props} icon="api" />}
            onPress={() => setApiDialogVisible(true)}
          />
          
          <Divider />
          
          <List.Subheader>About</List.Subheader>
          <List.Item 
            title="Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          <List.Item 
            title="Developer"
            description="shreyaupretyy"
            left={props => <List.Icon {...props} icon="code-tags" />}
          />
        </List.Section>
      </ScrollView>

      {/* Reset Confirmation Dialog */}
      <Portal>
        <Dialog visible={resetDialogVisible} onDismiss={() => setResetDialogVisible(false)}>
          <Dialog.Title>Reset App Data</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.warningText}>
              Warning: This will delete all notes, categories, and settings. This action cannot be undone.
            </Text>
            <Text style={styles.confirmText}>
              Type "RESET" to confirm:
            </Text>
            <TextInput
              value={confirmReset}
              onChangeText={setConfirmReset}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setResetDialogVisible(false)}>Cancel</Button>
            <Button onPress={resetAppData} textColor="#f44336">Reset</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* API Configuration Dialog */}
      <Portal>
        <Dialog visible={apiDialogVisible} onDismiss={() => setApiDialogVisible(false)}>
          <Dialog.Title>API Configuration</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Enter the URL of your API server:
            </Text>
            <TextInput
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="https://api.example.com"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setApiDialogVisible(false)}>Cancel</Button>
            <Button onPress={saveApiUrl}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  warningText: {
    color: '#f44336',
    marginBottom: 16,
  },
  confirmText: {
    marginBottom: 8,
  },
  dialogText: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
});

export default SettingsScreen;