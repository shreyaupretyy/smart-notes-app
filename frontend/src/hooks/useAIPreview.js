// src/hooks/useAIPreview.js - Create this new file
import { useState, useEffect, useRef } from 'react';
import { apiService } from '../services/api';

export const useAIPreview = (content, enabled = true) => {
  const [aiPreview, setAiPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Don't analyze if disabled or content is too short
    if (!enabled || !content || content.trim().length < 50) {
      setAiPreview(null);
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce analysis - wait 2 seconds after user stops typing
    timeoutRef.current = setTimeout(async () => {
      try {
        setIsAnalyzing(true);
        console.log('🤖 Starting real-time AI analysis...');
        
        // Call the AI analysis endpoint
        const result = await apiService.analyzeText(content.trim());
        
        if (result?.data) {
          setAiPreview(result.data);
          console.log('✅ AI preview updated');
        }
      } catch (error) {
        console.error('❌ AI preview error:', error);
        setAiPreview(null);
      } finally {
        setIsAnalyzing(false);
      }
    }, 2000); // 2 second delay

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, enabled]);

  return { aiPreview, isAnalyzing };
};