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
import { useMutation, useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';
import ImagePickerComponent from '../components/ImagePicker'; // ✅ Import ImagePicker

export default function AIFeaturesScreen({ navigation }) {
  // Text Analysis State
  const [textInput, setTextInput] = useState('');
  const [textAnalysis, setTextAnalysis] = useState(null);

  // ✅ Image Processing State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageAnalysis, setImageAnalysis] = useState(null);

  // GPU Info State
  const [gpuInfo, setGpuInfo] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

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

  // ✅ Image Processing Mutation
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

  // GPU Info Query
  const { data: gpuInfoData, isLoading: isLoadingGPUInfo } = useQuery({
    queryKey: ['gpu-info'],
    queryFn: () => apiService.getGPUInfo(),
    onSuccess: (response) => {
      if (response.data) {
        setGpuInfo(response.data);
      }
    },
    onError: (error) => {
      console.error('❌ GPU info error:', error);
      Alert.alert('Error', 'Failed to get GPU information');
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

  // ✅ Handle Image Selection and Processing
  const handleImageSelected = async (imageData) => {
    setSelectedImage(imageData);
    setImageAnalysis(null); // Reset previous analysis
    
    if (imageData) {
      console.log('🖼️ Processing image in AI Features...');
      imageProcessingMutation.mutate(imageData.base64);
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4caf50';
      case 'negative': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  if (isLoadingGPUInfo) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading AI information...</Text>
      </View>
    );
  }

  const gpu = gpuInfo?.data?.gpu_info;
  const services = gpuInfo?.data?.ai_services;

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

        {/* ✅ Image Processing Section */}
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

        <Divider style={styles.divider} />

        {/* GPU Information Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>🎮 GPU Information</Text>
            <Text style={styles.sectionDescription}>
              Check GPU status and AI model information
            </Text>
            
            <Button
              mode="outlined"
              onPress={handleGPUInfo}
              loading={gpuInfoMutation.isPending}
              disabled={gpuInfoMutation.isPending}
              style={styles.actionButton}
              icon="memory"
            >
              Get GPU Info
            </Button>

            {gpuInfo && (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>System Information:</Text>
                
                {gpuInfo.gpu_info && (
                  <View style={styles.gpuInfoContainer}>
                    <Text style={styles.gpuInfoText}>
                      🎮 GPU: {gpuInfo.gpu_info.gpu_name || 'Not available'}
                    </Text>
                    <Text style={styles.gpuInfoText}>
                      💾 Memory: {gpuInfo.gpu_info.gpu_memory_allocated} / {gpuInfo.gpu_info.gpu_memory_total}
                    </Text>
                    <Text style={styles.gpuInfoText}>
                      🔥 CUDA: {gpuInfo.gpu_info.cuda_available ? 'Available' : 'Not available'}
                    </Text>
                  </View>
                )}

                {gpuInfo.ai_services && (
                  <View style={styles.servicesContainer}>
                    <Text style={styles.servicesTitle}>AI Services Status:</Text>
                    {Object.entries(gpuInfo.ai_services).map(([service, info]) => (
                      <View key={service} style={styles.serviceItem}>
                        <Text style={styles.serviceName}>{service}:</Text>
                        <Chip 
                          style={[
                            styles.statusChip,
                            { backgroundColor: info.status === 'available' ? '#4caf50' : '#f44336' }
                          ]}
                          textStyle={{ color: 'white' }}
                          compact
                        >
                          {info.status}
                        </Chip>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
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
  
  // ✅ Image Processing Styles
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
  
  // GPU Info Styles
  gpuInfoContainer: {
    backgroundColor: '#e8f5e8',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  gpuInfoText: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  servicesContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  divider: {
    marginVertical: 20,
    backgroundColor: '#ddd',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});