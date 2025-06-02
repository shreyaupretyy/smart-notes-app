# backend/app.py - Fixed version with no duplicates
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from config import Config
import json
import os
import torch
import base64
import io
import atexit
from PIL import Image

# Import database instance
from database import db

# Import AI services (single import)
from services.summarizer import Summarizer
from services.nlp_processor import NLPProcessor
from services.image_to_text import ImageToText
from services.speech_to_text import SpeechToText

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize database with app
db.init_app(app)

# Initialize extensions
CORS(app)

# Register blueprints
try:
    from routes.api import notes_bp
    app.register_blueprint(notes_bp)
    print("✅ Notes blueprint registered successfully")
except ImportError as e:
    print(f"❌ Failed to import notes blueprint: {e}")
except Exception as e:
    print(f"❌ Failed to register notes blueprint: {e}")

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ✅ Global AI services (single initialization)
summarizer = None
nlp_processor = None
image_to_text = None
speech_to_text = None
ai_initialized = False

def initialize_ai_services():
    """Initialize AI services once at startup"""
    global summarizer, nlp_processor, image_to_text, speech_to_text, ai_initialized
    
    print("🤖 Initializing AI services...")
    try:
        # Initialize all services
        summarizer = Summarizer()
        nlp_processor = NLPProcessor()
        
        print("🖼️ Initializing Image-to-Text service...")
        image_to_text = ImageToText()
        
        print("🎤 Initializing Speech-to-Text service...")
        speech_to_text = SpeechToText()
        
        ai_initialized = True
        print("✅ All AI services initialized successfully")
        
    except Exception as e:
        print(f"❌ AI services initialization failed: {e}")
        summarizer = None
        nlp_processor = None
        image_to_text = None
        speech_to_text = None
        ai_initialized = False

# ✅ Initialize AI services once
initialize_ai_services()

# ✅ Single AI processing function
def process_text_with_ai(text):
    """Process text with all available AI services"""
    try:
        # Summarization
        if summarizer and summarizer.summarizer:
            summary = summarizer.summarize(text)
        else:
            summary = text[:100] + "..." if len(text) > 100 else text
        
        # NLP Analysis
        if nlp_processor:
            keywords, sentiment = nlp_processor.process_text(text)
            statistics = nlp_processor.get_text_statistics(text)
        else:
            keywords = []
            sentiment = "neutral"
            statistics = {"word_count": len(text.split())}
        
        return summary, keywords, sentiment, statistics
        
    except Exception as e:
        print(f"❌ Error in AI processing: {e}")
        summary = text[:100] + "..." if len(text) > 100 else text
        keywords = []
        sentiment = "neutral"
        statistics = {"word_count": len(text.split())}
        return summary, keywords, sentiment, statistics

# Cleanup on exit
def cleanup_ai():
    print("🧹 Cleaning up AI resources...")

atexit.register(cleanup_ai)

# ✅ Routes (organized and no duplicates)
@app.route('/')
def home():
    return {
        'message': 'Smart Notes API is running!', 
        'status': 'success',
        'ai_services': 'initialized' if ai_initialized else 'failed',
        'endpoints': {
            'notes': '/api/notes',
            'ai_summarize': '/api/ai/summarize (POST)',
            'ai_analyze': '/api/ai/analyze (POST)',
            'ai_process_image': '/api/ai/process-image (POST)',
            'ai_process_audio': '/api/ai/process-audio (POST)',
            'health': '/api/health',
            'routes': '/api/routes'
        }
    }

@app.route('/api/health')
def health_check():
    return {
        'status': 'healthy',
        'database': 'connected',
        'ai_services': {
            'summarizer': 'ready' if summarizer and summarizer.summarizer else 'failed',
            'nlp_processor': 'ready' if nlp_processor else 'failed',
            'image_to_text': 'ready' if image_to_text else 'failed',
            'speech_to_text': 'ready' if speech_to_text else 'failed'
        }
    }

@app.route('/api/routes')
def list_routes():
    """List all available routes"""
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': sorted(list(rule.methods - {'HEAD', 'OPTIONS'})),
            'rule': str(rule)
        })
    return jsonify({
        'status': 'success',
        'routes': sorted(routes, key=lambda x: x['rule'])
    })

@app.route('/api/ai/analyze', methods=['POST'])
def analyze_text():
    """Analyze text in real-time for preview"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Text is required'
            }), 400
        
        text = data['text'].strip()
        
        if len(text) < 50:
            return jsonify({
                'status': 'error',
                'message': 'Text too short for analysis (minimum 50 characters)'
            }), 400
        
        print(f"🤖 Analyzing text preview: {text[:100]}...")
        
        summary, keywords, sentiment, statistics = process_text_with_ai(text)
        
        return jsonify({
            'status': 'success',
            'analysis': {
                'summary': summary,
                'keywords': keywords[:10],
                'sentiment': sentiment,
                'statistics': statistics,
                'preview': True
            }
        })
        
    except Exception as e:
        print(f"❌ Error in AI analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'AI analysis failed'
        }), 500

@app.route('/api/ai/process-image', methods=['POST'])
def process_image():
    """Process image with OCR and analysis"""
    try:
        print("🖼️ Image processing endpoint hit!")
        
        data = request.get_json()
        
        if not data or 'image' not in data:
            print("❌ No image data in request")
            return jsonify({
                'status': 'error',
                'message': 'Image data is required'
            }), 400
        
        print("🖼️ Processing image with AI...")
        
        image_base64 = data['image']
        
        # Validate base64 data
        try:
            test_decode = base64.b64decode(image_base64)
            print(f"✅ Base64 image data validated: {len(test_decode)} bytes")
        except Exception as decode_error:
            print(f"❌ Invalid base64 data: {decode_error}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid image data format'
            }), 400
        
        extracted_text = ""
        analysis = None
        
        try:
            if image_to_text:
                print("🔍 Processing image with ImageToText service...")
                result = image_to_text.process_image(image_base64, 'auto')
                print(f"🔍 Raw result: {result}")
                
                if isinstance(result, dict):
                    if 'error' in result:
                        print(f"❌ ImageToText service error: {result['error']}")
                        extracted_text = "Image processing failed"
                    else:
                        extracted_text = (
                            result.get('best_text', '') or 
                            result.get('ocr_text', '') or 
                            result.get('document_text', '') or
                            result.get('caption', '')
                        )
                        print(f"📝 Selected text: {extracted_text[:100] if extracted_text else 'None'}...")
                else:
                    extracted_text = str(result)
                    
            else:
                print("⚠️ Image processing service not available")
                return jsonify({
                    'status': 'error',
                    'message': 'Image processing service not available'
                }), 503
                
        except Exception as ocr_error:
            print(f"❌ OCR processing failed: {ocr_error}")
            extracted_text = "OCR processing encountered an error"
        
        # Clean up extracted text
        if extracted_text:
            extracted_text = extracted_text.strip()
            if (len(extracted_text) < 3 or 
                'error' in extracted_text.lower() or 
                'not available' in extracted_text.lower()):
                extracted_text = ""
        
        # Analyze text if meaningful
        if extracted_text and len(extracted_text.strip()) > 10:
            try:
                print("🤖 Analyzing extracted text...")
                summary, keywords, sentiment, statistics = process_text_with_ai(extracted_text)
                analysis = {
                    'summary': summary,
                    'keywords': keywords[:10] if keywords else [],
                    'sentiment': sentiment,
                    'statistics': statistics
                }
                print(f"✅ Text analysis complete: {sentiment} sentiment")
            except Exception as ai_error:
                print(f"⚠️ Text analysis failed: {ai_error}")
        
        final_text = extracted_text or "No readable text found in image"
        
        result_data = {
            'extracted_text': final_text,
            'analysis': analysis,
            'image_processed': True
        }
        
        print("✅ Image processing completed successfully")
        return jsonify({
            'status': 'success',
            'result': result_data
        })
        
    except Exception as e:
        print(f"❌ Error processing image: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Image processing failed: {str(e)}'
        }), 500

@app.route('/api/ai/process-audio', methods=['POST'])
def process_audio():
    """Process audio with speech-to-text"""
    try:
        print("🎤 Audio processing endpoint hit!")
        
        data = request.get_json()
        
        if not data or 'audio' not in data:
            print("❌ No audio data in request")
            return jsonify({
                'status': 'error',
                'message': 'Audio data is required'
            }), 400
        
        print("🎤 Processing audio with AI...")
        
        audio_base64 = data['audio']
        
        # Validate base64 data
        try:
            test_decode = base64.b64decode(audio_base64)
            print(f"✅ Base64 audio data validated: {len(test_decode)} bytes")
        except Exception as decode_error:
            print(f"❌ Invalid base64 data: {decode_error}")
            return jsonify({
                'status': 'error',
                'message': 'Invalid audio data format'
            }), 400
        
        transcribed_text = ""
        analysis = None
        
        try:
            if speech_to_text:
                print("🔍 Processing audio with SpeechToText service...")
                result = speech_to_text.transcribe_audio(audio_base64, language='auto')
                print(f"🔍 Raw result: {result}")
                
                if isinstance(result, dict):
                    if 'error' in result:
                        print(f"❌ SpeechToText service error: {result['error']}")
                        transcribed_text = f"Speech processing error: {result['error']}"
                    else:
                        transcribed_text = (
                            result.get('transcription', '') or 
                            result.get('whisper', '') or 
                            result.get('speech_recognition', '') or
                            result.get('text', '') or
                            result.get('content', '')
                        )
                        print(f"📝 Selected transcription: {transcribed_text[:100] if transcribed_text else 'None'}...")
                else:
                    transcribed_text = str(result)
                    
            else:
                print("⚠️ Speech-to-text service not available")
                return jsonify({
                    'status': 'error',
                    'message': 'Speech-to-text service not available'
                }), 503
                
        except Exception as stt_error:
            print(f"❌ Speech-to-text processing failed: {stt_error}")
            transcribed_text = f"Speech-to-text processing failed: {str(stt_error)}"
        
        # Analyze transcribed text if meaningful
        if (transcribed_text and 
            len(transcribed_text.strip()) > 10 and 
            not transcribed_text.lower().startswith('speech') and
            not 'error' in transcribed_text.lower()):
            try:
                print("🤖 Analyzing transcribed text...")
                summary, keywords, sentiment, statistics = process_text_with_ai(transcribed_text)
                analysis = {
                    'summary': summary,
                    'keywords': keywords[:10] if keywords else [],
                    'sentiment': sentiment,
                    'statistics': statistics
                }
                print(f"✅ Text analysis complete: {sentiment} sentiment")
            except Exception as ai_error:
                print(f"⚠️ Text analysis failed: {ai_error}")
        
        final_text = transcribed_text or "No speech detected in audio"
        
        result_data = {
            'transcribed_text': final_text,
            'analysis': analysis,
            'audio_processed': True
        }
        
        print("✅ Audio processing completed successfully")
        return jsonify({
            'status': 'success',
            'result': result_data
        })
        
    except Exception as e:
        print(f"❌ Error processing audio: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Audio processing failed: {str(e)}'
        }), 500

@app.route('/api/ai/gpu-info', methods=['GET'])
def get_gpu_info():
    """Get GPU and AI services information"""
    try:
        gpu_info = {
            'cuda_available': torch.cuda.is_available(),
            'device_count': torch.cuda.device_count() if torch.cuda.is_available() else 0
        }
        
        if torch.cuda.is_available():
            gpu_info.update({
                'gpu_name': torch.cuda.get_device_name(0),
                'gpu_memory_total': f"{torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB",
                'gpu_memory_allocated': f"{torch.cuda.memory_allocated(0) / 1024**3:.2f} GB",
                'gpu_memory_cached': f"{torch.cuda.memory_reserved(0) / 1024**3:.2f} GB"
            })
        
        services_status = {
            'summarizer': 'available' if summarizer else 'unavailable',
            'nlp_processor': 'available' if nlp_processor else 'unavailable',
            'image_to_text': 'available' if image_to_text else 'unavailable',
            'speech_to_text': 'available' if speech_to_text else 'unavailable'
        }
        
        return jsonify({
            'status': 'success',
            'gpu_info': gpu_info,
            'ai_services': services_status
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    try:
        print("\n🚀 Starting Smart Notes API Server...")
        print(f"🌐 Server will be available at: http://127.0.0.1:5000")
        print(f"🎮 CUDA Status: {'Enabled' if torch.cuda.is_available() else 'Disabled'}")
        print(f"🤖 AI Services: {'Ready' if ai_initialized else 'Failed'}")
        print("\n📡 Starting Flask development server...")
        print("Press Ctrl+C to stop the server")
        print("=" * 50)
        
        # Create tables if they don't exist
        with app.app_context():
            db.create_all()
            print("✅ Database tables created/verified")
        
        # Start the Flask development server
        app.run(
            host='0.0.0.0',
            port=5000,
            debug=True,
            use_reloader=False,
            threaded=True
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server startup failed: {e}")
        import traceback
        traceback.print_exc()