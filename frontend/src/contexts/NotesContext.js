import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NotesContext = createContext();

/**
 * Provider component for managing notes state throughout the app
 */
export const NotesProvider = ({ children }) => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load notes from storage on app start
  useEffect(() => {
    loadNotes();
  }, []);

  // Save notes to storage whenever notes change
  useEffect(() => {
    if (!isLoading) {
      saveNotes();
    }
  }, [notes]);

  /**
   * Load notes from AsyncStorage
   */
  const loadNotes = async () => {
    try {
      const storedNotes = await AsyncStorage.getItem('notes');
      if (storedNotes !== null) {
        setNotes(JSON.parse(storedNotes));
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Save notes to AsyncStorage
   */
  const saveNotes = async () => {
    try {
      await AsyncStorage.setItem('notes', JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save notes:', error);
    }
  };

  /**
   * Add a new note
   */
  const addNote = (newNote) => {
    const noteWithId = {
      ...newNote,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes([noteWithId, ...notes]); // Add to beginning
  };

  /**
   * Update an existing note
   */
  const updateNote = (id, updatedData) => {
    const updatedNotes = notes.map((note) =>
      note.id === id
        ? {
            ...note,
            ...updatedData,
            updatedAt: new Date().toISOString(),
          }
        : note
    );
    // Move the updated note to the top of the list
    const updatedNote = updatedNotes.find(note => note.id === id);
    const filteredNotes = updatedNotes.filter(note => note.id !== id);
    setNotes([updatedNote, ...filteredNotes]);
  };

  /**
   * Delete a note
   */
  const deleteNote = (id) => {
    setNotes(notes.filter((note) => note.id !== id));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        isLoading,
        addNote,
        updateNote,
        deleteNote,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};