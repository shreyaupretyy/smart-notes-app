// src/screens/NoteDetailScreen.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert 
} from 'react-native';
import { 
  Card, 
  Button, 
  Chip, 
  ActivityIndicator,
  FAB 
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';

export default function NoteDetailScreen({ route, navigation }) {
  const { noteId } = route.params;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => apiService.getNote(noteId),
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    onError: (error) => {
      if (error?.response?.status === 404) {
        console.log(`📋 Note ${noteId} not found (likely deleted), navigating back`);
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Notes', { screen: 'NotesList' });
        }
      } else {
        console.error(`❌ Failed to load note ${noteId}:`, error.message);
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: apiService.deleteNote,
    onMutate: async (noteId) => {
      console.log(`🗑️ Starting optimistic delete for note ${noteId}`);
      
      // ✅ Cancel any outgoing queries for this note
      await queryClient.cancelQueries(['note', noteId]);
      await queryClient.cancelQueries(['notes']);
      
      // ✅ Get the current notes list before deletion
      const previousNotes = queryClient.getQueryData(['notes']);
      
      // ✅ Immediately remove the note from the cache
      queryClient.removeQueries(['note', noteId]);
      
      // ✅ Optimistically update the notes list
      queryClient.setQueryData(['notes'], (oldData) => {
        if (!oldData?.data?.notes) {
          console.log('⚠️ No notes data found for optimistic update');
          return oldData;
        }
        
        const filteredNotes = oldData.data.notes.filter(note => note.id !== noteId);
        console.log(`✅ Optimistically removed note ${noteId}, ${filteredNotes.length} notes remaining`);
        
        return {
          ...oldData,
          data: {
            ...oldData.data,
            notes: filteredNotes,
            count: filteredNotes.length
          }
        };
      });

      // ✅ Navigate back immediately
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Notes', { screen: 'NotesList' });
      }

      // ✅ Return context for potential rollback
      return { previousNotes, noteId };
    },
    onSuccess: (data, noteId, context) => {
      console.log(`✅ Note ${noteId} deleted successfully on server`);
      
      // ✅ Invalidate queries to ensure fresh data from server
      queryClient.invalidateQueries(['notes']);
    },
    onError: (error, noteId, context) => {
      console.error(`❌ Error deleting note ${noteId}:`, error);
      
      // ✅ Rollback the optimistic update on error
      if (context?.previousNotes) {
        console.log('🔄 Rolling back optimistic update');
        queryClient.setQueryData(['notes'], context.previousNotes);
      }
      
      // ✅ Restore the individual note query
      queryClient.invalidateQueries(['note', noteId]);
      
      Alert.alert('Error', 'Failed to delete note. Please try again.');
    }
  });

  const isLoadingOrProcessing = isLoading || deleteMutation.isPending;

  if (isLoadingOrProcessing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>
          {deleteMutation.isPending ? 'Deleting note...' : 'Loading note...'}
        </Text>
      </View>
    );
  }

  if (isError && error?.response?.status === 404) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Note not found, going back...</Text>
      </View>
    );
  }

  if (isError && error?.response?.status !== 404) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>❌ Error Loading Note</Text>
        <Text style={styles.errorText}>
          {error?.message || 'Unknown error occurred'}
        </Text>
        <Button 
          onPress={() => navigation.goBack()}
          mode="contained"
          style={{ marginTop: 16 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  const note = data?.data?.note;

  if (!note) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(noteId),
        },
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>{note.title}</Text>
            <Text style={styles.date}>
              Created: {new Date(note.created_at).toLocaleDateString()}
            </Text>
            
            {note.category && (
              <Chip style={styles.categoryChip} icon="folder">
                {note.category}
              </Chip>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Content</Text>
            <Text style={styles.content}>{note.content}</Text>
          </Card.Content>
        </Card>

        {note.ai_processed && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>🤖 AI Analysis</Text>
              
              {note.summary && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiLabel}>Summary:</Text>
                  <Text style={styles.aiContent}>{note.summary}</Text>
                </View>
              )}

              {note.sentiment && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiLabel}>Sentiment:</Text>
                  <Chip 
                    style={[styles.sentimentChip, { backgroundColor: getSentimentColor(note.sentiment) }]}
                    textStyle={{ color: 'white' }}
                  >
                    {note.sentiment}
                  </Chip>
                </View>
              )}

              {note.keywords && note.keywords.length > 0 && (
                <View style={styles.aiSection}>
                  <Text style={styles.aiLabel}>Keywords:</Text>
                  <View style={styles.keywordsContainer}>
                    {note.keywords.map((keyword, index) => (
                      <Chip key={index} style={styles.keywordChip}>
                        {keyword}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {(note.image_text || note.audio_text) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>📎 Extracted Content</Text>
              
              {note.image_text && (
                <View style={styles.extractedSection}>
                  <Text style={styles.extractedLabel}>🖼️ Image Text:</Text>
                  <Text style={styles.extractedContent}>{note.image_text}</Text>
                </View>
              )}

              {note.audio_text && (
                <View style={styles.extractedSection}>
                  <Text style={styles.extractedLabel}>🎤 Audio Text:</Text>
                  <Text style={styles.extractedContent}>{note.audio_text}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button 
          mode="outlined" 
          onPress={handleDelete}
          icon="delete"
          buttonColor="#ffebee"
          textColor="#d32f2f"
          loading={deleteMutation.isPending}
          disabled={deleteMutation.isPending}
        >
          Delete
        </Button>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('CreateNote', { editNote: note })}
          icon="pencil"
          style={styles.editButton}
          disabled={deleteMutation.isPending}
        >
          Edit
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  aiSection: {
    marginBottom: 16,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#6366f1',
  },
  aiContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  sentimentChip: {
    alignSelf: 'flex-start',
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keywordChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  extractedSection: {
    marginBottom: 16,
  },
  extractedLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  extractedContent: {
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
});