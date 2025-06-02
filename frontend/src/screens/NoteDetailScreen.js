// src/screens/NoteDetailScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, Card, Chip, ActivityIndicator, FAB } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function NoteDetailScreen({ route, navigation }) {
  const { noteId } = route.params;
  const queryClient = useQueryClient();

  // Fetch note data
  const { data: noteData, isLoading, isError, error } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => apiService.getNote(noteId),
    retry: 2,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => apiService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to delete note');
    },
  });

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading note...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load note</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const note = noteData?.data?.note || noteData?.note;

  if (!note) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Note not found</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Note Header */}
          <Card style={styles.headerCard}>
            <Card.Content>
              <Text style={styles.title}>{note.title}</Text>
              <Text style={styles.date}>
                Created: {new Date(note.created_at).toLocaleDateString()}
              </Text>
              {note.category && (
                <Chip style={styles.categoryChip} compact>
                  {note.category}
                </Chip>
              )}
            </Card.Content>
          </Card>

          {/* Note Content */}
          <Card style={styles.contentCard}>
            <Card.Content>
              <Text style={styles.content}>{note.content}</Text>
            </Card.Content>
          </Card>

          {/* ✅ AI Analysis Section */}
          {note.ai_processed && (
            <Card style={styles.aiCard}>
              <Card.Title
                title="🤖 AI Analysis"
                subtitle="Smart insights about this note"
              />
              <Card.Content>
                {note.sentiment && (
                  <View style={styles.sentimentContainer}>
                    <Text style={styles.aiLabel}>Sentiment:</Text>
                    <Chip 
                      style={[
                        styles.sentimentChip,
                        { backgroundColor: getSentimentColor(note.sentiment) }
                      ]}
                      textStyle={{ color: 'white' }}
                      compact
                    >
                      {note.sentiment}
                    </Chip>
                  </View>
                )}

                {note.keywords && note.keywords.length > 0 && (
                  <View style={styles.keywordsContainer}>
                    <Text style={styles.aiLabel}>Keywords:</Text>
                    <View style={styles.keywordsList}>
                      {note.keywords.map((keyword, index) => (
                        <Chip key={index} style={styles.keywordChip} compact>
                          {keyword}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {note.summary && (
                  <View style={styles.summaryContainer}>
                    <Text style={styles.aiLabel}>Summary:</Text>
                    <Text style={styles.summaryText}>{note.summary}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('CreateNote', { noteToEdit: note })}
              style={styles.actionButton}
              icon="pencil"
            >
              Edit
            </Button>
            <Button
              mode="outlined"
              onPress={handleDelete}
              style={[styles.actionButton, styles.deleteButton]}
              buttonColor="#f44336"
              textColor="white"
              icon="delete"
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100, // ✅ Add padding for bottom spacing
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  contentCard: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  // ✅ Fix naming conflict - rename this to noteContent
  noteContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  aiCard: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8, // ✅ Add margin for better spacing
  },
  sentimentChip: {
    height: 32,
  },
  keywordsContainer: {
    marginBottom: 16, // ✅ Increase margin
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // ✅ Increase gap
    marginTop: 8,
    paddingBottom: 8, // ✅ Add padding to prevent cut-off
  },
  keywordChip: {
    height: 32, // ✅ Increase height
    backgroundColor: '#e3f2fd',
    marginBottom: 4, // ✅ Add margin bottom
  },
  summaryContainer: {
    marginBottom: 16, // ✅ Increase margin
  },
  summaryText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24, // ✅ Increase top margin
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    borderColor: '#f44336',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
});