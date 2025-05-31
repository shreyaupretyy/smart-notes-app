from flask import Flask, request, jsonify
from transformers import pipeline, WhisperProcessor, WhisperForConditionalGeneration
import torch
import librosa
import numpy as np
import io
import base64
import wave
import speech_recognition as sr
from pydub import AudioSegment
import tempfile
import os

app = Flask(__name__)

class SpeechToText:
    def __init__(self):
        self.device = self._get_device()
        
        # CUDA-enabled Whisper model
        self.whisper_model_name = "openai/whisper-base"
        self.whisper_processor = None
        self.whisper_model = None
        
        # Alternative speech recognition
        self.sr_recognizer = sr.Recognizer()
        
        self._initialize_models()
    
    def _get_device(self):
        """Get the best available device"""
        if torch.cuda.is_available():
            device = torch.device('cuda:0')
            print(f"🎮 Speech-to-Text using CUDA: {torch.cuda.get_device_name(0)}")
            return device
        else:
            print("🎮 Speech-to-Text using CPU")
            return torch.device('cpu')
    
    def _initialize_models(self):
        """Initialize CUDA-accelerated speech recognition models"""
        try:
            print("🔄 Loading speech-to-text models with CUDA support...")
            
            if self.device.type == 'cuda':
                print(f"🎤 Loading Whisper model: {self.whisper_model_name}")
                try:
                    # Method 1: Pipeline approach
                    self.whisper_pipeline = pipeline(
                        "automatic-speech-recognition",
                        model=self.whisper_model_name,
                        device=0,
                        torch_dtype=torch.float16
                    )
                    print("✅ CUDA Whisper pipeline loaded successfully")
                    
                except Exception as cuda_error:
                    print(f"⚠️ CUDA Whisper pipeline failed: {cuda_error}")
                    try:
                        # Method 2: Manual loading
                        self.whisper_processor = WhisperProcessor.from_pretrained(self.whisper_model_name)
                        self.whisper_model = WhisperForConditionalGeneration.from_pretrained(
                            self.whisper_model_name,
                            torch_dtype=torch.float16,
                            low_cpu_mem_usage=False
                        ).to(self.device)
                        print("✅ CUDA Whisper manual loading successful")
                        
                    except Exception as manual_error:
                        print(f"⚠️ Manual CUDA loading failed: {manual_error}")
                        self._initialize_cpu_models()
            else:
                self._initialize_cpu_models()
            
            # Show GPU memory usage
            if self.device.type == 'cuda':
                print(f"🎮 GPU Memory allocated: {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB")
                
        except Exception as e:
            print(f"❌ Error loading speech-to-text models: {e}")
            self.whisper_model = None
            self.whisper_processor = None
            self.whisper_pipeline = None
    
    def _initialize_cpu_models(self):
        """Initialize CPU-only models as fallback"""
        try:
            print("🔄 Loading CPU speech-to-text models...")
            self.whisper_pipeline = pipeline(
                "automatic-speech-recognition",
                model=self.whisper_model_name,
                device=-1
            )
            print("✅ CPU Whisper model loaded successfully")
        except Exception as e:
            print(f"❌ CPU model loading failed: {e}")
            self.whisper_pipeline = None
    
    def transcribe_audio(self, audio_data, language='auto'):
        """
        Transcribe audio to text
        audio_data: base64 string, bytes, or file path
        language: 'auto', 'en', 'es', 'fr', etc.
        """
        try:
            print(f"🎤 Transcribing audio (language: {language})")
            
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
                memory_before = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory before: {memory_before:.2f} GB")
            
            # Prepare audio
            audio_array, sample_rate = self._prepare_audio(audio_data)
            if audio_array is None:
                return {"error": "Invalid audio data"}
            
            results = {}
            
            # Primary: Whisper transcription
            if hasattr(self, 'whisper_pipeline') and self.whisper_pipeline:
                whisper_text = self._transcribe_with_whisper(audio_array, sample_rate, language)
                results['whisper'] = whisper_text
            
            # Fallback: SpeechRecognition library
            sr_text = self._transcribe_with_speech_recognition(audio_data)
            results['speech_recognition'] = sr_text
            
            # Select best result
            results['transcription'] = self._select_best_transcription(results)
            
            # GPU memory cleanup
            if self.device.type == 'cuda':
                memory_after = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory after: {memory_after:.2f} GB")
                torch.cuda.empty_cache()
            
            print(f"✅ Audio transcription completed")
            return results
            
        except Exception as e:
            print(f"❌ Audio transcription error: {e}")
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
            return {"error": str(e)}
    
    def _prepare_audio(self, audio_data):
        """Convert audio data to numpy array"""
        try:
            if isinstance(audio_data, str):
                if audio_data.startswith('data:audio'):
                    # Remove data URL prefix
                    audio_data = audio_data.split(',')[1]
                
                # Decode base64
                audio_bytes = base64.b64decode(audio_data)
                
                # Save to temporary file for processing
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_file.write(audio_bytes)
                    temp_path = temp_file.name
                
                try:
                    # Load with librosa
                    audio_array, sample_rate = librosa.load(temp_path, sr=16000)
                    return audio_array, sample_rate
                finally:
                    # Clean up temp file
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
            
            elif isinstance(audio_data, bytes):
                # Handle raw bytes
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                    temp_file.write(audio_data)
                    temp_path = temp_file.name
                
                try:
                    audio_array, sample_rate = librosa.load(temp_path, sr=16000)
                    return audio_array, sample_rate
                finally:
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
            
            elif os.path.isfile(audio_data):
                # File path
                audio_array, sample_rate = librosa.load(audio_data, sr=16000)
                return audio_array, sample_rate
            
            return None, None
            
        except Exception as e:
            print(f"❌ Audio preparation error: {e}")
            return None, None
    
    def _transcribe_with_whisper(self, audio_array, sample_rate, language):
        """Transcribe using Whisper model"""
        try:
            print("🎤 Transcribing with Whisper...")
            
            if hasattr(self, 'whisper_pipeline'):
                # Using pipeline
                result = self.whisper_pipeline(audio_array)
                text = result.get('text', '')
            
            elif self.whisper_model and self.whisper_processor:
                # Using manual approach
                inputs = self.whisper_processor(
                    audio_array,
                    sampling_rate=sample_rate,
                    return_tensors="pt"
                )
                
                if self.device.type == 'cuda':
                    inputs = {k: v.to(self.device) for k, v in inputs.items()}
                
                with torch.no_grad():
                    predicted_ids = self.whisper_model.generate(**inputs)
                
                text = self.whisper_processor.batch_decode(
                    predicted_ids,
                    skip_special_tokens=True
                )[0]
            
            else:
                return "Whisper model not available"
            
            print(f"✅ Whisper transcription: {text[:100]}...")
            return text.strip()
            
        except Exception as e:
            print(f"❌ Whisper transcription error: {e}")
            return f"Whisper error: {str(e)}"
    
    def _transcribe_with_speech_recognition(self, audio_data):
        """Transcribe using SpeechRecognition library"""
        try:
            print("🎤 Transcribing with SpeechRecognition...")
            
            # Convert to wav format for SpeechRecognition
            if isinstance(audio_data, str) and audio_data.startswith('data:audio'):
                audio_data = audio_data.split(',')[1]
            
            if isinstance(audio_data, str):
                audio_bytes = base64.b64decode(audio_data)
            else:
                audio_bytes = audio_data
            
            # Create temporary wav file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name
            
            try:
                # Use SpeechRecognition
                with sr.AudioFile(temp_path) as source:
                    audio = self.sr_recognizer.record(source)
                
                # Try Google Speech Recognition (free)
                try:
                    text = self.sr_recognizer.recognize_google(audio)
                    print(f"✅ Google SR transcription: {text[:100]}...")
                    return text
                except sr.UnknownValueError:
                    return "Could not understand audio"
                except sr.RequestError as e:
                    print(f"⚠️ Google SR error: {e}")
                    
                    # Fallback to Sphinx (offline)
                    try:
                        text = self.sr_recognizer.recognize_sphinx(audio)
                        print(f"✅ Sphinx transcription: {text[:100]}...")
                        return text
                    except:
                        return "Speech recognition failed"
            
            finally:
                try:
                    os.unlink(temp_path)
                except:
                    pass
                    
        except Exception as e:
            print(f"❌ SpeechRecognition error: {e}")
            return f"SR error: {str(e)}"
    
    def _select_best_transcription(self, results):
        """Select the best transcription result"""
        whisper_text = results.get('whisper', '')
        sr_text = results.get('speech_recognition', '')
        
        # Prefer Whisper if available and successful
        if whisper_text and 'error' not in whisper_text.lower() and len(whisper_text) > 5:
            return whisper_text
        
        # Fallback to SpeechRecognition
        if sr_text and 'error' not in sr_text.lower() and len(sr_text) > 0:
            return sr_text
        
        return "Could not transcribe audio"
    
    def get_model_info(self):
        """Get information about loaded models"""
        info = {
            'device': str(self.device),
            'whisper_pipeline_loaded': hasattr(self, 'whisper_pipeline') and self.whisper_pipeline is not None,
            'whisper_model_loaded': self.whisper_model is not None,
            'speech_recognition_available': True,
            'model_name': self.whisper_model_name
        }
        
        if self.device.type == 'cuda' and torch.cuda.is_available():
            info.update({
                'cuda_available': True,
                'gpu_memory_allocated': f"{torch.cuda.memory_allocated(0) / 1024**3:.2f} GB"
            })
        else:
            info['cuda_available'] = False
            
        return info
    
    def benchmark_speech_processing(self, audio_data):
        """Benchmark speech processing performance"""
        import time
        
        print("🏁 Starting speech processing benchmark...")
        
        # Prepare audio
        audio_array, sample_rate = self._prepare_audio(audio_data)
        if audio_array is None:
            return {"error": "Invalid audio for benchmark"}
        
        benchmark_results = {}
        
        # Benchmark Whisper
        if hasattr(self, 'whisper_pipeline') and self.whisper_pipeline:
            start_time = time.time()
            whisper_text = self._transcribe_with_whisper(audio_array, sample_rate, 'auto')
            whisper_time = time.time() - start_time
            benchmark_results['whisper'] = {
                'time': f"{whisper_time:.3f} seconds",
                'result': whisper_text[:100] + "..." if len(whisper_text) > 100 else whisper_text
            }
        
        # Benchmark SpeechRecognition
        start_time = time.time()
        sr_text = self._transcribe_with_speech_recognition(audio_data)
        sr_time = time.time() - start_time
        benchmark_results['speech_recognition'] = {
            'time': f"{sr_time:.3f} seconds",
            'result': sr_text[:100] + "..." if len(sr_text) > 100 else sr_text
        }
        
        total_time = sum([float(r['time'].split()[0]) for r in benchmark_results.values()])
        audio_duration = len(audio_array) / sample_rate if audio_array is not None else 0
        
        return {
            'device_used': str(self.device),
            'audio_duration': f"{audio_duration:.2f} seconds",
            'total_processing_time': f"{total_time:.3f} seconds",
            'real_time_factor': f"{total_time / max(audio_duration, 0.1):.2f}x",
            'individual_results': benchmark_results
        }

@app.route('/api/speech-to-text', methods=['POST'])
def speech_to_text():
    if 'audio_file' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio_file']
    recognizer = sr.Recognizer()

    with sr.AudioFile(audio_file) as source:
        audio_data = recognizer.record(source)
        try:
            text = recognizer.recognize_google(audio_data)
            return jsonify({'text': text}), 200
        except sr.UnknownValueError:
            return jsonify({'error': 'Could not understand audio'}), 400
        except sr.RequestError as e:
            return jsonify({'error': f'Could not request results from Google Speech Recognition service; {e}'}), 500

if __name__ == '__main__':
    app.run(debug=True)