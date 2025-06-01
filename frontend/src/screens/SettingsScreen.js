// src/screens/SettingsScreen.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Alert,
  Linking 
} from 'react-native';
import { 
  Card, 
  List, 
  Switch, 
  Button,
  Divider 
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function SettingsScreen() {
  const queryClient = useQueryClient();

  const { data: notesStats } = useQuery({
    queryKey: ['notes-stats'],
    queryFn: () => apiService.getNotes(),
  });

  const totalNotes = notesStats?.data?.notes?.length || 0;

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            await queryClient.clear();
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const handleBackup = () => {
    Alert.alert('Coming Soon', 'Backup feature will be available soon!');
  };

  const handleExport = () => {
    Alert.alert('Coming Soon', 'Export feature will be available soon!');
  };

  const openGitHub = () => {
    Linking.openURL('https://github.com/your-username/smart-notes-app');
  };

  return (
    <ScrollView style={styles.container}>
      {/* App Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>📱 App Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Notes:</Text>
            <Text style={styles.value}>{totalNotes}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Version:</Text>
            <Text style={styles.value}>1.0.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Backend Status:</Text>
            <Text style={[styles.value, { color: '#4caf50' }]}>Connected</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Data Management */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>💾 Data Management</Text>
          
          <List.Item
            title="Clear Cache"
            description="Clear app cache and temporary data"
            left={props => <List.Icon {...props} icon="delete-sweep" />}
            onPress={clearCache}
          />
          
          <Divider />
          
          <List.Item
            title="Backup Notes"
            description="Create a backup of your notes"
            left={props => <List.Icon {...props} icon="backup-restore" />}
            onPress={handleBackup}
          />
          
          <Divider />
          
          <List.Item
            title="Export Notes"
            description="Export notes to external file"
            left={props => <List.Icon {...props} icon="export" />}
            onPress={handleExport}
          />
        </Card.Content>
      </Card>

      {/* AI Settings */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🤖 AI Settings</Text>
          
          <List.Item
            title="Auto AI Analysis"
            description="Automatically analyze notes with AI"
            left={props => <List.Icon {...props} icon="brain" />}
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
          
          <Divider />
          
          <List.Item
            title="Real-time Processing"
            description="Process notes as you type"
            left={props => <List.Icon {...props} icon="speedometer" />}
            right={() => <Switch value={true} onValueChange={() => {}} />}
          />
        </Card.Content>
      </Card>

      {/* About */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>ℹ️ About</Text>
          
          <Text style={styles.aboutText}>
            Smart Notes App is an AI-powered note-taking application that uses 
            CUDA-accelerated machine learning to provide intelligent features 
            like automatic summarization, sentiment analysis, and keyword extraction.
          </Text>

          <Button
            mode="outlined"
            onPress={openGitHub}
            icon="github"
            style={styles.githubButton}
          >
            View on GitHub
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#666',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 16,
  },
  githubButton: {
    alignSelf: 'flex-start',
  },
});