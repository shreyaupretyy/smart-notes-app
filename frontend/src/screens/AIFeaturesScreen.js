// src/screens/AIFeaturesScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import {
  Card,
  Button,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { useMutation } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import ImagePickerComponent from '../components/ImagePicker';
import AudioRecorder from '../components/AudioRecorder';

export default function AIFeaturesScreen({ navigation }) {
  // Text Analysis State
  const [textInput, setTextInput] = useState('');
  const [textAnalysis, setTextAnalysis] = useState(null);

  // Image Processing State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);

  // ✅ Voice to Text State
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [transcriptionResult, setTranscriptionResult] = useState(null);

  // Text Analysis Mutation
  const textAnalysisMutation = useMutation({
    mutationFn: (text) => apiService.analyzeText(text),
    onSuccess: (response) => {
      if (response.data?.analysis) {
        setTextAnalysis(response.data.analysis);
      }
    },
    onError: (error) => {
      console.error('❌ Text analysis error:', error);
      Alert.alert('Error', 'Failed to analyze text');
    }
  });

  // Image Processing Mutation
  const imageProcessingMutation = useMutation({
    mutationFn: (base64Data) => apiService.processImage(base64Data),
    onSuccess: (response) => {
      if (response.data?.result) {
        setImageAnalysis(response.data.result);
        console.log('✅ Image analysis complete:', response.data.result);
      }
    },
    onError: (error) => {
      console.error('❌ Image processing error:', error);
      Alert.alert('Error', 'Failed to process image');
    }
  });

  // ✅ Voice to Text Mutation
  const audioProcessingMutation = useMutation({
    mutationFn: (base64Data) => {
      console.log('🎤 Processing audio for voice-to-text...');
      return apiService.processAudio(base64Data);
    },
    onMutate: () => {
      setTranscriptionResult(null);
    },
    onSuccess: (response) => {
      console.log('✅ Voice-to-text processing complete:', response.data);
      
      if (response.data?.result) {
        const result = response.data.result;
        setTranscriptionResult(result);
        
        // Show success message
        if (result.transcribed_text && 
            result.transcribed_text !== "No speech detected in audio" &&
            !result.transcribed_text.toLowerCase().includes('error')) {
          Alert.alert('Success!', 'Speech converted to text successfully');
        } else {
          Alert.alert('No Speech Detected', 'Please try recording again with clearer speech');
        }
      }
    },
    onError: (error) => {
      console.error('❌ Voice-to-text processing error:', error);
      Alert.alert('Error', 'Failed to process audio. Please try again.');
    }
  });

  // Handlers
  const handleTextAnalysis = () => {
    if (!textInput.trim()) {
      Alert.alert('Error', 'Please enter some text to analyze');
      return;
    }
    textAnalysisMutation.mutate(textInput.trim());
  };

  // Handle Image Selection and Processing
  const handleImageSelected = async (imageData) => {
    setSelectedImage(imageData);
    setImageAnalysis(null); // Reset previous analysis
    
    if (imageData) {
      console.log('🖼️ Processing image in AI Features...');
      imageProcessingMutation.mutate(imageData.base64);
    }
  };

  // ✅ Handle Audio Recording and Processing
  const handleAudioRecorded = async (audioData) => {
    setSelectedAudio(audioData);
    
    if (audioData && audioData.base64) {
      console.log('🎤 Starting voice-to-text conversion...');
      audioProcessingMutation.mutate(audioData.base64);
    }
  };

  // ✅ Clear Audio Results
  const handleClearAudio = () => {
    setSelectedAudio(null);
    setTranscriptionResult(null);
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🤖 AI Features Test</Text>
        <Text style={styles.subtitle}>
          Test various AI capabilities of your Smart Notes app
        </Text>

        {/* Text Analysis Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📝 Text Analysis</Text>
            <Text style={styles.sectionDescription}>
              Test sentiment analysis, keyword extraction, and summarization
            </Text>
            
            <TextInput
              style={styles.textInput}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Enter text to analyze (minimum 50 characters)..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <Button
              mode="contained"
              onPress={handleTextAnalysis}
              loading={textAnalysisMutation.isPending}
              disabled={textAnalysisMutation.isPending}
              style={styles.actionButton}
              icon="brain"
            >
              Analyze Text
            </Button>

            {textAnalysis && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Analysis Results:</Text>
                
                {textAnalysis.sentiment && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Sentiment:</Text>
                    <Chip 
                      style={[
                        styles.sentimentChip, 
                        { backgroundColor: getSentimentColor(textAnalysis.sentiment) }
                      ]}
                      textStyle={{ color: 'white' }}
                    >
                      {textAnalysis.sentiment}
                    </Chip>
                  </View>
                )}

                {textAnalysis.summary && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Summary:</Text>
                    <Text style={styles.resultText}>{textAnalysis.summary}</Text>
                  </View>
                )}

                {textAnalysis.keywords && textAnalysis.keywords.length > 0 && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Keywords:</Text>
                    <View style={styles.keywordsContainer}>
                      {textAnalysis.keywords.slice(0, 10).map((keyword, index) => (
                        <Chip key={index} style={styles.keywordChip} compact>
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

        {/* Image Processing Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📷 Image Processing</Text>
            <Text style={styles.sectionDescription}>
              Test OCR text extraction and image analysis
            </Text>
            
            <ImagePickerComponent 
              onImageSelected={handleImageSelected}
              currentImage={selectedImage}
            />

            {imageProcessingMutation.isPending && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.processingText}>
                  Processing image with AI models...
                </Text>
              </View>
            )}

            {imageAnalysis && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Image Analysis Results:</Text>
                
                {imageAnalysis.extracted_text && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Extracted Text:</Text>
                    <Text style={styles.extractedTextResult}>
                      {imageAnalysis.extracted_text}
                    </Text>
                  </View>
                )}

                {imageAnalysis.analysis && (
                  <>
                    {imageAnalysis.analysis.sentiment && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Text Sentiment:</Text>
                        <Chip 
                          style={[
                            styles.sentimentChip, 
                            { backgroundColor: getSentimentColor(imageAnalysis.analysis.sentiment) }
                          ]}
                          textStyle={{ color: 'white' }}
                        >
                          {imageAnalysis.analysis.sentiment}
                        </Chip>
                      </View>
                    )}

                    {imageAnalysis.analysis.keywords && imageAnalysis.analysis.keywords.length > 0 && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Text Keywords:</Text>
                        <View style={styles.keywordsContainer}>
                          {imageAnalysis.analysis.keywords.slice(0, 8).map((keyword, index) => (
                            <Chip key={index} style={styles.keywordChip} compact>
                              {keyword}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}

                    {imageAnalysis.analysis.summary && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Text Summary:</Text>
                        <Text style={styles.resultText}>
                          {imageAnalysis.analysis.summary}
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.successNote}>
                  ✅ Image processed successfully with OCR and AI analysis
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* ✅ Voice to Text Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🎤 Voice to Text</Text>
            <Text style={styles.sectionDescription}>
              Test speech recognition and voice analysis
            </Text>
            
            <View style={styles.voiceContainer}>
              <Text style={styles.instructionText}>
                Tap the record button below and speak clearly. Your speech will be converted to text.
              </Text>
              
              <View style={styles.recorderContainer}>
                <AudioRecorder 
                  onAudioRecorded={handleAudioRecorded}
                  currentAudio={selectedAudio}
                />
              </View>

              {selectedAudio && (
                <Button
                  mode="outlined"
                  onPress={handleClearAudio}
                  style={styles.clearButton}
                  icon="delete"
                >
                  Clear Recording
                </Button>
              )}
            </View>

            {audioProcessingMutation.isPending && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.processingText}>
                  Converting speech to text...
                </Text>
              </View>
            )}

            {transcriptionResult && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>Voice Analysis Results:</Text>
                
                {/* Transcribed Text */}
                {transcriptionResult.transcribed_text && (
                  <View style={styles.resultItem}>
                    <Text style={styles.resultLabel}>Transcribed Text:</Text>
                    <Text style={styles.transcribedTextResult}>
                      {transcriptionResult.transcribed_text}
                    </Text>
                  </View>
                )}

                {/* Audio Analysis */}
                {transcriptionResult.analysis && (
                  <>
                    {transcriptionResult.analysis.sentiment && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Speech Sentiment:</Text>
                        <Chip 
                          style={[
                            styles.sentimentChip,
                            { backgroundColor: getSentimentColor(transcriptionResult.analysis.sentiment) }
                          ]}
                          textStyle={{ color: 'white' }}
                        >
                          {transcriptionResult.analysis.sentiment}
                        </Chip>
                      </View>
                    )}

                    {transcriptionResult.analysis.keywords && transcriptionResult.analysis.keywords.length > 0 && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Speech Keywords:</Text>
                        <View style={styles.keywordsContainer}>
                          {transcriptionResult.analysis.keywords.slice(0, 8).map((keyword, index) => (
                            <Chip key={index} style={styles.keywordChip} compact>
                              {keyword}
                            </Chip>
                          ))}
                        </View>
                      </View>
                    )}

                    {transcriptionResult.analysis.summary && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>Speech Summary:</Text>
                        <Text style={styles.resultText}>
                          {transcriptionResult.analysis.summary}
                        </Text>
                      </View>
                    )}

                    {transcriptionResult.analysis.confidence && (
                      <View style={styles.resultItem}>
                        <Text style={styles.resultLabel}>
                          Recognition Confidence: {Math.round(transcriptionResult.analysis.confidence * 100)}%
                        </Text>
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.successNote}>
                  ✅ Voice processed successfully with speech recognition and AI analysis
                </Text>
              </View>
            )}

            {/* Tips for better voice recognition */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>💡 Tips for Better Results:</Text>
              <Text style={styles.tipText}>• Speak clearly and at moderate pace</Text>
              <Text style={styles.tipText}>• Record in a quiet environment</Text>
              <Text style={styles.tipText}>• Hold device close to your mouth</Text>
              <Text style={styles.tipText}>• Speak for at least 3-5 seconds</Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  sectionCard: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#6366f1',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    minHeight: 100,
  },
  actionButton: {
    marginBottom: 16,
  },
  
  // Image Processing Styles
  processingContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginVertical: 16,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#1976d2',
    textAlign: 'center',
  },
  extractedTextResult: {
    fontSize: 14,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 6,
    color: '#333',
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
  },
  
  // ✅ Voice to Text Styles
  voiceContainer: {
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  recorderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  clearButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  transcribedTextResult: {
    fontSize: 14,
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 6,
    color: '#333',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    lineHeight: 20,
  },
  tipsContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 4,
  },
  
  successNote: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Results Styles
  resultsContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  resultItem: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#6366f1',
  },
  resultText: {
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
    marginBottom: 6,
  },
});