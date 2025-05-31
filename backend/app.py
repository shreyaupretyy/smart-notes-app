from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from config import Config
import json
import os

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
CORS(app)

# Models
class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    summary = db.Column(db.Text)
    keywords = db.Column(db.Text)  # JSON string
    sentiment = db.Column(db.String(20))
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
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# Create upload directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize AI services (we'll implement these step by step)
def initialize_ai_services():
    """Initialize AI services - placeholder for now"""
    global summarizer, nlp_processor
    summarizer = None
    nlp_processor = None
    print("AI services initialized (placeholder)")

def process_text_with_ai(text):
    """Process text with AI services - placeholder implementation"""
    # Simple placeholder until we implement real AI services
    summary = text[:100] + "..." if len(text) > 100 else text
    keywords = ["placeholder", "keywords"]
    sentiment = "neutral"
    return summary, keywords, sentiment

# Create database tables
with app.app_context():
    db.create_all()
    initialize_ai_services()

# Routes
@app.route('/')
def home():
    return {
        'message': 'Smart Notes API is running!', 
        'status': 'success',
        'endpoints': {
            'notes': '/api/notes',
            'ai_summarize': '/api/ai/summarize',
            'ai_analyze': '/api/ai/analyze'
        }
    }

@app.route('/api/health')
def health_check():
    return {
        'status': 'healthy',
        'database': 'connected',
        'ai_services': 'initialized'
    }

# Notes CRUD operations
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
        summary, keywords, sentiment = process_text_with_ai(data['content'])
        
        note = Note(
            title=data['title'],
            content=data['content'],
            summary=summary,
            keywords=json.dumps(keywords),
            sentiment=sentiment
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
            summary, keywords, sentiment = process_text_with_ai(data['content'])
            note.summary = summary
            note.keywords = json.dumps(keywords)
            note.sentiment = sentiment
        
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

# AI Services endpoints
@app.route('/api/ai/summarize', methods=['POST'])
def summarize_text():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'status': 'error', 'message': 'Text is required'}), 400
        
        summary, _, _ = process_text_with_ai(data['text'])
        
        return jsonify({
            'status': 'success',
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/ai/analyze', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'status': 'error', 'message': 'Text is required'}), 400
        
        summary, keywords, sentiment = process_text_with_ai(data['text'])
        
        return jsonify({
            'status': 'success',
            'analysis': {
                'summary': summary,
                'keywords': keywords,
                'sentiment': sentiment
            }
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Image to text endpoint (placeholder)
@app.route('/api/ai/image-to-text', methods=['POST'])
def image_to_text():
    try:
        if 'image' not in request.files:
            return jsonify({'status': 'error', 'message': 'No image file provided'}), 400
        
        # Placeholder implementation
        return jsonify({
            'status': 'success',
            'text': 'Placeholder: Image to text conversion will be implemented here'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Speech to text endpoint (placeholder)
@app.route('/api/ai/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        if 'audio' not in request.files:
            return jsonify({'status': 'error', 'message': 'No audio file provided'}), 400
        
        # Placeholder implementation
        return jsonify({
            'status': 'success',
            'text': 'Placeholder: Speech to text conversion will be implemented here'
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    app.run(
        debug=app.config['DEBUG'],
        host='0.0.0.0',
        port=5000
    )