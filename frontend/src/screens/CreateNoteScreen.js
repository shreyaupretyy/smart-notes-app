// src/screens/CreateNoteScreen.js
import React, { useState, useEffect } from 'react';
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
import { Button, Card, Chip, ActivityIndicator, Switch } from 'react-native-paper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { useAIPreview } from '../hooks/useAIPreview';
import ImagePickerComponent from '../components/ImagePicker'; // ✅ Import new component

export default function CreateNoteScreen({ route, navigation }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [aiPreviewEnabled, setAiPreviewEnabled] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null); // ✅ Add image state
  const [imageAnalysis, setImageAnalysis] = useState(null); // ✅ Add image analysis state
  const [isProcessingImage, setIsProcessingImage] = useState(false); // ✅ Add processing state

  const queryClient = useQueryClient();

  // Get edit data if editing
  const editNote = route.params?.editNote;
  const isEditing = !!editNote;

  // Use the AI preview hook
  const { aiPreview, isAnalyzing } = useAIPreview(content, aiPreviewEnabled);

  // Set initial values if editing
  useEffect(() => {
    if (isEditing && editNote) {
      setTitle(editNote.title || '');
      setContent(editNote.content || '');
      setCategory(editNote.category || '');
    }
  }, [isEditing, editNote]);

  // ✅ Handle image selection and processing
  const handleImageSelected = async (imageData) => {
    setSelectedImage(imageData);
    
    if (imageData) {
      setIsProcessingImage(true);
      try {
        console.log('🖼️ Processing selected image...');
        
        // Call API to process image
        const result = await apiService.processImage(imageData.base64);
        
        if (result?.data?.result) {
          setImageAnalysis(result.data.result);
          
          // If OCR extracted text, append to content
          if (result.data.result.extracted_text) {
            const extractedText = result.data.result.extracted_text.trim();
            if (extractedText) {
              setContent(prev => {
                const newContent = prev ? `${prev}\n\n📷 Image Text:\n${extractedText}` : extractedText;
                return newContent;
              });
            }
          }
          
          console.log('✅ Image processed successfully');
        }
      } catch (error) {
        console.error('❌ Error processing image:', error);
        Alert.alert('Error', 'Failed to process image. You can still save the note.');
      } finally {
        setIsProcessingImage(false);
      }
    } else {
      setImageAnalysis(null);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: apiService.createNote,
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      Alert.alert('Success', 'Note created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Notes', { screen: 'NotesList' });
            }
          }
        }
      ]);
    },
    onError: (error) => {
      console.error('❌ Error creating note:', error);
      Alert.alert('Error', 'Failed to create note. Please try again.');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => apiService.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      queryClient.invalidateQueries(['note', editNote.id]);
      Alert.alert('Success', 'Note updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Notes', { screen: 'NotesList' });
            }
          }
        }
      ]);
    },
    onError: (error) => {
      console.error('❌ Error updating note:', error);
      Alert.alert('Error', 'Failed to update note. Please try again.');
    }
  });

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please enter both title and content');
      return;
    }

    const noteData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim() || undefined,
      // ✅ Include image data if available
      hasImage: !!selectedImage,
      imageText: imageAnalysis?.extracted_text || null,
    };

    console.log('💾 Saving note with image...', { 
      title: noteData.title, 
      hasImage: noteData.hasImage 
    });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editNote.id,
          ...noteData,
        });
      } else {
        await createMutation.mutateAsync(noteData);
      }
    } catch (error) {
      console.error('❌ Save error:', error);
    }
  };

  const handleCancel = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Notes', { screen: 'NotesList' });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.formContainer}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter note title..."
            maxLength={100}
            editable={!isSaving}
          />

          <Text style={styles.label}>Category</Text>
          <TextInput
            style={styles.categoryInput}
            value={category}
            onChangeText={setCategory}
            placeholder="Enter category (optional)..."
            maxLength={50}
            editable={!isSaving}
          />

          {/* ✅ Add Image Picker Component */}
          <Text style={styles.label}>Image (Optional)</Text>
          <ImagePickerComponent 
            onImageSelected={handleImageSelected}
            currentImage={selectedImage}
          />

          {/* ✅ Show image processing status */}
          {isProcessingImage && (
            <Card style={styles.processingCard}>
              <Card.Content>
                <View style={styles.processingContent}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.processingText}>Processing image with AI...</Text>
                </View>
              </Card.Content>
            </Card>
          )}

          {/* ✅ Show image analysis results */}
          {imageAnalysis && (
            <Card style={styles.imageAnalysisCard}>
              <Card.Content>
                <Text style={styles.imageAnalysisTitle}>🖼️ Image Analysis</Text>
                
                {imageAnalysis.extracted_text && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>Extracted Text:</Text>
                    <Text style={styles.extractedText}>{imageAnalysis.extracted_text}</Text>
                  </View>
                )}

                {imageAnalysis.analysis && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>AI Analysis:</Text>
                    
                    {imageAnalysis.analysis.sentiment && (
                      <Chip 
                        style={[
                          styles.sentimentChip, 
                          { backgroundColor: getSentimentColor(imageAnalysis.analysis.sentiment) }
                        ]}
                        textStyle={{ color: 'white' }}
                      >
                        {imageAnalysis.analysis.sentiment}
                      </Chip>
                    )}

                    {imageAnalysis.analysis.keywords && imageAnalysis.analysis.keywords.length > 0 && (
                      <View style={styles.keywordsContainer}>
                        {imageAnalysis.analysis.keywords.slice(0, 5).map((keyword, index) => (
                          <Chip key={index} style={styles.keywordChip} compact>
                            {keyword}
                          </Chip>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </Card.Content>
            </Card>
          )}

          <View style={styles.contentSection}>
            <View style={styles.contentHeader}>
              <Text style={styles.label}>Content *</Text>
              <View style={styles.aiToggle}>
                <Text style={styles.aiToggleLabel}>AI Preview</Text>
                <Switch
                  value={aiPreviewEnabled}
                  onValueChange={setAiPreviewEnabled}
                  disabled={isSaving}
                />
              </View>
            </View>
            
            <TextInput
              style={styles.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="Enter your note content..."
              multiline
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>

          {/* Existing AI Preview Card */}
          {aiPreviewEnabled && (content.length >= 50 || isAnalyzing || aiPreview) && (
            <Card style={styles.aiPreviewCard}>
              <Card.Content>
                <View style={styles.aiPreviewHeader}>
                  <Text style={styles.aiPreviewTitle}>🤖 AI Preview</Text>
                  {isAnalyzing && <ActivityIndicator size="small" />}
                </View>

                {content.length < 50 && !isAnalyzing && (
                  <Text style={styles.aiHint}>
                    Type at least 50 characters to see AI analysis...
                  </Text>
                )}

                {isAnalyzing && (
                  <Text style={styles.aiAnalyzing}>
                    Analyzing your content...
                  </Text>
                )}

                {aiPreview && !isAnalyzing && (
                  <View style={styles.aiResults}>
                    {aiPreview.analysis?.summary && (
                      <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>Summary:</Text>
                        <Text style={styles.aiSectionContent}>
                          {aiPreview.analysis.summary}
                        </Text>
                      </View>
                    )}

                    {aiPreview.analysis?.sentiment && (
                      <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>Sentiment:</Text>
                        <Chip 
                          style={[
                            styles.sentimentChip, 
                            { backgroundColor: getSentimentColor(aiPreview.analysis.sentiment) }
                          ]}
                          textStyle={{ color: 'white' }}
                        >
                          {aiPreview.analysis.sentiment}
                        </Chip>
                      </View>
                    )}

                    {aiPreview.analysis?.keywords && aiPreview.analysis.keywords.length > 0 && (
                      <View style={styles.aiSection}>
                        <Text style={styles.aiSectionTitle}>Keywords:</Text>
                        <View style={styles.keywordsContainer}>
                          {aiPreview.analysis.keywords.slice(0, 5).map((keyword, index) => (
                            <Chip key={index} style={styles.keywordChip} compact>
                              {keyword}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}

                    <Text style={styles.aiNote}>
                      💡 This is a preview. Final analysis will be saved with your note.
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Fixed Action Bar */}
      <View style={styles.actionBar}>
        <Button 
          mode="outlined" 
          onPress={handleCancel}
          style={styles.cancelButton}
          contentStyle={styles.buttonContent}
          disabled={isSaving || isProcessingImage}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isProcessingImage}
          style={styles.saveButton}
          contentStyle={styles.buttonContent}
          icon="content-save"
        >
          {isSaving 
            ? (isEditing ? 'Updating...' : 'Saving...') 
            : (isEditing ? 'Update' : 'Save')
          } Note
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

// ✅ Add new styles for image functionality
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  titleInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  categoryInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  contentSection: {
    marginBottom: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiToggleLabel: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  contentInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 200,
    maxHeight: 400,
  },
  // ✅ AI Preview Styles
  aiPreviewCard: {
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  aiPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  aiHint: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  aiAnalyzing: {
    fontSize: 14,
    color: '#6366f1',
    fontStyle: 'italic',
  },
  aiResults: {
    gap: 12,
  },
  aiSection: {
    marginBottom: 8,
  },
  aiSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#6366f1',
  },
  aiSectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  sentimentChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordChip: {
    marginRight: 0,
    marginBottom: 0,
  },
  aiNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#6366f1',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  // New styles for image functionality
  processingCard: {
    marginTop: 8,
    backgroundColor: '#e3f2fd',
  },
  processingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#1976d2',
  },
  imageAnalysisCard: {
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  imageAnalysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: 12,
  },
  analysisSection: {
    marginBottom: 12,
  },
  analysisSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#ff9800',
  },
  extractedText: {
    fontSize: 14,
    backgroundColor: '#fff3e0',
    padding: 8,
    borderRadius: 4,
    color: '#333',
  },
});