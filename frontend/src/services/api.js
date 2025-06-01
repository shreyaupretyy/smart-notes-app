// src/services/api.js
import axios from 'axios';
import { Platform } from 'react-native';
import { 
  DEV_API_HOST, 
  DEV_API_PORT, 
  PROD_API_URL 
} from '@env';

class APIService {
  constructor() {
    this.baseURL = null;
    this.api = null;
    this.isConnected = false;
    this.isInitialized = false;
  }

  getEnvironmentURLs() {
    if (!__DEV__) {
      // Production mode
      return [PROD_API_URL];
    }

    // Development mode - get from environment variables
    const urls = [];

    // Primary URL from environment variables
    if (DEV_API_HOST && DEV_API_PORT) {
      urls.push(`http://${DEV_API_HOST}:${DEV_API_PORT}/api`);
    }

    // Platform-specific fallbacks (NO hardcoded IPs)
    if (Platform.OS === 'android') {
      urls.push('http://10.0.2.2:5000/api'); // Android emulator standard
    } else if (Platform.OS === 'ios') {
      urls.push('http://localhost:5000/api'); // iOS simulator standard
    }

    // If no environment variables are set, we'll show an error
    if (urls.length === 0) {
      console.error('❌ No API configuration found! Please set up your .env file.');
      console.error('Create .env file with: DEV_API_HOST=your_ip_address');
    }

    return urls;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.isConnected;
    }

    const possibleUrls = this.getEnvironmentURLs();
    
    console.log('🔍 Discovering backend from environment...');
    console.log('🌐 Environment:', __DEV__ ? 'Development' : 'Production');
    console.log('📱 Platform:', Platform.OS);
    console.log('🔧 Environment variables loaded:', {
      DEV_API_HOST: DEV_API_HOST ? '✅' : '❌',
      DEV_API_PORT: DEV_API_PORT ? '✅' : '❌',
      PROD_API_URL: PROD_API_URL ? '✅' : '❌'
    });

    if (possibleUrls.length === 0) {
      console.error('❌ No API URLs configured!');
      this.isInitialized = true;
      this.isConnected = false;
      return false;
    }

    for (const url of possibleUrls) {
      try {
        console.log(`🧪 Testing: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${url}/health`, { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`✅ Backend connected: ${url}`);
          this.baseURL = url;
          this.isConnected = true;
          break;
        }
      } catch (error) {
        console.log(`❌ ${url} failed: ${error.message}`);
      }
    }

    if (!this.baseURL) {
      console.error('❌ No backend connection established!');
      console.error('💡 Make sure your backend is running and accessible');
      this.isConnected = false;
      this.isInitialized = true;
      return false;
    }

    // Create axios instance only after successful connection
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.setupInterceptors();
    this.isInitialized = true;
    return this.isConnected;
  }

  setupInterceptors() {
    if (!this.api) return;

    this.api.interceptors.request.use(
      (config) => {
        console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        const fullUrl = `${response.config.baseURL}${response.config.url}`;
        console.log(`✅ API Response: ${response.status} ${fullUrl}`);
        return response;
      },
      (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        const fullUrl = error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown';
        
        // ✅ Don't log 404 errors as errors (they're expected for deleted notes)
        if (status === 404) {
          console.log(`📋 Resource not found: ${fullUrl}`);
        } else {
          console.error(`❌ API Error: ${status} - ${message} (${fullUrl})`);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Connection status
  getConnectionInfo() {
    return {
      baseURL: this.baseURL,
      isConnected: this.isConnected,
      isInitialized: this.isInitialized,
      platform: Platform.OS,
      environment: __DEV__ ? 'development' : 'production',
      environmentVariables: {
        DEV_API_HOST: !!DEV_API_HOST,
        DEV_API_PORT: !!DEV_API_PORT,
        PROD_API_URL: !!PROD_API_URL
      }
    };
  }

  // Helper method to ensure API is ready
  ensureInitialized() {
    if (!this.isInitialized || !this.api) {
      throw new Error('API service not initialized. Please wait for app startup to complete.');
    }
    if (!this.isConnected) {
      throw new Error('No backend connection available.');
    }
  }

  // API Methods - all check initialization first
  checkHealth = () => {
    this.ensureInitialized();
    return this.api.get('/health');
  };

  getNotes = (params = {}) => {
    this.ensureInitialized();
    return this.api.get('/notes', { params });
  };

  createNote = (noteData) => {
    this.ensureInitialized();
    return this.api.post('/notes', noteData);
  };

  getNote = (id) => {
    this.ensureInitialized();
    return this.api.get(`/notes/${id}`);
  };

  updateNote = (id, noteData) => {
    this.ensureInitialized();
    return this.api.put(`/notes/${id}`, noteData);
  };

  deleteNote = (id) => {
    this.ensureInitialized();
    return this.api.delete(`/notes/${id}`);
  };
  
  // AI Services
  summarizeText = (text) => {
    this.ensureInitialized();
    return this.api.post('/ai/summarize', { text });
  };

  analyzeText = async (text) => {
    console.log('🤖 Analyzing text for preview...');
    this.ensureInitialized();
    return this.api.post('/ai/analyze', { text });
  };

  processImage = async (base64ImageData) => {
    console.log('🖼️ API: Processing image...');
    this.ensureInitialized();
    
    const response = await this.api.post('/ai/process-image', {
      image: base64ImageData
    });
    
    console.log('✅ API: Image processed successfully');
    return response;
  };

  transcribeAudio = (audioData, language = 'auto') => {
    this.ensureInitialized();
    return this.api.post('/ai/speech-to-text', { audio: audioData, language });
  };

  getGPUInfo = () => {
    this.ensureInitialized();
    return this.api.get('/ai/gpu-info');
  };

  testImageProcessing = () => {
    this.ensureInitialized();
    return this.api.get('/ai/test-image');
  };

  testSpeechProcessing = () => {
    this.ensureInitialized();
    return this.api.get('/ai/test-speech');
  };
}

const apiService = new APIService();
export { apiService };
export default apiService.api;