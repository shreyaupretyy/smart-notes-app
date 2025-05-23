import React, { useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Appbar, ActivityIndicator, Text, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import { NotesContext } from '../contexts/NotesContext';
import { apiClient } from '../api/apiClient';
import AIFeaturesMenu from '../components/AIFeaturesMenu';

const CreateNoteScreen = ({ navigation }) => {
  const { addNote } = useContext(NotesContext);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visible, setVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState('');

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const handleSave = () => {
    if (title.trim() === '') {
      Alert.alert('Missing Title', 'Please enter a title for your note');
      return;
    }
    
    if (content.trim() === '') {
      Alert.alert('Missing Content', 'Please enter some content for your note');
      return;
    }
    
    addNote({
      title,
      content,
    });
    navigation.goBack();
  };

  const pickImage = async () => {
    closeMenu();
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingAction('Converting image to text...');
      
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
        base64: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        // In a real implementation, we would send the base64 image to the backend
        try {
          // Simulate API call - in production, use the actual API
          // const response = await apiClient.extractTextFromImage(asset.base64);
          
          // For demo purposes, simulate the result
          setTimeout(() => {
            const extractedText = "This is extracted text from your image. In a production app, this would be the actual text extracted from the image using OCR technology.";
            setContent(content ? `${content}\n\n${extractedText}` : extractedText);
            setIsProcessing(false);
          }, 2000);
        } catch (error) {
          Alert.alert('Error', 'Failed to extract text from image');
          setIsProcessing(false);
        }
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error picking or processing image');
      setIsProcessing(false);
    }
  };

  const startSpeechToText = () => {
    closeMenu();
    Alert.alert(
      'Speech to Text',
      'This feature would record your voice and convert it to text. In this demo version, we\'ll simulate this by adding placeholder text.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Simulate',
          onPress: () => {
            setIsProcessing(true);
            setProcessingAction('Converting speech to text...');
            setTimeout(() => {
              const transcribedText = "This is simulated transcribed text from speech. In a production app, this would be the actual text converted from your voice recording.";
              setContent(content ? `${content}\n\n${transcribedText}` : transcribedText);
              setIsProcessing(false);
            }, 2000);
          },
        },
      ]
    );
  };

  const summarizeContent = async () => {
    closeMenu();
    if (content.trim().length < 50) {
      Alert.alert('Not Enough Content', 'Please add more content to summarize (at least 50 characters)');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingAction('Generating summary...');
      
      // In production, use the actual API
      // const response = await apiClient.summarizeText(content);
      
      // For demo purposes, simulate the result
      setTimeout(() => {
        const summary = "This is a simulated AI-generated summary of your note content. In a production app, this would be an actual summary generated using natural language processing.";
        setContent(`${content}\n\n## Summary\n${summary}`);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error generating summary');
      setIsProcessing(false);
    }
  };

  const getSuggestions = async () => {
    closeMenu();
    if (content.trim().length < 20) {
      Alert.alert('Not Enough Content', 'Please add more content to get suggestions (at least 20 characters)');
      return;
    }
    
    try {
      setIsProcessing(true);
      setProcessingAction('Getting suggestions...');
      
      // In production, use the actual API
      // const response = await apiClient.getSuggestions(content);
      
      // For demo purposes, simulate the result
      setTimeout(() => {
        const suggestions = [
          "Consider adding more details about the implementation steps.",
          "You might want to include references or sources for your information.",
          "Try organizing your note with headings for better readability."
        ];
        
        const suggestionsText = suggestions.map(s => `- ${s}`).join('\n');
        setContent(`${content}\n\n## Suggestions\n${suggestionsText}`);
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Error getting suggestions');
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Create Note" />
        <Appbar.Action 
          icon="magic-staff" 
          onPress={openMenu} 
          disabled={isProcessing}
        />
        <Appbar.Action 
          icon="content-save" 
          onPress={handleSave} 
          disabled={isProcessing}
        />
      </Appbar.Header>
      
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.processingText}>{processingAction}</Text>
        </View>
      )}
      
      <AIFeaturesMenu
        visible={visible}
        onDismiss={closeMenu}
        onImageToText={pickImage}
        onSpeechToText={startSpeechToText}
        onSummarize={summarizeContent}
        onGetSuggestions={getSuggestions}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.content}>
          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
            mode="outlined"
            placeholder="Enter note title"
          />
          <TextInput
            label="Content"
            value={content}
            onChangeText={setContent}
            style={styles.contentInput}
            multiline
            numberOfLines={10}
            mode="outlined"
            placeholder="Write your note here..."
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    minHeight: 200,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreateNoteScreen;