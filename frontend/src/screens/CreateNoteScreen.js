// src/screens/CreateNoteScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Card, 
  ActivityIndicator,
  Text,
  Chip,
  ProgressBar 
} from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function CreateNoteScreen({ route, navigation }) {
  const { editNote } = route.params || {};
  const isEditing = !!editNote;
  
  const [title, setTitle] = useState(editNote?.title || '');
  const [content, setContent] = useState(editNote?.content || '');
  const [category, setCategory] = useState(editNote?.category || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (noteData) => apiService.createNote(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to create note');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (noteData) => apiService.updateNote(editNote.id, noteData),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      queryClient.invalidateQueries(['note', editNote.id]);
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update note');
    },
  });

  // Real-time AI preview (debounced)
  useEffect(() => {
    if (content.length > 50) {
      const timer = setTimeout(async () => {
        setIsProcessing(true);
        try {
          const [summaryRes, analysisRes] = await Promise.all([
            apiService.summarizeText(content),
            apiService.analyzeText(content),
          ]);
          
          setAiPreview({
            summary: summaryRes.data.summary,
            sentiment: analysisRes.data.sentiment,
            keywords: analysisRes.data.keywords,
          });
        } catch (error) {
          console.log('AI preview error:', error);
        } finally {
          setIsProcessing(false);
        }
      }, 2000); // 2-second delay

      return () => clearTimeout(timer);
    }
  }, [content]);

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in title and content');
      return;
    }

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(noteData);
    } else {
      createMutation.mutate(noteData);
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Note Title"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              placeholder="Enter a descriptive title..."
            />

            <TextInput
              label="Category (Optional)"
              value={category}
              onChangeText={setCategory}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Work, Personal, Ideas..."
            />

            <TextInput
              label="Note Content"
              value={content}
              onChangeText={setContent}
              mode="outlined"
              multiline
              numberOfLines={10}
              style={styles.contentInput}
              placeholder="Start writing your note... AI will analyze it automatically!"
            />
          </Card.Content>
        </Card>

        {/* AI Preview Card */}
        {(isProcessing || aiPreview) && (
          <Card style={styles.aiCard}>
            <Card.Content>
              <Text style={styles.aiTitle}>🤖 AI Analysis Preview</Text>
              
              {isProcessing && (
                <View style={styles.processingContainer}>
                  <ProgressBar indeterminate color="#6366f1" />
                  <Text style={styles.processingText}>Analyzing with AI...</Text>
                </View>
              )}

              {aiPreview && !isProcessing && (
                <View>
                  {aiPreview.summary && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Summary:</Text>
                      <Text style={styles.previewContent}>{aiPreview.summary}</Text>
                    </View>
                  )}

                  {aiPreview.sentiment && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Sentiment:</Text>
                      <Chip 
                        style={[styles.sentimentChip, { 
                          backgroundColor: getSentimentColor(aiPreview.sentiment) 
                        }]}
                        textStyle={{ color: 'white' }}
                      >
                        {aiPreview.sentiment}
                      </Chip>
                    </View>
                  )}

                  {aiPreview.keywords && aiPreview.keywords.length > 0 && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Keywords:</Text>
                      <View style={styles.keywordsContainer}>
                        {aiPreview.keywords.slice(0, 5).map((keyword, index) => (
                          <Chip key={index} style={styles.keywordChip}>
                            {keyword}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading}
          style={styles.saveButton}
          icon="content-save"  // ✅ Better icon for save
        >
          {isEditing ? 'Update' : 'Save'} Note
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const getSentimentColor = (sentiment) => {
  switch (sentiment) {
    case 'positive': return '#4caf50';
    case 'negative': return '#f44336';
    default: return '#9e9e9e';
  }
};

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
  input: {
    marginBottom: 16,
  },
  contentInput: {
    marginBottom: 16,
    minHeight: 200,
  },
  aiCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#f8f9ff',
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#6366f1',
  },
  processingContainer: {
    marginBottom: 16,
  },
  processingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#6366f1',
  },
  previewSection: {
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  previewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
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
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});