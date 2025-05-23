import AsyncStorage from '@react-native-async-storage/async-storage';
import { notesApi } from '../api/apiClient';

const OFFLINE_QUEUE_KEY = 'offline_queue';
const OFFLINE_NOTES_KEY = 'offline_notes';

// Queue for storing offline operations
export const queueOfflineOperation = async (operation) => {
  try {
    // Get existing queue
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueString ? JSON.parse(queueString) : [];
    
    // Add new operation with timestamp
    queue.push({
      ...operation,
      timestamp: Date.now()
    });
    
    // Save updated queue
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    console.log('Operation queued for offline sync:', operation.type);
    
    return true;
  } catch (error) {
    console.error('Error queueing offline operation:', error);
    return false;
  }
};

// Process offline queue when back online
export const processOfflineQueue = async () => {
  try {
    const queueString = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueString) return;
    
    const queue = JSON.parse(queueString);
    if (!queue || !queue.length) return;
    
    console.log(`Processing ${queue.length} offline operations...`);
    
    // Get offline notes
    const offlineNotesString = await AsyncStorage.getItem(OFFLINE_NOTES_KEY);
    const offlineNotes = offlineNotesString ? JSON.parse(offlineNotesString) : {};
    
    // Process each operation
    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      
      try {
        switch (op.type) {
          case 'CREATE_NOTE':
            await notesApi.createNote(op.data);
            break;
          case 'UPDATE_NOTE':
            await notesApi.updateNote(op.data.id, op.data);
            break;
          case 'DELETE_NOTE':
            await notesApi.deleteNote(op.data.id);
            break;
          default:
            console.warn('Unknown operation type:', op.type);
        }
        
        // Remove from offline notes if it was a delete operation
        if (op.type === 'DELETE_NOTE' && offlineNotes && offlineNotes[op.data.id]) {
          delete offlineNotes[op.data.id];
        }
        
      } catch (error) {
        console.error(`Error processing operation ${op.type}:`, error);
        // Keep failed operations in queue
        continue;
      }
    }
    
    // Clear queue and update offline notes
    await AsyncStorage.setItem(OFFLINE_NOTES_KEY, JSON.stringify(offlineNotes || {}));
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    
    console.log('Offline sync completed');
    return true;
  } catch (error) {
    console.error('Error processing offline queue:', error);
    return false;
  }
};

// Network connectivity listener - fixing to handle missing NetInfo
export const setupNetworkListener = (dispatch) => {
  try {
    // Safely import NetInfo if available
    const NetInfo = require('@react-native-community/netinfo');
    
    return NetInfo.addEventListener(state => {
      const isConnected = state.isConnected && state.isInternetReachable;
      
      dispatch({ 
        type: 'SET_NETWORK_STATUS', 
        payload: isConnected 
      });
      
      if (isConnected) {
        processOfflineQueue();
      }
    });
  } catch (error) {
    console.error('NetInfo not available:', error);
    // Set default to online if NetInfo is not available
    dispatch({ type: 'SET_NETWORK_STATUS', payload: true });
    return null;
  }
};

// Save note offline
export const saveNoteOffline = async (note) => {
  if (!note) return false;
  
  try {
    const offlineNotesString = await AsyncStorage.getItem(OFFLINE_NOTES_KEY);
    const offlineNotes = offlineNotesString ? JSON.parse(offlineNotesString) : {};
    
    offlineNotes[note.id] = {
      ...note,
      updatedAt: Date.now(),
      _offlineCreated: note._offlineCreated || !note.id.includes('server_')
    };
    
    await AsyncStorage.setItem(OFFLINE_NOTES_KEY, JSON.stringify(offlineNotes));
    return true;
  } catch (error) {
    console.error('Error saving note offline:', error);
    return false;
  }
};

// Get offline notes
export const getOfflineNotes = async () => {
  try {
    const offlineNotesString = await AsyncStorage.getItem(OFFLINE_NOTES_KEY);
    return offlineNotesString ? JSON.parse(offlineNotesString) : {};
  } catch (error) {
    console.error('Error getting offline notes:', error);
    return {};
  }
};