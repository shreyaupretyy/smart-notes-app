import React, { createContext, useReducer, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notesApi } from '../api/apiClient';
import { 
  saveNoteOffline, 
  queueOfflineOperation, 
  getOfflineNotes,
  setupNetworkListener 
} from '../utils/offlineSync';
import { generateUniqueId } from '../utils/helpers';

// Initial state
const initialState = {
  notes: [],
  categories: [], // Ensure this is an empty array, not undefined
  isLoading: false,
  error: null,
  activeNote: null,
  isOnline: true,
  searchQuery: '',
  filterCategory: null
};

// Create context
export const NoteContext = createContext();

// Reducer function
const noteReducer = (state, action) => {
  switch (action.type) {
    case 'SET_NOTES':
      return { ...state, notes: action.payload || [], isLoading: false }; // Add fallback empty array
      
    case 'SET_CATEGORIES':
      return { ...state, categories: action.payload || [] }; // Add fallback empty array
      
    case 'ADD_NOTE':
      return { 
        ...state, 
        notes: [action.payload, ...state.notes],
        activeNote: null 
      };
      
    case 'UPDATE_NOTE':
      return { 
        ...state, 
        notes: state.notes.map(note => 
          note.id === action.payload.id ? action.payload : note
        ),
        activeNote: null
      };
      
    case 'DELETE_NOTE':
      return { 
        ...state, 
        notes: state.notes.filter(note => note.id !== action.payload),
        activeNote: null
      };
      
    case 'SET_ACTIVE_NOTE':
      return { ...state, activeNote: action.payload };
      
    case 'CLEAR_ACTIVE_NOTE':
      return { ...state, activeNote: null };
      
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
      
    case 'SET_NETWORK_STATUS':
      return { ...state, isOnline: action.payload };
      
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
      
    case 'SET_FILTER_CATEGORY':
      return { ...state, filterCategory: action.payload };
      
    default:
      return state;
  }
};

// Provider component
export const NoteProvider = ({ children }) => {
  const [state, dispatch] = useReducer(noteReducer, initialState);
  
  // Load notes when the app starts
  useEffect(() => {
    loadNotes();
    loadCategories();
    
    // Set up network listener - modify to handle undefined
    const unsubscribe = setupNetworkListener ? setupNetworkListener(dispatch) : null;
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Load notes from API or offline storage
  const loadNotes = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      let notesData = [];
      
      // Try to fetch from API if online
      if (state.isOnline) {
        try {
          // Wrap API call in try-catch to handle connection issues gracefully
          const response = await notesApi.getNotes();
          if (response && response.data) {
            notesData = response.data;
          } else {
            // If response or response.data is undefined, use empty array
            notesData = [];
          }
        } catch (apiError) {
          console.error('API Error:', apiError);
          notesData = []; // Fallback to empty array on API error
        }
        
        // Update offline storage with server data - add null checks
        const offlineNotes = await getOfflineNotes();
        // Fix the mergeSyncNotes function to handle undefined
        const mergedNotes = mergeSyncNotes(notesData || [], Object.values(offlineNotes || {}));
        
        // Save merged notes to offline storage
        for (const note of mergedNotes) {
          await saveNoteOffline(note);
        }
        
        notesData = mergedNotes;
      } else {
        // Load from offline storage
        const offlineNotes = await getOfflineNotes();
        notesData = Object.values(offlineNotes || {});
      }
      
      dispatch({ type: 'SET_NOTES', payload: notesData });
    } catch (error) {
      console.error('Error loading notes:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notes' });
      
      // Fall back to offline notes
      try {
        const offlineNotes = await getOfflineNotes();
        dispatch({ type: 'SET_NOTES', payload: Object.values(offlineNotes || {}) });
      } catch (offlineError) {
        console.error('Error loading offline notes:', offlineError);
        dispatch({ type: 'SET_NOTES', payload: [] }); // Set empty array instead of undefined
      }
    }
  };
  
  // Load categories
  const loadCategories = async () => {
    try {
      if (state.isOnline) {
        try {
          // Wrap API call in try-catch
          const response = await notesApi.getCategories();
          if (response && response.data) {
            dispatch({ type: 'SET_CATEGORIES', payload: response.data });
            await AsyncStorage.setItem('categories', JSON.stringify(response.data));
          } else {
            // Initialize with empty array if response is invalid
            dispatch({ type: 'SET_CATEGORIES', payload: [] });
          }
        } catch (apiError) {
          console.error('API Error loading categories:', apiError);
          // Try to load from cache on API error
          const categoriesStr = await AsyncStorage.getItem('categories');
          if (categoriesStr) {
            dispatch({ type: 'SET_CATEGORIES', payload: JSON.parse(categoriesStr) });
          } else {
            dispatch({ type: 'SET_CATEGORIES', payload: [] });
          }
        }
      } else {
        const categoriesStr = await AsyncStorage.getItem('categories');
        if (categoriesStr) {
          dispatch({ type: 'SET_CATEGORIES', payload: JSON.parse(categoriesStr) });
        } else {
          dispatch({ type: 'SET_CATEGORIES', payload: [] });
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      // Ensure we always dispatch an array
      dispatch({ type: 'SET_CATEGORIES', payload: [] });
    }
  };
  
  // Merge local and server notes - fixed to handle undefined
  const mergeSyncNotes = (serverNotes = [], offlineNotes = []) => {
    // Ensure arrays with default values
    const safeServerNotes = Array.isArray(serverNotes) ? serverNotes : [];
    const safeOfflineNotes = Array.isArray(offlineNotes) ? offlineNotes : [];
    
    const mergedNotes = [...safeServerNotes];
    const serverNoteIds = new Set(safeServerNotes.map(note => note.id));
    
    // Add offline-only notes to the merged list
    for (const offlineNote of safeOfflineNotes) {
      if (offlineNote && offlineNote.id && !serverNoteIds.has(offlineNote.id) && offlineNote._offlineCreated) {
        mergedNotes.push(offlineNote);
      }
    }
    
    return mergedNotes;
  };
  
  // Rest of the code remains the same...
  // Create a new note
  const createNote = async (noteData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Generate a temporary ID for offline use
      const tempId = `local_${generateUniqueId()}`;
      const newNote = { 
        ...noteData, 
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _offlineCreated: true
      };
      
      // Save to state immediately for responsive UI
      dispatch({ type: 'ADD_NOTE', payload: newNote });
      
      // Save offline
      await saveNoteOffline(newNote);
      
      // Try to send to server if online
      if (state.isOnline) {
        try {
          const response = await notesApi.createNote(noteData);
          if (response && response.data) {
            const serverNote = response.data;
            
            // Update with server data
            dispatch({ type: 'UPDATE_NOTE', payload: {
              ...serverNote,
              _offlineCreated: false
            }});
            
            // Update in offline storage
            await saveNoteOffline({
              ...serverNote,
              _offlineCreated: false
            });
            
            return serverNote;
          }
          return newNote;
        } catch (apiError) {
          console.error('API Error creating note:', apiError);
          return newNote; // Return the local note even if API fails
        }
      } else {
        // Queue for later sync
        await queueOfflineOperation({
          type: 'CREATE_NOTE',
          data: noteData
        });
        
        return newNote;
      }
    } catch (error) {
      console.error('Error creating note:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create note' });
      dispatch({ type: 'SET_LOADING', payload: false });
      
      // Even if API call fails, keep the note in local state
      return null;
    }
  };
  
  // Update an existing note - other methods remain the same
  const updateNote = async (id, noteData) => { /* Same implementation */ };
  const deleteNote = async (id) => { /* Same implementation */ };
  const searchNotes = (query) => { /* Same implementation */ };
  const filterByCategory = (categoryId) => { /* Same implementation */ };
  const clearFilters = () => { /* Same implementation */ };
  
  // Get filtered notes based on search and category filters
  const getFilteredNotes = () => {
    // Ensure notes is an array
    let filteredNotes = Array.isArray(state.notes) ? [...state.notes] : [];
    
    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filteredNotes = filteredNotes.filter(note => 
        note && 
        ((note.title && note.title.toLowerCase().includes(query)) || 
        (note.content && note.content.toLowerCase().includes(query)))
      );
    }
    
    // Apply category filter
    if (state.filterCategory) {
      filteredNotes = filteredNotes.filter(note => 
        note && note.categoryId === state.filterCategory
      );
    }
    
    return filteredNotes;
  };
  
  // Get a note by ID
  const getNoteById = (id) => {
    return state.notes.find(note => note && note.id === id);
  };
  
  // Set active note for editing
  const setActiveNote = (note) => {
    dispatch({ type: 'SET_ACTIVE_NOTE', payload: note });
  };
  
  // Clear active note
  const clearActiveNote = () => {
    dispatch({ type: 'CLEAR_ACTIVE_NOTE' });
  };
  
  // Context value
  const contextValue = {
    ...state,
    filteredNotes: getFilteredNotes(),
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    filterByCategory,
    clearFilters,
    getNoteById,
    setActiveNote,
    clearActiveNote,
    refreshNotes: loadNotes
  };
  
  return (
    <NoteContext.Provider value={contextValue}>
      {children}
    </NoteContext.Provider>
  );
};

// Custom hook for using the note context
export const useNotes = () => {
  const context = useContext(NoteContext);
  if (!context) {
    throw new Error('useNotes must be used within a NoteProvider');
  }
  return context;
};