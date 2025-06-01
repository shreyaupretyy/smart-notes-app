from flask import Blueprint, request, jsonify
from models.note import Note
from database import db
# Import AI processing function at runtime to avoid circular imports
import json

# Create blueprint for notes API
notes_bp = Blueprint('notes', __name__, url_prefix='/api/notes')

def get_ai_services():
    """Get AI services at runtime to avoid circular imports"""
    try:
        from app import process_text_with_ai, image_to_text, speech_to_text
        return process_text_with_ai, image_to_text, speech_to_text
    except ImportError:
        return None, None, None

@notes_bp.route('/', methods=['GET'])
def get_all_notes():
    """Get all notes with optional filtering"""
    try:
        # Get query parameters
        category = request.args.get('category')
        sentiment = request.args.get('sentiment')
        search = request.args.get('search')
        
        # Base query
        query = Note.query
        
        # Apply filters
        if category:
            query = query.filter(Note.category == category)
        if sentiment:
            query = query.filter(Note.sentiment == sentiment)
        if search:
            query = query.filter(Note.content.contains(search) | Note.title.contains(search))
        
        # Order by most recent
        notes = query.order_by(Note.updated_at.desc()).all()
        
        return jsonify({
            'status': 'success',
            'notes': [note.to_dict() for note in notes],
            'count': len(notes)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/', methods=['POST'])
def create_note():
    """Create a new note with AI processing"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Title and content are required'
            }), 400
        
        # Create note
        note = Note(
            title=data['title'],
            content=data['content'],
            category=data.get('category')
        )
        
        # Add tags if provided
        if 'tags' in data:
            note.set_tags(data['tags'])
        
        # Process with AI
        try:
            process_text_with_ai, _, _ = get_ai_services()
            if process_text_with_ai:
                summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
                
                note.summary = summary
                note.set_keywords(keywords)
                note.sentiment = sentiment
                note.ai_processed = True
            else:
                note.ai_processed = False
                
        except Exception as ai_error:
            print(f"⚠️ AI processing failed: {ai_error}")
            note.ai_processed = False
        
        # Save to database
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note created successfully',
            'note': note.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """Get a specific note by ID"""
    try:
        note = Note.query.get_or_404(note_id)
        return jsonify({
            'status': 'success',
            'note': note.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 404

@notes_bp.route('/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    """Update an existing note"""
    try:
        note = Note.query.get_or_404(note_id)
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        # Update fields
        if 'title' in data:
            note.title = data['title']
        if 'content' in data:
            note.content = data['content']
            
            # Re-process with AI if content changed
            try:
                process_text_with_ai, _, _ = get_ai_services()
                if process_text_with_ai:
                    summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
                    note.summary = summary
                    note.set_keywords(keywords)
                    note.sentiment = sentiment
                    note.ai_processed = True
            except Exception as ai_error:
                print(f"⚠️ AI re-processing failed: {ai_error}")
        
        if 'category' in data:
            note.category = data['category']
        if 'tags' in data:
            note.set_tags(data['tags'])
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note updated successfully',
            'note': note.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note"""
    try:
        note = Note.query.get_or_404(note_id)
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Note deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/<int:note_id>/add-image', methods=['POST'])
def add_image_to_note(note_id):
    """Add image and extract text"""
    try:
        note = Note.query.get_or_404(note_id)
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No image data provided'
            }), 400
        
        # Process image with AI
        if image_to_text:
            result = image_to_text.process_image(data['image'], 'auto')
            
            if 'error' not in result:
                note.image_text = result.get('best_text', '')
                note.has_image = True
                
                # Re-process note with new text
                full_text = note.get_full_text()
                summary, keywords, sentiment, statistics = process_text_with_ai(full_text)
                note.summary = summary
                note.set_keywords(keywords)
                note.sentiment = sentiment
                
                db.session.commit()
                
                return jsonify({
                    'status': 'success',
                    'message': 'Image processed and added to note',
                    'extracted_text': note.image_text,
                    'note': note.to_dict()
                })
        
        return jsonify({
            'status': 'error',
            'message': 'Image processing failed'
        }), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/<int:note_id>/add-audio', methods=['POST'])
def add_audio_to_note(note_id):
    """Add audio and transcribe to text"""
    try:
        note = Note.query.get_or_404(note_id)
        data = request.get_json()
        
        if not data or 'audio' not in data:
            return jsonify({
                'status': 'error',
                'message': 'No audio data provided'
            }), 400
        
        # Process audio with AI
        if speech_to_text:
            result = speech_to_text.transcribe_audio(data['audio'])
            
            if 'error' not in result:
                note.audio_text = result.get('transcription', '')
                note.has_audio = True
                
                # Re-process note with new text
                full_text = note.get_full_text()
                summary, keywords, sentiment, statistics = process_text_with_ai(full_text)
                note.summary = summary
                note.set_keywords(keywords)
                note.sentiment = sentiment
                
                db.session.commit()
                
                return jsonify({
                    'status': 'success',
                    'message': 'Audio transcribed and added to note',
                    'transcribed_text': note.audio_text,
                    'note': note.to_dict()
                })
        
        return jsonify({
            'status': 'error',
            'message': 'Audio processing failed'
        }), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all unique categories"""
    try:
        categories = db.session.query(Note.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'status': 'success',
            'categories': category_list
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get notes statistics"""
    try:
        total_notes = Note.query.count()
        ai_processed = Note.query.filter(Note.ai_processed == True).count()
        by_sentiment = db.session.query(Note.sentiment, db.func.count(Note.id)).group_by(Note.sentiment).all()
        
        sentiment_stats = {sentiment: count for sentiment, count in by_sentiment if sentiment}
        
        return jsonify({
            'status': 'success',
            'stats': {
                'total_notes': total_notes,
                'ai_processed': ai_processed,
                'sentiment_breakdown': sentiment_stats
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500