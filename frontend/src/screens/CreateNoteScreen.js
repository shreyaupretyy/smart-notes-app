import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Button, Card, Chip, ActivityIndicator, Switch, Avatar } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAIPreview } from '../hooks/useAIPreview';
import ImagePickerComponent from '../components/ImagePicker';
import AudioRecorder from '../components/AudioRecorder';

export default function CreateNoteScreen({ route, navigation }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [aiPreviewEnabled, setAiPreviewEnabled] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [extractedImageText, setExtractedImageText] = useState('');
  const [extractedAudioText, setExtractedAudioText] = useState('');

  const queryClient = useQueryClient();

  // ✅ AI Preview with unified content
  const {
    aiPreview,
    isAnalyzing,
    error: aiError
  } = useAIPreview(content, aiPreviewEnabled);

  // ✅ Debug logging for AI preview - Enhanced
  useEffect(() => {
    console.log('🤖 AI Preview State Update:', {
      aiPreviewEnabled,
      contentLength: content.length,
      hasAiPreview: !!aiPreview,
      isAnalyzing,
      aiError: aiError?.message,
      isEditing: !!route.params?.noteToEdit, // ✅ Track if editing
      // ✅ Log the actual aiPreview object
      fullAiPreview: aiPreview,
      aiPreviewData: aiPreview ? {
        hasSentiment: !!aiPreview.sentiment,
        hasKeywords: !!(aiPreview.keywords && aiPreview.keywords.length > 0),
        hasSummary: !!aiPreview.summary,
        hasStatistics: !!aiPreview.statistics,
        // ✅ Check for other possible properties
        hasAnalysis: !!aiPreview.analysis,
        objectKeys: Object.keys(aiPreview)
      } : null
    });
  }, [aiPreview, isAnalyzing, aiError, content, aiPreviewEnabled, route.params?.noteToEdit]);

  // Edit note functionality
  useEffect(() => {
    if (route.params?.noteToEdit) {
      const note = route.params.noteToEdit;
      console.log('📝 Loading note for editing:', {
        id: note.id,
        title: note.title,
        hasAiData: note.ai_processed,
        contentLength: note.content?.length || 0
      });
      
      setTitle(note.title || '');
      setContent(note.content || '');
      setCategory(note.category || '');
      
      // ✅ Enable AI preview for editing to regenerate analysis
      setAiPreviewEnabled(true);
    }
  }, [route.params?.noteToEdit]);

  // Image Processing Mutation
  const imageProcessingMutation = useMutation({
    mutationFn: (base64Data) => apiService.processImage(base64Data),
    onSuccess: (response) => {
      setIsProcessingImage(false);
      if (response.data?.result) {
        setImageAnalysis(response.data.result);
        
        // ✅ Auto-append extracted text to content
        const extractedText = response.data.result.extracted_text;
        if (extractedText && extractedText.trim()) {
          setExtractedImageText(extractedText);
          setContent(prevContent => {
            const newContent = prevContent 
              ? `${prevContent}\n\n📷 Extracted from image:\n${extractedText}` 
              : `📷 Extracted from image:\n${extractedText}`;
            return newContent;
          });
        }
        
        console.log('✅ Image analysis complete:', response.data.result);
      }
    },
    onError: (error) => {
      setIsProcessingImage(false);
      console.error('❌ Image processing error:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  });

  // Audio Processing Mutation
  const audioProcessingMutation = useMutation({
    mutationFn: (base64Data) => apiService.processAudio(base64Data),
    onSuccess: (response) => {
      if (response.data?.result) {
        setAudioAnalysis(response.data.result);
        
        // ✅ Auto-append transcribed text to content
        const transcribedText = response.data.result.transcribed_text;
        if (transcribedText && 
            transcribedText !== "No speech detected in audio" &&
            !transcribedText.toLowerCase().includes('error') &&
            !transcribedText.toLowerCase().includes('failed')) {
          setExtractedAudioText(transcribedText);
          setContent(prevContent => {
            const newContent = prevContent 
              ? `${prevContent}\n\n🎤 Voice note:\n${transcribedText}` 
              : `🎤 Voice note:\n${transcribedText}`;
            return newContent;
          });
        }
        
        console.log('✅ Audio analysis complete:', response.data.result);
      }
    },
    onError: (error) => {
      console.error('❌ Audio processing error:', error);
      Alert.alert('Error', 'Failed to process audio recording');
    }
  });

  // Save Note Mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      const isEditing = !!route.params?.noteToEdit;
      console.log('💾 Saving note with data:', {
        hasImage: !!selectedImage,
        hasAudio: !!selectedAudio,
        hasAiAnalysis: !!noteData.ai_analysis,
        title: noteData.title,
        contentLength: noteData.content?.length || 0,
        isUpdate: isEditing,
        noteId: isEditing ? route.params.noteToEdit.id : 'new'
      });

      if (isEditing) {
        console.log('🔄 Updating existing note with AI analysis...');
        const response = await apiService.updateNote(route.params.noteToEdit.id, noteData);
        return { ...response, noteId: route.params.noteToEdit.id, isUpdate: true };
      } else {
        console.log('➕ Creating new note with AI analysis...');
        const response = await apiService.createNote(noteData);
        return { ...response, noteId: response.data?.note?.id, isUpdate: false };
      }
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note', response.noteId] });
      
      console.log('✅ Note saved and cache invalidated:', {
        noteId: response.noteId,
        isUpdate: response.isUpdate,
        hasResponseData: !!response.data
      });
      
      if (response.noteId) {
        navigation.navigate('NoteDetail', { noteId: response.noteId });
      } else {
        navigation.navigate('Notes');
      }
    },
    onError: (error) => {
      console.error('❌ Save error:', error);
      const action = route.params?.noteToEdit ? 'update' : 'create';
      Alert.alert('Error', `Failed to ${action} note: ${error.message}`);
    }
  });

  // Handle Image Selection
  const handleImageSelected = async (imageData) => {
    setSelectedImage(imageData);
    setImageAnalysis(null);
    
    if (imageData) {
      console.log('🖼️ Processing image in CreateNote...');
      setIsProcessingImage(true);
      imageProcessingMutation.mutate(imageData.base64);
    }
  };

  // Handle Audio Selection
  const handleAudioSelected = async (audioData) => {
    setSelectedAudio(audioData);
    setAudioAnalysis(null);
    
    if (audioData) {
      console.log('🎤 Processing audio in CreateNote...');
      audioProcessingMutation.mutate(audioData.base64);
    }
  };

  // Save Note Handler
  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }

    if (!content.trim() && !selectedImage && !selectedAudio) {
      Alert.alert('Error', 'Please add some content, image, or audio to your note');
      return;
    }

    // ✅ Debug AI analysis before saving
    const isEditing = !!route.params?.noteToEdit;
    console.log('🔍 AI Preview before save:', {
      isEditing,
      aiPreview,
      hasAiPreview: !!aiPreview,
      aiPreviewKeys: aiPreview ? Object.keys(aiPreview) : [],
      fullAiPreview: aiPreview
    });

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      image_data: selectedImage ? JSON.stringify(selectedImage) : null,
      audio_data: selectedAudio ? JSON.stringify(selectedAudio) : null,
      ai_analysis: aiPreview ? JSON.stringify(aiPreview) : null, // ✅ Include AI analysis for both create and update
    };

    console.log('💾 Saving note data:', {
      ...noteData,
      ai_analysis: noteData.ai_analysis ? 'Has AI data' : 'No AI data',
      ai_analysis_length: noteData.ai_analysis ? noteData.ai_analysis.length : 0,
      isUpdate: isEditing
    });

    saveNoteMutation.mutate(noteData);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // ✅ Check if we should show AI preview section
  const shouldShowAiPreview = aiPreviewEnabled && content.length > 10;
  const hasAiData = aiPreview && (
    // Check direct properties
    aiPreview.sentiment || 
    (aiPreview.keywords && aiPreview.keywords.length > 0) || 
    aiPreview.summary || 
    aiPreview.statistics ||
    // ✅ Check for nested analysis object (common API pattern)
    (aiPreview.analysis && (
      aiPreview.analysis.sentiment ||
      (aiPreview.analysis.keywords && aiPreview.analysis.keywords.length > 0) ||
      aiPreview.analysis.summary ||
      aiPreview.analysis.statistics
    ))
  );

  // ✅ Extract AI data with fallback to nested structure
  const getAiData = () => {
    if (!aiPreview) return null;
    
    // If data is directly on aiPreview
    if (aiPreview.sentiment || aiPreview.keywords || aiPreview.summary || aiPreview.statistics) {
      return aiPreview;
    }
    
    // If data is nested in analysis object
    if (aiPreview.analysis) {
      return aiPreview.analysis;
    }
    
    return aiPreview;
  };

  const aiData = getAiData();

  // ✅ Set proper screen title based on edit mode
  useLayoutEffect(() => {
    const isEditing = !!route.params?.noteToEdit;
    navigation.setOptions({
      title: isEditing ? 'Edit Note' : 'Create Note',
      headerBackTitle: 'Notes', // For iOS
    });
  }, [navigation, route.params?.noteToEdit]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* ✅ Show edit indicator in UI */}
          {route.params?.noteToEdit && (
            <Card style={styles.editIndicatorCard}>
              <Card.Content>
                <Text style={styles.editIndicatorText}>
                  ✏️ Editing: {route.params.noteToEdit.title}
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter note title..."
              placeholderTextColor="#999"
            />
          </View>

          {/* Content Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Content</Text>
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Write your note here... (text from voice and images will be added automatically)"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Category Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.categoryInput}
              value={category}
              onChangeText={setCategory}
              placeholder="Optional category..."
              placeholderTextColor="#999"
            />
          </View>

          {/* AI Preview Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>AI Preview</Text>
            <Switch
              value={aiPreviewEnabled}
              onValueChange={setAiPreviewEnabled}
              color="#6366f1"
            />
          </View>

          {/* ✅ AI Preview Section - Fixed data checking */}
          {shouldShowAiPreview && (
            <Card style={styles.aiPreviewCard}>
              <Card.Title
                title="🤖 AI Analysis"
                subtitle={isAnalyzing ? "Analyzing..." : hasAiData ? "Live insights" : "Waiting for analysis..."}
                left={(props) => <Avatar.Icon {...props} icon="robot" />}
                right={(props) => isAnalyzing ? <ActivityIndicator size="small" color="#6366f1" /> : null}
              />
              <Card.Content>
                {/* ✅ Show loading state prominently */}
                {isAnalyzing && !hasAiData && (
                  <View style={styles.analyzingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.analyzingText}>Analyzing your content...</Text>
                  </View>
                )}

                {/* ✅ Show AI data when available - use aiData instead of aiPreview */}
                {hasAiData && aiData && (
                  <View style={styles.previewContent}>
                    {aiData.sentiment && (
                      <View style={styles.sentimentContainer}>
                        <Text style={styles.previewLabel}>Sentiment:</Text>
                        <Chip 
                          style={[
                            styles.sentimentChip,
                            { backgroundColor: getSentimentColor(aiData.sentiment) }
                          ]}
                          textStyle={{ color: 'white' }}
                          compact
                        >
                          {aiData.sentiment}
                        </Chip>
                      </View>
                    )}

                    {aiData.keywords && aiData.keywords.length > 0 && (
                      <View style={styles.keywordsContainer}>
                        <Text style={styles.previewLabel}>Keywords:</Text>
                        <View style={styles.keywordsList}>
                          {aiData.keywords.slice(0, 8).map((keyword, index) => (
                            <Chip key={index} style={styles.keywordChip} compact>
                              {keyword}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}

                    {aiData.summary && (
                      <View style={styles.summaryContainer}>
                        <Text style={styles.previewLabel}>Summary:</Text>
                        <Text style={styles.summaryText}>{aiData.summary}</Text>
                      </View>
                    )}

                    {aiData.statistics && (
                      <View style={styles.statisticsContainer}>
                        <Text style={styles.previewLabel}>Statistics:</Text>
                        <Text style={styles.statisticsText}>
                          📊 {aiData.statistics.word_count || 0} words • {aiData.statistics.sentence_count || 0} sentences • {Math.round((aiData.statistics.reading_time_minutes || 0) * 10) / 10} min read
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ✅ Show debug info in development */}
                {__DEV__ && aiPreview && (
                  <View style={styles.debugContainer}>
                    <Text style={styles.debugTitle}>🔍 Debug Info:</Text>
                    <Text style={styles.debugText}>
                      AI Data Keys: {aiPreview ? Object.keys(aiPreview).join(', ') : 'none'}
                    </Text>
                    <Text style={styles.debugText}>
                      Has Data: {hasAiData ? 'Yes' : 'No'}
                    </Text>
                    {aiPreview.analysis && (
                      <Text style={styles.debugText}>
                        Analysis Keys: {Object.keys(aiPreview.analysis).join(', ')}
                      </Text>
                    )}
                  </View>
                )}

                {/* ✅ Show error state */}
                {aiError && !isAnalyzing && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                      ❌ AI analysis failed: {aiError.message}
                    </Text>
                    <Text style={styles.errorSubtext}>
                      Note will be saved without AI insights
                    </Text>
                  </View>
                )}

                {/* ✅ Show waiting state */}
                {!isAnalyzing && !hasAiData && !aiError && (
                  <View style={styles.waitingContainer}>
                    <Text style={styles.waitingText}>
                      💭 Start typing to see AI insights...
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          {/* ✅ Show message when AI Preview is disabled */}
          {!aiPreviewEnabled && content.length > 10 && (
            <Card style={styles.disabledAiCard}>
              <Card.Content>
                <Text style={styles.disabledAiText}>
                  💡 Turn on AI Preview to see real-time analysis of your content
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Image Section */}
          <Text style={styles.sectionLabel}>📷 Image</Text>
          <ImagePickerComponent 
            onImageSelected={handleImageSelected}
            currentImage={selectedImage}
          />

          {/* Image Processing Status */}
          {isProcessingImage && (
            <Card style={styles.processingCard}>
              <Card.Content style={styles.processingContent}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.processingText}>
                  Extracting text from image...
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Audio Section */}
          <Text style={styles.sectionLabel}>🎤 Voice Note</Text>
          <AudioRecorder 
            onAudioRecorded={handleAudioSelected}
            currentAudio={selectedAudio}
          />

          {/* Audio Processing Status */}
          {audioProcessingMutation.isPending && (
            <Card style={styles.processingCard}>
              <Card.Content style={styles.processingContent}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.processingText}>
                  Converting speech to text...
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Save Button */}
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={saveNoteMutation.isPending}
            disabled={saveNoteMutation.isPending}
            icon="content-save"
          >
            {route.params?.noteToEdit ? 'Update Note' : 'Save Note'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ✅ Add debug styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
    color: '#6366f1',
  },
  titleInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  contentInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 120,
    maxHeight: 200,
  },
  categoryInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  processingCard: {
    marginVertical: 16,
    backgroundColor: '#e3f2fd',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  processingText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#1976d2',
  },
  aiPreviewCard: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    elevation: 3,
  },
  previewContent: {
    gap: 12,
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  sentimentChip: {
    height: 32,
  },
  keywordsContainer: {
    gap: 8,
  },
  keywordsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordChip: {
    height: 28,
    backgroundColor: '#e3f2fd',
  },
  summaryContainer: {
    gap: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  statisticsContainer: {
    gap: 8,
  },
  statisticsText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  analyzingText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#6366f1',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  waitingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorSubtext: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  disabledAiCard: {
    marginBottom: 16,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  disabledAiText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: 32,
    marginBottom: 16,
    paddingVertical: 8,
    backgroundColor: '#6366f1',
  },
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  editIndicatorCard: {
    marginBottom: 16,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  editIndicatorText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '500',
  },
});