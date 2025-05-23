import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API URL from AsyncStorage or use default
const getApiBaseUrl = async () => {
  try {
    const settings = await AsyncStorage.getItem('app_settings');
    if (settings) {
      const parsedSettings = JSON.parse(settings);
      return parsedSettings.apiUrl || 'https://your-api-url.com/api';
    }
  } catch (error) {
    console.error("Error getting API URL:", error);
  }
  return 'https://your-api-url.com/api';
};

// Create axios instance with defaults
const createApiClient = async () => {
  const baseURL = await getApiBaseUrl();
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
};

// Dummy implementations for offline development
const dummyNotes = [
  {
    id: 'note_1',
    title: 'Welcome to Smart Notes',
    content: 'This is a sample note to get you started. You can edit or delete it.',
    categoryId: 'cat_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'note_2',
    title: 'How to use categories',
    content: 'Organize your notes by assigning them to different categories.',
    categoryId: 'cat_2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const dummyCategories = [
  { id: 'cat_1', name: 'Personal', color: '#4caf50' },
  { id: 'cat_2', name: 'Work', color: '#2196f3' },
  { id: 'cat_3', name: 'Ideas', color: '#ff9800' }
];

// API methods with offline fallbacks
export const notesApi = {
  // Notes CRUD operations
  getNotes: async () => {
    try {
      const api = await createApiClient();
      return await api.get('/notes');
    } catch (error) {
      console.log('Offline mode: Returning dummy notes');
      return { data: dummyNotes };
    }
  },
  
  getNote: async (id) => {
    try {
      const api = await createApiClient();
      return await api.get(`/notes/${id}`);
    } catch (error) {
      const note = dummyNotes.find(note => note.id === id);
      return { data: note || null };
    }
  },
  
  createNote: async (data) => {
    try {
      const api = await createApiClient();
      return await api.post('/notes', data);
    } catch (error) {
      const newNote = {
        ...data,
        id: `note_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return { data: newNote };
    }
  },
  
  updateNote: async (id, data) => {
    try {
      const api = await createApiClient();
      return await api.put(`/notes/${id}`, data);
    } catch (error) {
      return { data: { ...data, id, updatedAt: new Date().toISOString() } };
    }
  },
  
  deleteNote: async (id) => {
    try {
      const api = await createApiClient();
      return await api.delete(`/notes/${id}`);
    } catch (error) {
      return { data: { success: true } };
    }
  },
  
  // Categories
  getCategories: async () => {
    try {
      const api = await createApiClient();
      return await api.get('/categories');
    } catch (error) {
      console.log('Offline mode: Returning dummy categories');
      return { data: dummyCategories };
    }
  },
  
  // User auth
  login: async (credentials) => {
    try {
      const api = await createApiClient();
      return await api.post('/auth/login', credentials);
    } catch (error) {
      return { data: { token: 'dummy_token' } };
    }
  },
  
  register: async (userData) => {
    try {
      const api = await createApiClient();
      return await api.post('/auth/register', userData);
    } catch (error) {
      return { data: { success: true } };
    }
  },
  
  // Offline support
  syncNotes: async (notes) => {
    try {
      const api = await createApiClient();
      return await api.post('/notes/sync', { notes });
    } catch (error) {
      return { data: { success: true } };
    }
  }
};

// Create a default instance for direct API calls
const api = axios.create({
  baseURL: 'https://your-api-url.com/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default api;