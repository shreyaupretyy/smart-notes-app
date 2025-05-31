from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from config import Config
import json
import os
import torch

# Import AI services
from services.summarizer import Summarizer
from services.nlp_processor import NLPProcessor

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
CORS(app)

# Add debug logging
@app.before_request
def log_request_info():
    print(f"📍 Request: {request.method} {request.url}")

# Models
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text)
    keywords = db.Column(db.Text)  # JSON string
    sentiment = db.Column(db.String(20))
    statistics = db.Column(db.Text)  # JSON string for text stats
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'keywords': json.loads(self.keywords) if self.keywords else [],
            'sentiment': self.sentiment,
            'statistics': json.loads(self.statistics) if self.statistics else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize AI services
def initialize_ai_services():
    """Initialize AI services"""
    global summarizer, nlp_processor
    print("🤖 Initializing AI services...")
    try:
        summarizer = Summarizer()
        nlp_processor = NLPProcessor()
        print("✅ AI services initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing AI services: {e}")
        summarizer = None
        nlp_processor = None
        return False

def process_text_with_ai(text):
    """Process text with AI services"""
    try:
        # Generate summary
        if summarizer:
            summary = summarizer.summarize(text)
        else:
            summary = text[:100] + "..." if len(text) > 100 else text
        
        # Extract keywords and sentiment
        if nlp_processor:
            keywords, sentiment = nlp_processor.process_text(text)
            statistics = nlp_processor.get_text_statistics(text)
        else:
            keywords = ["placeholder", "keywords"]
            sentiment = "neutral"
            statistics = {}
        
        return summary, keywords, sentiment, statistics
        
    except Exception as e:
        print(f"AI processing error: {e}")
        # Fallback processing
        summary = text[:100] + "..." if len(text) > 100 else text
        keywords = ["error", "fallback"]
        sentiment = "neutral"
        statistics = {}
        return summary, keywords, sentiment, statistics

# Create database tables and initialize AI
with app.app_context():
    db.create_all()
    ai_initialized = initialize_ai_services()

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
# Notes CRUD operations (existing code remains the same)
@app.route('/api/notes', methods=['GET'])
def get_notes():
    try:
        notes = Note.query.order_by(Note.updated_at.desc()).all()
        return jsonify({
            'status': 'success',
            'notes': [note.to_dict() for note in notes],
            'count': len(notes)
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/notes', methods=['POST'])
def create_note():
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({'status': 'error', 'message': 'Title and content are required'}), 400
        
        # Process text with AI
        summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
        
        note = Note(
            title=data['title'],
            content=data['content'],
            summary=summary,
            keywords=json.dumps(keywords),
            sentiment=sentiment,
            statistics=json.dumps(statistics)
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note created successfully',
            'note': note.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        return jsonify({
            'status': 'success',
            'note': note.to_dict()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404

@app.route('/api/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        data = request.get_json()
        
        if 'title' in data:
            note.title = data['title']
        
        if 'content' in data:
            note.content = data['content']
            # Re-process with AI
            summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
            note.summary = summary
            note.keywords = json.dumps(keywords)
            note.sentiment = sentiment
            note.statistics = json.dumps(statistics)
        
        note.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note updated successfully',
            'note': note.to_dict()
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note deleted successfully'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Image to text endpoint (placeholder for now)
@app.route('/api/ai/image-to-text', methods=['POST'])
def image_to_text():
    try:
        if 'image' not in request.files:
            return jsonify({'status': 'error', 'message': 'No image file provided'}), 400
        
        # Placeholder implementation
        return jsonify({
            'status': 'success',
            'text': 'Image to text conversion - Coming soon!'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Speech to text endpoint (placeholder for now)
@app.route('/api/ai/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        if 'audio' not in request.files:
            return jsonify({'status': 'error', 'message': 'No audio file provided'}), 400
        
        # Placeholder implementation
        return jsonify({
            'status': 'success',
            'text': 'Speech to text conversion - Coming soon!'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Add these endpoints after the existing AI endpoints

@app.route('/api/ai/test-nlp', methods=['GET'])
def test_nlp_processor():
    """Test NLP processor with sample text"""
    test_texts = [
        "I absolutely love this new technology! It's amazing and works perfectly.",
        "This is terrible. I hate how complicated and frustrating this system is.",
        "The weather today is sunny. It's a normal day with average temperature.",
        "Machine learning and artificial intelligence are transforming the technology industry with innovative solutions."
    ]
    
    try:
        results = []
        
        for i, text in enumerate(test_texts):
            print(f"🧪 Testing NLP with text {i+1}")
            
            if nlp_processor:
                keywords, sentiment = nlp_processor.process_text(text)
                statistics = nlp_processor.get_text_statistics(text)
                
                results.append({
                    'text': text,
                    'keywords': keywords,
                    'sentiment': sentiment,
                    'statistics': statistics
                })
            else:
                results.append({
                    'text': text,
                    'error': 'NLP processor not available'
                })
        
        # Get model info
        model_info = nlp_processor.get_model_info() if nlp_processor else {'status': 'not_loaded'}
        
        return jsonify({
            'status': 'success',
            'model_info': model_info,
            'test_results': results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/ai/benchmark-nlp', methods=['POST'])
def benchmark_nlp():
    """Benchmark NLP processing performance"""
    try:
        data = request.get_json()
        test_text = data.get('text', 
            "Artificial intelligence and machine learning are revolutionizing how we process and understand human language. "
            "These technologies enable computers to analyze sentiment, extract keywords, and understand context in ways that were "
            "previously impossible. The advancement of transformer models and CUDA acceleration has made real-time text processing "
            "more efficient and accurate than ever before."
        )
        
        if nlp_processor:
            benchmark_results = nlp_processor.benchmark_nlp(test_text)
            
            return jsonify({
                'status': 'success',
                'benchmark': benchmark_results,
                'input_text': test_text
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'NLP processor not available'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
# Add this at the very end of app.py

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