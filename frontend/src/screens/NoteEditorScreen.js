import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Appbar, Menu, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useNotes } from '../contexts/NoteContext';
import { generateUniqueId } from '../utils/helpers';

const NoteEditorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { activeNote, categories, createNote, updateNote, clearActiveNote } = useNotes();
  
  // Initialize note from route params or active note
  const noteFromParams = route.params?.note;
  const initialNote = noteFromParams || activeNote || { 
    title: '', 
    content: '', 
    categoryId: null 
  };
  
  // State for note data
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [categoryId, setCategoryId] = useState(initialNote.categoryId);
  const [visible, setVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Update state when active note changes
  useEffect(() => {
    if (activeNote) {
      setTitle(activeNote.title);
      setContent(activeNote.content);
      setCategoryId(activeNote.categoryId);
    }
    
    // Clean up when component unmounts
    return () => {
      clearActiveNote();
    };
  }, [activeNote]);
  
  // Save note
  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    
    setIsSaving(true);
    
    const noteData = {
      title: title.trim(),
      content: content.trim(),
      categoryId
    };
    
    try {
      if (initialNote.id) {
        await updateNote(initialNote.id, noteData);
      } else {
        await createNote(noteData);
      }
      navigation.goBack();
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Open/close category menu
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  
  // Get category name
  const getCategoryName = () => {
    if (!categoryId) return 'Select Category';
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Select Category';
  };
  
  // Select category
  const handleSelectCategory = (id) => {
    setCategoryId(id);
    closeMenu();
  };
  
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={initialNote.id ? 'Edit Note' : 'New Note'} />
        <Appbar.Action icon="check" onPress={handleSave} disabled={isSaving} />
      </Appbar.Header>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={styles.content}
        keyboardVerticalOffset={90}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TextInput
            mode="outlined"
            label="Title"
            value={title}
            onChangeText={setTitle}
            style={styles.titleInput}
            placeholder="Note title..."
          />
          
          <Menu
            visible={visible}
            onDismiss={closeMenu}
            anchor={
              <Button 
                mode="outlined" 
                onPress={openMenu} 
                style={styles.categoryButton}
                icon="tag"
              >
                {getCategoryName()}
              </Button>
            }
          >
            <Menu.Item 
              onPress={() => handleSelectCategory(null)} 
              title="No Category" 
            />
            <Divider />
            {categories.map(category => (
              <Menu.Item
                key={category.id}
                onPress={() => handleSelectCategory(category.id)}
                title={category.name}
              />
            ))}
          </Menu>
          
          <TextInput
            mode="outlined"
            label="Content"
            value={content}
            onChangeText={setContent}
            multiline
            style={styles.contentInput}
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  titleInput: {
    marginBottom: 16,
    fontSize: 18,
  },
  categoryButton: {
    marginBottom: 16,
  },
  contentInput: {
    flex: 1,
    minHeight: 200,
  },
});

export default NoteEditorScreen;