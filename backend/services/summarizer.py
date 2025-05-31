from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import logging

class Summarizer:
    def __init__(self):
        self.device = self._get_device()
        self.model_name = "facebook/bart-large-cnn"
        self.summarizer = None
        self.model = None
        self.tokenizer = None
        self._initialize_model()
    
    def _get_device(self):
        """Get the best available device"""
        if torch.cuda.is_available():
            device = torch.device('cuda:0')
            print(f"🎮 Using CUDA: {torch.cuda.get_device_name(0)}")
            print(f"🎮 GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
            return device
        else:
            print("🎮 Using CPU (CUDA not available)")
            return torch.device('cpu')
    
    def _initialize_model(self):
        """Initialize the summarization model with proper CUDA handling"""
        try:
            print(f"🔄 Loading summarization model: {self.model_name}")
            print(f"🎮 Target device: {self.device}")
            
            if self.device.type == 'cuda':
                print("🚀 Loading with CUDA acceleration...")
                try:
                    # Method 1: Simple pipeline approach (fixed parameters)
                    self.summarizer = pipeline(
                        "summarization",
                        model=self.model_name,
                        device=0,  # Use first GPU
                        torch_dtype=torch.float16
                    )
                    print("✅ CUDA summarization model loaded successfully")
                    
                except Exception as cuda_error:
                    print(f"⚠️ CUDA pipeline loading failed: {cuda_error}")
                    print("🔄 Trying manual model loading...")
                    
                    try:
                        # Method 2: Manual loading with proper device handling
                        print("📝 Loading tokenizer...")
                        self.tokenizer = AutoTokenizer.from_pretrained(
                            self.model_name,
                            clean_up_tokenization_spaces=True
                        )
                        
                        print("🧠 Loading model...")
                        # Load without meta device issues
                        self.model = AutoModelForSeq2SeqLM.from_pretrained(
                            self.model_name,
                            torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32,
                            low_cpu_mem_usage=False,  # Disable to avoid meta tensor issues
                            device_map=None  # Don't use auto device mapping
                        )
                        
                        # Move to GPU after loading
                        print(f"📡 Moving model to {self.device}")
                        self.model = self.model.to(self.device)
                        
                        # Create pipeline manually
                        print("🔗 Creating manual pipeline...")
                        self.summarizer = pipeline(
                            "summarization",
                            model=self.model,
                            tokenizer=self.tokenizer,
                            device=0 if self.device.type == 'cuda' else -1
                        )
                        print("✅ Manual CUDA loading successful")
                        
                    except Exception as manual_error:
                        print(f"⚠️ Manual CUDA loading failed: {manual_error}")
                        print("🔄 Trying CPU-first then GPU approach...")
                        self._initialize_cpu_then_gpu()
            else:
                print("🔄 Loading CPU model...")
                self._initialize_cpu_model()
                
            # Test the model if loaded successfully
            if self.summarizer:
                self._test_model()
                
        except Exception as e:
            print(f"❌ Error loading summarization model: {e}")
            self.summarizer = None
            self.model = None
            self.tokenizer = None
    
    def _initialize_cpu_then_gpu(self):
        """Load on CPU first, then move to GPU"""
        try:
            print("🔄 Loading model on CPU first...")
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                clean_up_tokenization_spaces=True
            )
            
            # Load model on CPU
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                self.model_name,
                torch_dtype=torch.float32,  # Start with float32 on CPU
                low_cpu_mem_usage=False
            )
            
            # Move to GPU and convert to float16
            if self.device.type == 'cuda':
                print(f"📡 Moving model to {self.device} and converting to float16...")
                self.model = self.model.to(self.device, dtype=torch.float16)
            
            # Create pipeline
            self.summarizer = pipeline(
                "summarization",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device.type == 'cuda' else -1
            )
            print("✅ CPU-then-GPU loading successful")
            
        except Exception as e:
            print(f"⚠️ CPU-then-GPU loading failed: {e}")
            print("🔄 Falling back to CPU-only...")
            self._initialize_cpu_model()
    
    def _initialize_cpu_model(self):
        """Initialize CPU-only model as fallback"""
        try:
            print("🔄 Loading CPU summarization model...")
            self.summarizer = pipeline(
                "summarization",
                model=self.model_name,
                device=-1,  # CPU
                torch_dtype=torch.float32
            )
            print("✅ CPU summarization model loaded successfully")
        except Exception as e:
            print(f"❌ CPU model loading failed: {e}")
            self.summarizer = None
    
    def _test_model(self):
        """Test the loaded model with a simple example"""
        try:
            test_text = "This is a simple test to verify that the summarization model is working correctly. The model should be able to process this text and generate a shorter summary."
            print("🧪 Testing model with sample text...")
            
            if self.device.type == 'cuda':
                memory_before = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory before test: {memory_before:.2f} GB")
            
            # Use appropriate parameters for test
            result = self.summarizer(
                test_text, 
                max_length=30, 
                min_length=10, 
                do_sample=False,
                early_stopping=True
            )
            summary = result[0]['summary_text']
            
            if self.device.type == 'cuda':
                memory_after = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory after test: {memory_after:.2f} GB")
            
            print(f"✅ Model test successful: '{summary}'")
            
        except Exception as e:
            print(f"⚠️ Model test failed: {e}")
            print("🔄 Model loaded but test failed - this is usually fine for production use")
    
    def summarize(self, text, max_length=150, min_length=30):
        """Summarize the given text using CUDA acceleration"""
        print(f"📝 Summarizing text: '{text[:50]}...' (length: {len(text)} chars)")
        
        if not self.summarizer:
            print("⚠️ Summarizer not available, using fallback")
            return self._fallback_summary(text)
        
        # Check minimum length requirement
        word_count = len(text.split())
        print(f"📊 Word count: {word_count}")
        
        if word_count < 15:  # Reduced threshold
            print(f"⚠️ Text too short for summarization (need at least 15 words)")
            return text
        
        try:
            # Adjust parameters for shorter texts
            if word_count < 50:
                max_length = max(word_count // 2, 15)
                min_length = max(word_count // 4, 5)
            elif word_count < 100:
                max_length = min(max_length, max(word_count // 2, 20))
                min_length = min(min_length, max(max_length // 3, 10))
            
            print(f"🎯 Summarization params: max_length={max_length}, min_length={min_length}")
            print(f"🎮 Using device: {self.device}")
            
            # Clear GPU cache before processing
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
                memory_before = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory before: {memory_before:.2f} GB")
            
            # Process text in chunks if too long
            max_input_length = 800  # Conservative limit for BART
            if len(text) > max_input_length:
                chunks = self._split_text(text, max_input_length)
                summaries = []
                
                for i, chunk in enumerate(chunks):
                    print(f"🔄 Processing chunk {i+1}/{len(chunks)}")
                    try:
                        result = self.summarizer(
                            chunk,
                            max_length=max_length,
                            min_length=min_length,
                            do_sample=False,
                            early_stopping=True,
                            truncation=True
                        )
                        summary = result[0]['summary_text']
                        summaries.append(summary)
                    except Exception as chunk_error:
                        print(f"❌ Error processing chunk {i+1}: {chunk_error}")
                        summaries.append(self._fallback_summary(chunk))
                
                final_summary = ' '.join(summaries)
            else:
                # Process single text
                result = self.summarizer(
                    text,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False,
                    early_stopping=True,
                    truncation=True
                )
                final_summary = result[0]['summary_text']
            
            # Show GPU memory usage after processing
            if self.device.type == 'cuda':
                memory_after = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory after: {memory_after:.2f} GB")
                torch.cuda.empty_cache()  # Clean up
            
            print(f"🎉 Final summary: '{final_summary[:50]}...' (length: {len(final_summary)} chars)")
            return final_summary
            
        except Exception as e:
            print(f"❌ Summarization error: {e}")
            # Clear GPU memory on error
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
            return self._fallback_summary(text)
    
    def _split_text(self, text, max_chunk_size):
        """Split text into manageable chunks by character count"""
        if len(text) <= max_chunk_size:
            return [text]
        
        chunks = []
        sentences = text.split('. ')
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) + 2 <= max_chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def _fallback_summary(self, text):
        """Fallback summary method if AI model fails"""
        print("🔄 Using fallback summarization")
        sentences = text.split('.')
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if len(sentences) <= 2:
            return text
        
        # Return first 2-3 sentences depending on length
        summary_sentences = sentences[:3] if len(sentences) > 5 else sentences[:2]
        return '. '.join(summary_sentences) + '.'
    
    def get_model_info(self):
        """Get information about the loaded model"""
        info = {
            'model_name': self.model_name,
            'device': str(self.device),
            'model_loaded': self.model is not None,
            'pipeline_ready': self.summarizer is not None,
            'loading_method': 'pipeline' if self.model is None else 'manual_loading'
        }
        
        if self.device.type == 'cuda' and torch.cuda.is_available():
            info.update({
                'cuda_available': True,
                'gpu_name': torch.cuda.get_device_name(0),
                'gpu_memory_total': f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB",
                'gpu_memory_allocated': f"{torch.cuda.memory_allocated(0) / 1024**3:.2f} GB",
                'gpu_memory_cached': f"{torch.cuda.memory_reserved(0) / 1024**3:.2f} GB"
            })
        else:
            info['cuda_available'] = False
            
        return info