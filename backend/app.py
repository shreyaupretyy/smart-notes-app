from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from config import Config
import json
import os
import torch

# Import database instance
from database import db

# Add new AI service imports
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

# Import routes after app initialization to avoid circular imports
from routes.api import notes_bp

# Register blueprints
app.register_blueprint(notes_bp)

# Add debug logging
@app.before_request
def log_request_info():
    print(f"📍 Request: {request.method} {request.url}")


# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize AI services
print("🤖 Initializing AI services...")
try:
    # Existing services
    summarizer = Summarizer()
    nlp_processor = NLPProcessor()
    
    # New services
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

# Add this helper function before the routes (after the AI services initialization)

def process_text_with_ai(text):
    """Process text with all available AI services"""
    try:
        # Summarization
        if summarizer and summarizer.summarizer:
            summary = summarizer.summarize(text)
        else:
            # Fallback summary
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
        # Return fallback values
        summary = text[:100] + "..." if len(text) > 100 else text
        keywords = []
        sentiment = "neutral"
        statistics = {"word_count": len(text.split())}
        return summary, keywords, sentiment, statistics

# Routes
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
            'ai_test': '/api/ai/test (GET)',
            'health': '/api/health',
            'routes': '/api/routes'
        },
        'usage': {
            'summarize': 'POST /api/ai/summarize with {"text": "your text here"}',
            'analyze': 'POST /api/ai/analyze with {"text": "your text here"}',
            'test': 'GET /api/ai/test to test AI services'
        }
    }

@app.route('/api/health')
def health_check():
    return {
        'status': 'healthy',
        'database': 'connected',
        'ai_services': {
            'summarizer': 'ready' if summarizer and summarizer.summarizer else 'failed',
            'nlp_processor': 'ready' if nlp_processor else 'failed'
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

# AI test endpoint for quick testing
@app.route('/api/ai/test')
def test_ai_services():
    """Test AI services with sample text"""
    test_text = "This is a sample text for testing AI services. It contains multiple sentences to demonstrate summarization, keyword extraction, and sentiment analysis capabilities."
    
    try:
        result = {
            'status': 'success',
            'test_text': test_text,
            'services_available': {
                'summarizer': summarizer is not None and summarizer.summarizer is not None,
                'nlp_processor': nlp_processor is not None
            }
        }
        
        # Test summarization
        if summarizer and summarizer.summarizer:
            try:
                summary = summarizer.summarize(test_text)
                result['summarization'] = {
                    'status': 'success',
                    'summary': summary
                }
            except Exception as e:
                result['summarization'] = {
                    'status': 'error',
                    'error': str(e)
                }
        else:
            result['summarization'] = {
                'status': 'service_unavailable',
                'fallback_summary': test_text[:50] + '...'
            }
        
        # Test NLP processing
        if nlp_processor:
            try:
                keywords, sentiment = nlp_processor.process_text(test_text)
                statistics = nlp_processor.get_text_statistics(test_text)
                result['nlp_analysis'] = {
                    'status': 'success',
                    'keywords': keywords,
                    'sentiment': sentiment,
                    'statistics': statistics
                }
            except Exception as e:
                result['nlp_analysis'] = {
                    'status': 'error',
                    'error': str(e)
                }
        else:
            result['nlp_analysis'] = {
                'status': 'service_unavailable'
            }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# AI Services endpoints
@app.route('/api/ai/summarize', methods=['POST'])
def summarize_text():
    """Summarize text endpoint - requires POST with JSON data"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error', 
                'message': 'Text is required',
                'usage': 'POST with {"text": "your text here"}'
            }), 400
        
        text_to_summarize = data['text']
        
        if not text_to_summarize.strip():
            return jsonify({
                'status': 'error',
                'message': 'Text cannot be empty'
            }), 400
        
        if summarizer and summarizer.summarizer:
            summary = summarizer.summarize(text_to_summarize)
        else:
            summary = text_to_summarize[:100] + "..." if len(text_to_summarize) > 100 else text_to_summarize
        
        return jsonify({
            'status': 'success',
            'summary': summary,
            'original_length': len(text_to_summarize),
            'summary_length': len(summary)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error', 
            'message': str(e)
        }), 500

@app.route('/api/ai/analyze', methods=['POST'])
def analyze_text():
    """Analyze text endpoint - requires POST with JSON data"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error', 
                'message': 'Text is required',
                'usage': 'POST with {"text": "your text here"}'
            }), 400
        
        text_to_analyze = data['text']
        
        if not text_to_analyze.strip():
            return jsonify({
                'status': 'error',
                'message': 'Text cannot be empty'
            }), 400
        
        if nlp_processor:
            keywords, sentiment = nlp_processor.process_text(text_to_analyze)
            statistics = nlp_processor.get_text_statistics(text_to_analyze)
        else:
            keywords = ["service_unavailable"]
            sentiment = "neutral"
            statistics = {}
        
        return jsonify({
            'status': 'success',
            'analysis': {
                'keywords': keywords,
                'sentiment': sentiment,
                'statistics': statistics
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error', 
            'message': str(e)
        }), 500

# Combined AI processing endpoint
@app.route('/api/ai/process', methods=['POST'])
def process_text():
    """Process text with all AI services"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({
                'status': 'error', 
                'message': 'Text is required',
                'usage': 'POST with {"text": "your text here"}'
            }), 400
        
        text = data['text']
        
        if not text.strip():
            return jsonify({
                'status': 'error',
                'message': 'Text cannot be empty'
            }), 400
        
        summary, keywords, sentiment, statistics = process_text_with_ai(text)
        
        return jsonify({
            'status': 'success',
            'results': {
                'summary': summary,
                'keywords': keywords,
                'sentiment': sentiment,
                'statistics': statistics
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
# Add this endpoint after the other AI endpoints

@app.route('/api/ai/test-long', methods=['GET'])
def test_long_summarization():
    """Test summarization with longer text"""
    long_text = """
    Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals. Colloquially, the term "artificial intelligence" is often used to describe machines that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving".
    
    The scope of AI is disputed: as machines become increasingly capable, tasks considered to require "intelligence" are often removed from the definition of AI, a phenomenon known as the AI effect. A quip in Tesler's Theorem says "AI is whatever hasn't been done yet." For instance, optical character recognition is frequently excluded from things considered to be AI, having become a routine technology.
    
    Modern machine learning techniques are pervasive and are too numerous to list here. Frequently, when a technique reaches mainstream use, it is no longer considered AI; this phenomenon is described as the AI effect. High-profile examples of AI include autonomous vehicles, medical diagnosis, creating art, proving mathematical theorems, playing games, search engines, online assistants, image recognition, spam filtering, predicting flight delays, prediction of judicial decisions, targeting online advertisements, and energy storage.
    
    AI applications include advanced web search engines, recommendation systems, understanding human speech, self-driving cars, automated decision-making and competing at the highest level in strategic game systems. As machines become increasingly capable, mental facilities once thought to require intelligence are removed from the definition. For example, optical character recognition is no longer perceived as an exemplar of "artificial intelligence": it is just a routine technology.
    """
    
    try:
        print("🧪 Testing long text summarization")
        
        if summarizer and summarizer.summarizer:
            summary = summarizer.summarize(long_text.strip())
            
            return jsonify({
                'status': 'success',
                'original_text': long_text.strip(),
                'summary': summary,
                'original_length': len(long_text.strip()),
                'summary_length': len(summary),
                'compression_ratio': len(summary) / len(long_text.strip()),
                'original_words': len(long_text.strip().split()),
                'summary_words': len(summary.split())
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Summarizer not available'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Image to text endpoint (placeholder for now)
@app.route('/api/ai/image-to-text', methods=['POST'])
def process_image_to_text():
    """Convert image to text using AI models"""
    try:
        if not image_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Image-to-text service not available'
            }), 500
        
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No image data provided'
            }), 400
        
        image_data = data['image']
        mode = data.get('mode', 'auto')  # auto, caption, ocr, document
        
        print(f"🖼️ Processing image with mode: {mode}")
        result = image_to_text.process_image(image_data, mode)
        
        if 'error' in result:
            return jsonify({
                'status': 'error',
                'message': result['error']
            }), 500
        
        return jsonify({
            'status': 'success',
            'result': result,
            'mode': mode
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/speech-to-text', methods=['POST'])
def process_speech_to_text():
    """Convert speech audio to text using AI models"""
    try:
        if not speech_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Speech-to-text service not available'
            }), 500
        
        data = request.get_json()
        if not data or 'audio' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No audio data provided'
            }), 400
        
        audio_data = data['audio']
        language = data.get('language', 'auto')
        
        print(f"🎤 Processing audio with language: {language}")
        result = speech_to_text.transcribe_audio(audio_data, language)
        
        if 'error' in result:
            return jsonify({
                'status': 'error',
                'message': result['error']
            }), 500
        
        return jsonify({
            'status': 'success',
            'result': result,
            'language': language
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/test-image', methods=['GET'])
def test_image_processing():
    """Test image processing with sample images"""
    try:
        if not image_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Image-to-text service not available'
            }), 500
        
        from PIL import Image, ImageDraw, ImageFont
        import base64
        import io
        
        # Create test images
        test_results = []
        
        # Test 1: Simple text image
        img1 = Image.new('RGB', (300, 100), color='white')
        draw1 = ImageDraw.Draw(img1)
        try:
            font = ImageFont.load_default()
            draw1.text((10, 30), "Hello World! This is a test.", fill='black', font=font)
        except:
            draw1.text((10, 30), "Hello World! This is a test.", fill='black')
        
        # Convert to base64
        buffer1 = io.BytesIO()
        img1.save(buffer1, format='PNG')
        img1_base64 = base64.b64encode(buffer1.getvalue()).decode()
        
        # Process image
        result1 = image_to_text.process_image(img1_base64, 'auto')
        test_results.append({
            'test': 'simple_text',
            'result': result1
        })
        
        # Test 2: Colored background image  
        img2 = Image.new('RGB', (250, 80), color='lightblue')
        draw2 = ImageDraw.Draw(img2)
        draw2.text((10, 25), "AI Image Processing", fill='darkblue')
        
        buffer2 = io.BytesIO()
        img2.save(buffer2, format='PNG')
        img2_base64 = base64.b64encode(buffer2.getvalue()).decode()
        
        result2 = image_to_text.process_image(img2_base64, 'ocr')
        test_results.append({
            'test': 'colored_background',
            'result': result2
        })
        
        # Get model info
        model_info = image_to_text.get_model_info()
        
        return jsonify({
            'status': 'success',
            'model_info': model_info,
            'test_results': test_results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/test-speech', methods=['GET'])
def test_speech_processing():
    """Test speech processing capabilities"""
    try:
        if not speech_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Speech-to-text service not available'
            }), 500
        
        # Get model info
        model_info = speech_to_text.get_model_info()
        
        return jsonify({
            'status': 'success',
            'message': 'Speech-to-text service ready',
            'model_info': model_info,
            'supported_formats': ['wav', 'mp3', 'ogg', 'flac'],
            'note': 'Use /api/ai/speech-to-text endpoint with actual audio data'
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/benchmark-image', methods=['POST'])
def benchmark_image_processing():
    """Benchmark image processing performance"""
    try:
        if not image_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Image-to-text service not available'
            }), 500
        
        data = request.get_json()
        image_data = data.get('image')
        
        if not image_data:
            # Create a default test image if none provided
            from PIL import Image, ImageDraw
            import base64
            import io
            
            img = Image.new('RGB', (400, 200), color='white')
            draw = ImageDraw.Draw(img)
            draw.text((20, 50), "Performance Test Image", fill='black')
            draw.text((20, 100), "This image tests AI processing speed", fill='black')
            
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            image_data = base64.b64encode(buffer.getvalue()).decode()
        
        benchmark_result = image_to_text.benchmark_image_processing(image_data)
        
        return jsonify({
            'status': 'success',
            'benchmark': benchmark_result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/benchmark-speech', methods=['POST'])
def benchmark_speech_processing():
    """Benchmark speech processing performance"""
    try:
        if not speech_to_text:
            return jsonify({
                'status': 'error',
                'message': 'Speech-to-text service not available'
            }), 500
        
        data = request.get_json()
        audio_data = data.get('audio')
        
        if not audio_data:
            return jsonify({
                'status': 'error',
                'message': 'Audio data required for benchmarking'
            }), 400
        
        benchmark_result = speech_to_text.benchmark_speech_processing(audio_data)
        
        return jsonify({
            'status': 'success',
            'benchmark': benchmark_result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# Update the existing GPU info endpoint to include new services
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
        
        # AI Services status
        services_status = {
            'summarizer': {
                'status': 'available' if summarizer else 'unavailable',
                'info': summarizer.get_model_info() if summarizer else None
            },
            'nlp_processor': {
                'status': 'available' if nlp_processor else 'unavailable',
                'info': nlp_processor.get_model_info() if nlp_processor else None
            },
            'image_to_text': {
                'status': 'available' if image_to_text else 'unavailable',
                'info': image_to_text.get_model_info() if image_to_text else None
            },
            'speech_to_text': {
                'status': 'available' if speech_to_text else 'unavailable',
                'info': speech_to_text.get_model_info() if speech_to_text else None
            }
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

# Replace the old placeholder image-to-text endpoint (remove the old one and keep this new one)
# Also remove the old placeholder speech-to-text endpoint



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
            host='0.0.0.0',  # Listen on all interfaces
            port=5000,       # Port 5000
            debug=True,      # Enable debug mode
            use_reloader=False,  # Disable reloader to avoid double initialization
            threaded=True    # Enable threading
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server startup failed: {e}")
        import traceback
        traceback.print_exc()