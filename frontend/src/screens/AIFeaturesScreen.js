// src/screens/AIFeaturesScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  Alert 
} from 'react-native';
import { 
  Card, 
  Button, 
  ActivityIndicator,
  Chip 
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiService } from '../services/api';

export default function AIFeaturesScreen({ navigation }) {
  const [testResults, setTestResults] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const { data: gpuInfo, isLoading } = useQuery({
    queryKey: ['gpu-info'],
    queryFn: () => apiService.getGPUInfo(),
  });

  const runAITests = async () => {
    setIsRunningTests(true);
    try {
      const [imageTest, speechTest] = await Promise.all([
        apiService.testImageProcessing(),
        apiService.testSpeechProcessing(),
      ]);

      setTestResults({
        imageProcessing: imageTest.data,
        speechProcessing: speechTest.data,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to run AI tests');
    } finally {
      setIsRunningTests(false);
    }
  };

  if (isLoading) {
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
      {/* GPU Information */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🎮 GPU Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>CUDA Available:</Text>
            <Chip style={gpu?.cuda_available ? styles.successChip : styles.errorChip}>
              {gpu?.cuda_available ? 'Yes' : 'No'}
            </Chip>
          </View>

          {gpu?.cuda_available && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.label}>GPU:</Text>
                <Text style={styles.value}>{gpu.gpu_name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.label}>Memory:</Text>
                <Text style={styles.value}>{gpu.gpu_memory_total}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Allocated:</Text>
                <Text style={styles.value}>{gpu.gpu_memory_allocated}</Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* AI Services Status */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🤖 AI Services Status</Text>
          
          {services && Object.entries(services).map(([serviceName, service]) => (
            <View key={serviceName} style={styles.serviceRow}>
              <Icon 
                name={service.status === 'available' ? 'check-circle' : 'error'} 
                size={20} 
                color={service.status === 'available' ? '#4caf50' : '#f44336'} 
              />
              <Text style={styles.serviceName}>
                {serviceName.replace('_', ' ').toUpperCase()}
              </Text>
              <Chip style={service.status === 'available' ? styles.successChip : styles.errorChip}>
                {service.status}
              </Chip>
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* AI Tools */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>🛠️ AI Tools</Text>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('CreateNote')}
            icon="note-plus"
            style={styles.toolButton}
          >
            Create Smart Note
          </Button>

          <Button
            mode="outlined"
            onPress={runAITests}
            icon="flask"
            loading={isRunningTests}
            disabled={isRunningTests}
            style={styles.toolButton}
          >
            Run AI Performance Tests
          </Button>

          <Button
            mode="outlined"
            onPress={() => Alert.alert('Coming Soon', 'Image OCR feature coming soon!')}
            icon="camera"
            style={styles.toolButton}
          >
            Scan Image to Text
          </Button>

          <Button
            mode="outlined"
            onPress={() => Alert.alert('Coming Soon', 'Voice transcription feature coming soon!')}
            icon="microphone"
            style={styles.toolButton}
          >
            Voice to Text
          </Button>
        </Card.Content>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>🧪 Test Results</Text>
            
            <Text style={styles.sectionTitle}>Image Processing:</Text>
            <Text style={styles.testResult}>
              Status: {testResults.imageProcessing.status}
            </Text>
            {testResults.imageProcessing.model_info && (
              <Text style={styles.testResult}>
                Device: {testResults.imageProcessing.model_info.device}
              </Text>
            )}

            <Text style={styles.sectionTitle}>Speech Processing:</Text>
            <Text style={styles.testResult}>
              Status: {testResults.speechProcessing.status}
            </Text>
            <Text style={styles.testResult}>
              Whisper Available: {testResults.speechProcessing.model_info?.whisper_available ? 'Yes' : 'No'}
            </Text>
          </Card.Content>
        </Card>
      )}
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
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  serviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  successChip: {
    backgroundColor: '#e8f5e8',
  },
  errorChip: {
    backgroundColor: '#ffeaea',
  },
  toolButton: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  testResult: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});