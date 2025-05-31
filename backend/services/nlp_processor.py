from textblob import TextBlob
from sklearn.feature_extraction.text import TfidfVectorizer
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch
import nltk
import re
import json

class NLPProcessor:
    def __init__(self):
        self.device = self._get_device()
        self._download_nltk_data()
        self.vectorizer = None
        
        # CUDA-enabled sentiment analysis
        self.sentiment_analyzer = None
        self.sentiment_model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
        
        # CUDA-enabled keyword extraction (using BERT)
        self.keyword_extractor = None
        self.keyword_model_name = "yanekyuk/bert-keyword-extractor"
        
        self._initialize_models()
    
    def _get_device(self):
        """Get the best available device"""
        if torch.cuda.is_available():
            device = torch.device('cuda:0')
            print(f"🎮 NLP Processor using CUDA: {torch.cuda.get_device_name(0)}")
            return device
        else:
            print("🎮 NLP Processor using CPU (CUDA not available)")
            return torch.device('cpu')
    
    def _initialize_models(self):
        """Initialize CUDA-accelerated NLP models"""
        try:
            print("🔄 Loading NLP models with CUDA support...")
            
            # Initialize sentiment analysis model
            print(f"📊 Loading sentiment model: {self.sentiment_model_name}")
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model=self.sentiment_model_name,
                device=0 if self.device.type == 'cuda' else -1,
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32
            )
            
            print("✅ NLP models loaded successfully")
            
            # Show GPU memory usage
            if self.device.type == 'cuda':
                print(f"🎮 GPU Memory allocated: {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB")
                
        except Exception as e:
            print(f"❌ Error loading NLP models: {e}")
            self.sentiment_analyzer = None
    
    def _download_nltk_data(self):
        """Download required NLTK data"""
        try:
            nltk.download('punkt', quiet=True)
            nltk.download('stopwords', quiet=True)
            nltk.download('vader_lexicon', quiet=True)
            print("✅ NLTK data downloaded successfully")
        except Exception as e:
            print(f"❌ Error downloading NLTK data: {e}")
    
    def process_text(self, text):
        """Main method to process text and extract insights with CUDA acceleration"""
        print(f"🔄 Processing text with NLP: '{text[:50]}...'")
        
        if self.device.type == 'cuda':
            torch.cuda.empty_cache()  # Clear memory before processing
        
        try:
            keywords = self.extract_keywords(text)
            sentiment = self.analyze_sentiment_cuda(text)
            return keywords, sentiment
        except Exception as e:
            print(f"❌ NLP processing error: {e}")
            # Fallback to CPU-based processing
            keywords = self.extract_keywords_fallback(text)
            sentiment = self.analyze_sentiment_fallback(text)
            return keywords, sentiment
    
    def extract_keywords(self, text, max_keywords=10):
        """Extract keywords using TF-IDF with CUDA optimization"""
        try:
            print(f"🔍 Extracting keywords from text ({len(text)} chars)")
            
            # Clean and preprocess text
            cleaned_text = self._clean_text(text)
            
            if len(cleaned_text.split()) < 5:
                return cleaned_text.split()
            
            # Use TF-IDF to extract keywords
            vectorizer = TfidfVectorizer(
                max_features=max_keywords,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.9
            )
            
            try:
                tfidf_matrix = vectorizer.fit_transform([cleaned_text])
                feature_names = vectorizer.get_feature_names_out()
                scores = tfidf_matrix.toarray()[0]
                
                # Get top keywords
                keyword_scores = list(zip(feature_names, scores))
                keyword_scores.sort(key=lambda x: x[1], reverse=True)
                
                keywords = [keyword for keyword, score in keyword_scores if score > 0][:max_keywords]
                print(f"✅ Extracted {len(keywords)} keywords: {keywords[:5]}")
                return keywords
                
            except Exception as tfidf_error:
                print(f"⚠️ TF-IDF failed: {tfidf_error}, using fallback")
                return self.extract_keywords_fallback(cleaned_text, max_keywords)
                
        except Exception as e:
            print(f"❌ Keyword extraction error: {e}")
            return self.extract_keywords_fallback(text, max_keywords)
    
    def extract_keywords_fallback(self, text, max_keywords=10):
        """Fallback keyword extraction method"""
        print("🔄 Using fallback keyword extraction")
        cleaned_text = self._clean_text(text)
        return self._simple_keyword_extraction(cleaned_text, max_keywords)
    
    def analyze_sentiment_cuda(self, text):
        """Analyze sentiment using CUDA-accelerated transformer model"""
        try:
            print(f"🎭 Analyzing sentiment with CUDA model")
            
            if not self.sentiment_analyzer:
                print("⚠️ CUDA sentiment analyzer not available, using fallback")
                return self.analyze_sentiment_fallback(text)
            
            # Truncate text if too long (RoBERTa has 512 token limit)
            max_length = 500
            if len(text) > max_length:
                text = text[:max_length]
            
            # Get sentiment prediction
            result = self.sentiment_analyzer(text)
            label = result[0]['label'].lower()
            confidence = result[0]['score']
            
            print(f"🎭 Sentiment: {label} (confidence: {confidence:.3f})")
            
            # Map labels to our format
            sentiment_mapping = {
                'positive': 'positive',
                'negative': 'negative',
                'neutral': 'neutral',
                'label_2': 'positive',  # Some models use numbered labels
                'label_1': 'neutral',
                'label_0': 'negative'
            }
            
            mapped_sentiment = sentiment_mapping.get(label, 'neutral')
            
            # If confidence is low, default to neutral
            if confidence < 0.6:
                mapped_sentiment = 'neutral'
            
            return mapped_sentiment
            
        except Exception as e:
            print(f"❌ CUDA sentiment analysis error: {e}")
            return self.analyze_sentiment_fallback(text)
    
    def analyze_sentiment_fallback(self, text):
        """Fallback sentiment analysis using TextBlob"""
        try:
            print("🔄 Using fallback sentiment analysis (TextBlob)")
            blob = TextBlob(text)
            polarity = blob.sentiment.polarity
            
            if polarity > 0.1:
                return 'positive'
            elif polarity < -0.1:
                return 'negative'
            else:
                return 'neutral'
        except Exception as e:
            print(f"❌ Fallback sentiment analysis error: {e}")
            return 'neutral'
    
    def _clean_text(self, text):
        """Clean and preprocess text"""
        # Remove special characters and normalize
        cleaned = re.sub(r'[^a-zA-Z\s]', '', text.lower())
        # Remove extra whitespaces
        cleaned = ' '.join(cleaned.split())
        return cleaned
    
    def _simple_keyword_extraction(self, text, max_keywords):
        """Simple keyword extraction fallback"""
        words = text.split()
        # Remove common words manually
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'}
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Count frequency
        word_freq = {}
        for word in filtered_words:
            word_freq[word] = word_freq.get(word, 0) + 1
        
        # Sort by frequency
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [word for word, freq in sorted_words[:max_keywords]]
    
    def get_text_statistics(self, text):
        """Get basic text statistics"""
        try:
            words = text.split()
            sentences = text.split('.')
            paragraphs = text.split('\n\n')
            
            return {
                'word_count': len(words),
                'sentence_count': len([s for s in sentences if s.strip()]),
                'paragraph_count': len([p for p in paragraphs if p.strip()]),
                'character_count': len(text),
                'avg_words_per_sentence': len(words) / max(len([s for s in sentences if s.strip()]), 1),
                'reading_time_minutes': len(words) / 200  # Average reading speed
            }
        except Exception as e:
            print(f"❌ Text statistics error: {e}")
            return {}
    
    def get_model_info(self):
        """Get information about the loaded NLP models"""
        info = {
            'device': str(self.device),
            'sentiment_model': self.sentiment_model_name,
            'sentiment_analyzer_loaded': self.sentiment_analyzer is not None
        }
        
        if self.device.type == 'cuda' and torch.cuda.is_available():
            info.update({
                'cuda_available': True,
                'gpu_memory_allocated': f"{torch.cuda.memory_allocated(0) / 1024**3:.2f} GB"
            })
        else:
            info['cuda_available'] = False
            
        return info
    
    def benchmark_nlp(self, text):
        """Benchmark NLP processing performance"""
        import time
        
        print("🏁 Starting NLP benchmark...")
        
        # Benchmark keyword extraction
        start_time = time.time()
        keywords = self.extract_keywords(text)
        keyword_time = time.time() - start_time
        
        # Benchmark sentiment analysis
        start_time = time.time()
        sentiment = self.analyze_sentiment_cuda(text)
        sentiment_time = time.time() - start_time
        
        # Benchmark statistics
        start_time = time.time()
        stats = self.get_text_statistics(text)
        stats_time = time.time() - start_time
        
        total_time = keyword_time + sentiment_time + stats_time
        
        return {
            'total_time': f"{total_time:.3f} seconds",
            'keyword_extraction_time': f"{keyword_time:.3f} seconds",
            'sentiment_analysis_time': f"{sentiment_time:.3f} seconds",
            'statistics_time': f"{stats_time:.3f} seconds",
            'device_used': str(self.device),
            'results': {
                'keywords': keywords,
                'sentiment': sentiment,
                'statistics': stats
            }
        }