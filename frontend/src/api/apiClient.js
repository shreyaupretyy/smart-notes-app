// Base URL for API calls
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * API client for interacting with the backend services
 */
export const apiClient = {
  // Health check endpoint
  checkHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await response.json();
    } catch (error) {
      console.error('API Health Check Error:', error);
      throw error;
    }
  },

  // AI features
  summarizeText: async (text) => {
    try {
      const response = await fetch(`${API_BASE_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      return await response.json();
    } catch (error) {
      console.error('Summarization Error:', error);
      throw error;
    }
  },

  // Image to text conversion
  extractTextFromImage: async (imageBase64) => {
    try {
      const response = await fetch(`${API_BASE_URL}/image-to-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageBase64 }),
      });
      return await response.json();
    } catch (error) {
      console.error('Image to Text Error:', error);
      throw error;
    }
  },
  
  // Speech to text conversion
  speechToText: async (audioBase64) => {
    try {
      const response = await fetch(`${API_BASE_URL}/speech-to-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio: audioBase64 }),
      });
      return await response.json();
    } catch (error) {
      console.error('Speech to Text Error:', error);
      throw error;
    }
  },
  
  // Get suggestions based on text
  getSuggestions: async (text) => {
    try {
      const response = await fetch(`${API_BASE_URL}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      return await response.json();
    } catch (error) {
      console.error('Suggestions Error:', error);
      throw error;
    }
  },
};