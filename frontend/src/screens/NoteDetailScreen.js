// src/screens/NoteDetailScreen.js - Beautiful UI enhancement
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

  const getSentimentEmoji = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😔';
      default: return '😐';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading your beautiful note...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😞</Text>
          <Text style={styles.errorText}>Failed to load note</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const note = noteData?.data?.note || noteData?.note;

  if (!note) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>📝</Text>
          <Text style={styles.errorText}>Note not found</Text>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.errorButton}
          >
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Note Header */}
          <Card style={styles.headerCard} elevation={8}>
            <Card.Content>
              <Text style={styles.title}>{note.title}</Text>
              <Text style={styles.date}>
                📅 Created: {new Date(note.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              {note.category && (
                <Chip 
                  style={styles.categoryChip} 
                  textStyle={styles.categoryChipText}
                  icon="folder"
                  compact
                >
                  {note.category}
                </Chip>
              )}
            </Card.Content>
          </Card>

          {/* Note Content */}
          <Card style={styles.contentCard} elevation={6}>
            <Card.Content>
              <Text style={styles.noteContent}>{note.content}</Text>
            </Card.Content>
          </Card>

          {/* AI Analysis Section */}
          {note.ai_processed && (
            <Card style={styles.aiCard} elevation={8}>
              <Card.Title
                title="🤖 AI Insights"
                subtitle="Smart analysis of your note"
                titleStyle={styles.aiCardTitle}
                subtitleStyle={styles.aiCardSubtitle}
              />
              <Card.Content>
                {note.sentiment && (
                  <View style={styles.sentimentContainer}>
                    <Text style={styles.aiLabel}>✨ Sentiment:</Text>
                    <Chip 
                      style={[
                        styles.sentimentChip,
                        { backgroundColor: getSentimentColor(note.sentiment) }
                      ]}
                      textStyle={styles.sentimentChipText}
                      icon={() => <Text style={styles.sentimentEmoji}>{getSentimentEmoji(note.sentiment)}</Text>}
                      compact
                    >
                      {note.sentiment}
                    </Chip>
                  </View>
                )}

                {note.keywords && note.keywords.length > 0 && (
                  <View style={styles.keywordsContainer}>
                    <Text style={styles.aiLabel}>🏷️ Keywords:</Text>
                    <View style={styles.keywordsList}>
                      {note.keywords.map((keyword, index) => (
                        <Chip 
                          key={index} 
                          style={styles.keywordChip}
                          textStyle={styles.keywordChipText}
                          compact
                        >
                          {keyword}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {note.summary && (
                  <View style={styles.summaryContainer}>
                    <Text style={styles.aiLabel}>📝 Summary:</Text>
                    <View style={styles.summaryTextContainer}>
                      <Text style={styles.summaryText}>{note.summary}</Text>
                    </View>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateNote', { noteToEdit: note })}
              style={styles.editButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="pencil"
            >
              Edit Note
            </Button>
            <Button
              mode="contained"
              onPress={handleDelete}
              style={styles.deleteButton}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
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
    backgroundColor: '#f8fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafb',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  
  // Loading and Error States
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
  },
  errorButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },

  // Header Card
  headerCard: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1f2937',
    lineHeight: 36,
  },
  date: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
  },
  categoryChipText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 13,
  },

  // Content Card
  contentCard: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  noteContent: {
    fontSize: 17,
    lineHeight: 28,
    color: '#374151',
    fontWeight: '400',
    letterSpacing: 0.3,
  },

  // AI Analysis Card
  aiCard: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    borderLeftWidth: 6,
    borderLeftColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  aiCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  aiCardSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  aiLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  sentimentChip: {
    height: 36,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sentimentChipText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  sentimentEmoji: {
    fontSize: 16,
  },

  // Keywords
  keywordsContainer: {
    marginBottom: 20,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    paddingBottom: 8,
  },
  keywordChip: {
    height: 34,
    backgroundColor: '#f3f4f6',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 6,
  },
  keywordChipText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 13,
  },

  // Summary
  summaryContainer: {
    marginBottom: 16,
  },
  summaryTextContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryText: {
    fontSize: 15,
    color: '#4b5563',
    fontStyle: 'italic',
    lineHeight: 24,
    fontWeight: '500',
  },

  // Action Buttons
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});