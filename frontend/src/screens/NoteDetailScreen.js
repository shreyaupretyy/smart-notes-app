import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, Share, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Appbar, Menu, ActivityIndicator, Text, Divider } from 'react-native-paper';
import { NotesContext } from '../contexts/NotesContext';
import { apiClient } from '../api/apiClient';
import { formatDate } from '../utils/dateUtils';
import AIFeaturesMenu from '../components/AIFeaturesMenu';

const NoteDetailScreen = ({ route, navigation }) => {
  const { noteId } = route.params;
  const { notes, updateNote, deleteNote } = useContext(NotesContext);
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState('');

  useEffect(() => {
    const foundNote = notes.find((n) => n.id === noteId);
    if (foundNote) {
      setNote(foundNote);
      setTitle(foundNote.title);
      setContent(foundNote.content);
    } else {
      Alert.alert('Error', 'Note not found');
      navigation.goBack();
    }
  }, [noteId, notes]);

  if (!note) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
    
    updateNote(noteId, {
      title,
      content,
    });
    
    setIsEditing(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: () => {
            deleteNote(noteId);
            navigation.goBack();
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        title: note.title,
        message: `${note.title}\n\n${note.content}`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share note');
    }
  };

  const pickImage = async () => {
    closeMenu();
    Alert.alert(
      'Image to Text',
      'This feature would extract text from an image and add it to your note. In this demo version, we\'ll simulate this by adding placeholder text.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Simulate',
          onPress: () => {
            setIsProcessing(true);
            setProcessingAction('Converting image to text...');
            setTimeout(() => {
              const extractedText = "This is extracted text from your image. In a production app, this would be the actual text extracted from the image using OCR technology.";
              setContent(content ? `${content}\n\n${extractedText}` : extractedText);
              setIsProcessing(false);
            }, 2000);
          },
        },
      ]
    );
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
        updateNote(noteId, {
          title,
          content: `${content}\n\n## Summary\n${summary}`,
        });
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
        const newContent = `${content}\n\n## Suggestions\n${suggestionsText}`;
        setContent(newContent);
        updateNote(noteId, {
          title,
          content: newContent,
        });
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
        <Appbar.Content title={isEditing ? "Edit Note" : "Note Details"} />
        
        {isEditing ? (
          <Appbar.Action icon="content-save" onPress={handleSave} />
        ) : (
          <>
            <Appbar.Action icon="pencil" onPress={() => setIsEditing(true)} />
            <Appbar.Action icon="magic-staff" onPress={openMenu} />
            <Appbar.Action icon="share-variant" onPress={handleShare} />
          </>
        )}
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
          {isEditing ? (
            <>
              <TextInput
                label="Title"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                mode="outlined"
              />
              <TextInput
                label="Content"
                value={content}
                onChangeText={setContent}
                style={styles.contentInput}
                multiline
                numberOfLines={10}
                mode="outlined"
              />
            </>
          ) : (
            <>
              <Text variant="headlineSmall" style={styles.title}>{title}</Text>
              <Text variant="bodySmall" style={styles.date}>
                Created: {formatDate(note.createdAt)}
              </Text>
              <Text variant="bodySmall" style={styles.date}>
                Last updated: {formatDate(note.updatedAt)}
              </Text>
              <Divider style={styles.divider} />
              <Text style={styles.contentText}>{content}</Text>
              
              <View style={styles.actionButtons}>
                <Menu
                  visible={visible}
                  onDismiss={closeMenu}
                  anchor={<View />}
                >
                  <Menu.Item onPress={handleDelete} title="Delete Note" leadingIcon="delete" />
                </Menu>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {!isEditing && (
        <View style={styles.deleteButtonContainer}>
          <Button 
            mode="contained" 
            onPress={handleDelete} 
            buttonColor="#F44336"
            textColor="#ffffff"
          >
            Delete Note
          </Button>
        </View>
      )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  date: {
    marginBottom: 4,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    minHeight: 200,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
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
  deleteButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
});

export default NoteDetailScreen;