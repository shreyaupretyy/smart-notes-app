from flask import Blueprint, request, jsonify
from models.note import Note
from database import db
import json
import base64
import io
from PIL import Image

# Create blueprint for notes API
notes_bp = Blueprint('notes', __name__, url_prefix='/api')

def get_ai_services():
    """Get AI services at runtime to avoid circular imports"""
    try:
        from app import process_text_with_ai, image_to_text, speech_to_text
        return process_text_with_ai, image_to_text, speech_to_text
    except ImportError:
        return None, None, None
    
# routes/api.py - Add this test route at the top
@notes_bp.route('/test', methods=['GET'])
def test_route():
    return jsonify({'message': 'Blueprint is working!', 'status': 'success'})

@notes_bp.route('/notes', methods=['GET'])
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

# backend/routes/api.py - Optimize create_note function
@notes_bp.route('/notes', methods=['POST'])
def create_note():
    """Create a new note with optimized AI processing"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Title and content are required'
            }), 400

        print(f"📝 Creating note: {data['title']}")

        # Create note in database FIRST (fast)
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO notes (title, content, category, ai_processed, created_at, updated_at)
            VALUES (?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ''', (data['title'], data['content'], data.get('category')))
        
        note_id = cursor.lastrowid
        conn.commit()
        
        print(f"✅ Note {note_id} created in database")

        # Process with AI asynchronously (slower)
        try:
            # Quick timeout for AI processing
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("AI processing timeout")
            
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(10)  # 10 second timeout
            
            # Get AI services
            from app import process_text_with_ai
            if process_text_with_ai:
                print("🤖 Processing with AI...")
                summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
                
                # Update with AI results
                cursor.execute('''
                    UPDATE notes 
                    SET ai_processed = TRUE, summary = ?, sentiment = ?, keywords = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (summary, sentiment, json.dumps(keywords), note_id))
                conn.commit()
                print(f"🎯 AI processing completed for note {note_id}")
            
            signal.alarm(0)  # Cancel timeout
            
        except (TimeoutError, Exception) as ai_error:
            print(f"⚠️ AI processing failed/timeout: {ai_error}")
            # Note is still saved, just without AI processing
        
        # Get the final note data
        cursor.execute('''
            SELECT id, title, content, category, created_at, updated_at,
                   ai_processed, summary, sentiment, keywords
            FROM notes WHERE id = ?
        ''', (note_id,))
        
        note_data = cursor.fetchone()
        
        note = {
            'id': note_data[0],
            'title': note_data[1],
            'content': note_data[2],
            'category': note_data[3],
            'created_at': note_data[4],
            'updated_at': note_data[5],
            'ai_processed': bool(note_data[6]),
            'summary': note_data[7],
            'sentiment': note_data[8],
            'keywords': json.loads(note_data[9]) if note_data[9] else [],
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Note created successfully',
            'note': note
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating note: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# routes/api.py - Add debugging to get_note function
@notes_bp.route('/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """Get a specific note by ID"""
    try:
        print(f"🔍 Looking for note with ID: {note_id}")
        
        # Check if note exists
        note = Note.query.filter_by(id=note_id).first()
        
        if not note:
            print(f"❌ Note {note_id} not found in database")
            # Let's see what notes DO exist
            all_notes = Note.query.all()
            print(f"📋 Available notes: {[n.id for n in all_notes]}")
            return jsonify({
                'status': 'error',
                'message': f'Note {note_id} not found',
                'available_notes': [n.id for n in all_notes]
            }), 404
        
        print(f"✅ Found note {note_id}: {note.title}")
        
        return jsonify({
            'status': 'success',
            'note': note.to_dict()
        })
        
    except Exception as e:
        print(f"❌ Error getting note {note_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# routes/api.py - Add/fix the PUT route
@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    """Update an existing note using raw SQLite"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Title and content are required'
            }), 400
        
        print(f"✏️ Updating note {note_id}: {data['title']}")
        
        # Use raw SQLite
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note exists
        cursor.execute('SELECT id FROM notes WHERE id = ?', (note_id,))
        if not cursor.fetchone():
            return jsonify({
                'status': 'error',
                'message': 'Note not found'
            }), 404
        
        # Update note
        cursor.execute('''
            UPDATE notes 
            SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (data['title'], data['content'], data.get('category'), note_id))
        
        conn.commit()
        
        # Process with AI if needed (optional, for speed)
        try:
            from app import process_text_with_ai
            if process_text_with_ai:
                summary, keywords, sentiment, statistics = process_text_with_ai(data['content'])
                cursor.execute('''
                    UPDATE notes 
                    SET ai_processed = TRUE, summary = ?, sentiment = ?, keywords = ?
                    WHERE id = ?
                ''', (summary, sentiment, json.dumps(keywords), note_id))
                conn.commit()
        except Exception as ai_error:
            print(f"⚠️ AI processing failed: {ai_error}")
        
        # Get updated note
        cursor.execute('''
            SELECT id, title, content, category, created_at, updated_at,
                   ai_processed, summary, sentiment, keywords
            FROM notes WHERE id = ?
        ''', (note_id,))
        
        note_data = cursor.fetchone()
        note = {
            'id': note_data[0],
            'title': note_data[1],
            'content': note_data[2],
            'category': note_data[3],
            'created_at': note_data[4],
            'updated_at': note_data[5],
            'ai_processed': bool(note_data[6]),
            'summary': note_data[7],
            'sentiment': note_data[8],
            'keywords': json.loads(note_data[9]) if note_data[9] else [],
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Note updated successfully',
            'note': note
        })
        
    except Exception as e:
        print(f"❌ Error updating note {note_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# routes/api.py - Add the missing DELETE route
@notes_bp.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a note using raw SQLite"""
    try:
        print(f"🗑️ Deleting note with ID: {note_id}")
        
        # Use raw SQLite to match your other routes
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note exists first
        cursor.execute('SELECT id, title FROM notes WHERE id = ?', (note_id,))
        note_data = cursor.fetchone()
        
        if not note_data:
            print(f"❌ Note {note_id} not found for deletion")
            return jsonify({
                'status': 'error',
                'message': f'Note {note_id} not found'
            }), 404
        
        print(f"✅ Found note to delete: {note_data[1]}")
        
        # Delete the note
        cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        rows_affected = cursor.rowcount
        conn.commit()
        
        if rows_affected > 0:
            print(f"✅ Note {note_id} deleted successfully")
            return jsonify({
                'status': 'success',
                'message': 'Note deleted successfully'
            })
        else:
            print(f"❌ No rows affected when deleting note {note_id}")
            return jsonify({
                'status': 'error',
                'message': 'Failed to delete note'
            }), 500
        
    except Exception as e:
        print(f"❌ Error deleting note {note_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@notes_bp.route('/notes/<int:note_id>/add-image', methods=['POST'])
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

@notes_bp.route('/notes/<int:note_id>/add-audio', methods=['POST'])
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

@notes_bp.route('/notes/categories', methods=['GET'])
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

@notes_bp.route('/notes/stats', methods=['GET'])
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



