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

  // ✅ Core API Methods - Notes Management
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

  updateNote = async (id, noteData) => {
    console.log(`🔄 API: Updating note ${id} with data:`, {
      title: noteData.title,
      hasAiAnalysis: !!noteData.ai_analysis,
      contentLength: noteData.content?.length || 0
    });
    
    const response = await this.api.put(`/notes/${id}`, noteData);
    
    console.log(`✅ API: Note ${id} updated:`, {
      status: response.status,
      hasData: !!response.data,
      hasNote: !!(response.data?.note)
    });
    
    return response;
  };

  deleteNote = (id) => {
    this.ensureInitialized();
    return this.api.delete(`/notes/${id}`);
  };
  
  // ✅ AI Services - Text Processing
  analyzeText = async (text) => {
    console.log('🤖 Analyzing text for preview...');
    this.ensureInitialized();
    return this.api.post('/ai/analyze', { text });
  };

  summarizeText = (text) => {
    this.ensureInitialized();
    return this.api.post('/ai/summarize', { text });
  };

  // ✅ AI Services - Image Processing
  processImage = async (base64ImageData) => {
    console.log('🖼️ API: Processing image...');
    this.ensureInitialized();
    
    try {
      console.log('🔄 API Request: POST /ai/process-image');
      const response = await this.api.post('/ai/process-image', {
        image: base64ImageData
      });
      
      console.log('✅ API Response:', response.status, `${this.baseURL}/ai/process-image`);
      return response;
    } catch (error) {
      console.error('❌ Image processing error:', error.response?.data || error.message);
      throw error;
    }
  };

  // ✅ AI Services - Audio Processing
  processAudio = async (base64AudioData) => {
    console.log('🎤 API: Processing audio...');
    this.ensureInitialized();
    
    try {
      console.log('🔄 API Request: POST /ai/process-audio');
      const response = await this.api.post('/ai/process-audio', {
        audio: base64AudioData
      });
      
      console.log('✅ API Response:', response.status, `${this.baseURL}/ai/process-audio`);
      return response;
    } catch (error) {
      console.error('❌ Audio processing error:', error.response?.data || error.message);
      throw error;
    }
  };

  // ✅ Legacy Audio Method (for backward compatibility)
  transcribeAudio = (audioData, language = 'auto') => {
    console.log('🎤 Legacy transcribe method - redirecting to processAudio...');
    return this.processAudio(audioData);
  };

  // ✅ System Information
  getGPUInfo = () => {
    this.ensureInitialized();
    return this.api.get('/ai/gpu-info');
  };

  // ✅ Test Endpoints (for development)
  testImageProcessing = () => {
    this.ensureInitialized();
    return this.api.get('/ai/test-image');
  };

  testSpeechProcessing = () => {
    this.ensureInitialized();
    return this.api.get('/ai/test-speech');
  };

  // ✅ Utility Methods
  testConnection = async () => {
    try {
      const response = await this.checkHealth();
      return { 
        success: true, 
        data: response.data,
        baseURL: this.baseURL
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        baseURL: this.baseURL
      };
    }
  };

  // ✅ Get API Status
  getStatus = () => {
    return {
      isInitialized: this.isInitialized,
      isConnected: this.isConnected,
      baseURL: this.baseURL,
      platform: Platform.OS,
      environment: __DEV__ ? 'development' : 'production'
    };
  };

  // ✅ Force Reconnection
  reconnect = async () => {
    console.log('🔄 Forcing API reconnection...');
    this.isInitialized = false;
    this.isConnected = false;
    this.api = null;
    this.baseURL = null;
    
    return await this.initialize();
  };
}

// ✅ Create and export single instance
const apiService = new APIService();

// ✅ Export both the service instance and axios instance (for compatibility)
export { apiService };
export default apiService;