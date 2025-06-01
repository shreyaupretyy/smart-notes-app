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

  const { data, isLoading, isError } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => apiService.getNote(noteId),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      navigation.goBack();
    },
  });

  const note = data?.data?.note;

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate()
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

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading note...</Text>
      </View>
    );
  }

  if (isError || !note) {
    return (
      <View style={styles.centered}>
        <Text>❌ Error loading note</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

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
          loading={deleteMutation.isLoading}
        >
          Delete
        </Button>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('CreateNote', { editNote: note })}
          icon="edit"
          style={styles.editButton}
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
});