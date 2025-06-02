from flask import Blueprint, request, jsonify
from models.note import Note
from database import db
import json
import base64
import io
from PIL import Image
import threading 

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

# backend/routes/api.py - Enhanced GET route with debugging
@notes_bp.route('/notes', methods=['GET'])
def get_all_notes():
    """Get all notes from database with detailed debugging"""
    try:
        print("📋 Fetching all notes...")
        
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # First, check total count in database
        cursor.execute('SELECT COUNT(*) FROM notes')
        total_count = cursor.fetchone()[0]
        print(f"📊 Total notes in database: {total_count}")
        
        # Get all columns to see what's available
        cursor.execute("PRAGMA table_info(notes)")
        columns = cursor.fetchall()
        print(f"📋 Available columns: {[col[1] for col in columns]}")
        
        # Get all notes with explicit column handling
        cursor.execute('''

            SELECT id, title, content, category, created_at, updated_at,
                   COALESCE(ai_processed, 0) as ai_processed, 
                   summary, sentiment, keywords
            FROM notes 
            ORDER BY created_at DESC
        ''')
        
        rows = cursor.fetchall()
        print(f"📊 Query returned {len(rows)} rows")
        
        # Debug each row
        for i, row in enumerate(rows[:3]):  # Show first 3 for debugging
            print(f"Row {i}: id={row[0]}, title='{row[1][:30]}...', created_at={row[4]}")
        
        conn.close()
        
        notes = []
        for row in rows:
            try:
                note = {
                    'id': row[0],
                    'title': row[1] or 'Untitled',
                    'content': row[2] or '',
                    'category': row[3] or '',
                    'created_at': row[4],
                    'updated_at': row[5],
                    'ai_processed': bool(row[6]) if row[6] is not None else False,
                    'summary': row[7],
                    'sentiment': row[8],
                    'keywords': []  # Simplified for now
                }
                
                # Handle keywords safely
                if row[9]:
                    try:
                        note['keywords'] = json.loads(row[9]) if isinstance(row[9], str) else []
                    except (json.JSONDecodeError, TypeError):
                        note['keywords'] = []
                
                notes.append(note)
                
            except Exception as row_error:
                print(f"❌ Error processing row {row[0]}: {row_error}")
                continue
        
        print(f"✅ Successfully processed {len(notes)} notes")
        print(f"📋 Note IDs: {[note['id'] for note in notes]}")
        
        return jsonify({
            'status': 'success',
            'notes': notes,
            'count': len(notes),
            'total_in_db': total_count
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching notes: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# backend/routes/api.py - Fix create note to save AI analysis
@notes_bp.route('/notes', methods=['POST'])
def create_note():
    """Create note with AI analysis"""
    try:
        data = request.get_json()
        
        if not data or 'title' not in data or 'content' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Title and content are required'
            }), 400

        print(f"📝 Creating note: {data['title']}")

        # ✅ Extract AI analysis from request
        ai_analysis_str = data.get('ai_analysis')
        summary = None
        sentiment = None
        keywords_json = None
        
        if ai_analysis_str:
            try:
                ai_analysis = json.loads(ai_analysis_str)
                print(f"🤖 AI Analysis received: {ai_analysis}")
                
                # Handle nested analysis structure
                analysis_data = ai_analysis.get('analysis', ai_analysis)
                
                summary = analysis_data.get('summary')
                sentiment = analysis_data.get('sentiment')
                keywords = analysis_data.get('keywords', [])


                keywords_json = json.dumps(keywords) if keywords else None
                print(f"📊 Processed AI data: sentiment={sentiment}, keywords_count={len(keywords) if keywords else 0}")
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"⚠️ Failed to parse AI analysis: {e}")

        # ✅ Create note with AI data in database
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        cursor.execute('''

            INSERT INTO notes (
                title, content, category, 
                ai_processed, summary, sentiment, keywords,
                created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ''', (
            data['title'], 
            data['content'], 
            data.get('category'),
            bool(ai_analysis_str),  # Mark as AI processed if we have analysis
            summary,
            sentiment,
            keywords_json
        ))
        
        note_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        print(f"✅ Note {note_id} created with AI analysis!")

        # ✅ Return note with AI data
        return jsonify({
            'status': 'success',
            'message': 'Note created successfully',
            'note': {
                'id': note_id,
                'title': data['title'],
                'content': data['content'],
                'category': data.get('category'),
                'ai_processed': bool(ai_analysis_str),
                'summary': summary,
                'sentiment': sentiment,
                'keywords': json.loads(keywords_json) if keywords_json else [],
                'created_at': 'just now',
                'updated_at': 'just now'
            }
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating note: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# backend/routes/api.py - Fix get single note to include AI data
@notes_bp.route('/notes/<int:note_id>', methods=['GET'])
def get_note(note_id):
    """Get a specific note by ID with AI analysis"""
    try:
        print(f"📋 Fetching note {note_id}...")
        
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note exists
        cursor.execute('SELECT COUNT(*) FROM notes WHERE id = ?', (note_id,))
        exists = cursor.fetchone()[0]
        
        if not exists:
            cursor.execute('SELECT id FROM notes ORDER BY id')
            available_ids = [row[0] for row in cursor.fetchall()]
            print(f"❌ Note {note_id} not found in database")
            print(f"📋 Available notes: {available_ids}")
            conn.close()
            return jsonify({
                'status': 'error',
                'message': 'Note not found'
            }), 404
        
        # ✅ Get the note with ALL details including AI analysis
        cursor.execute('''
            SELECT id, title, content, category, created_at, updated_at,
                   COALESCE(ai_processed, 0) as ai_processed, 
                   summary, sentiment, keywords, image_text, audio_text
            FROM notes 
            WHERE id = ?
        ''', (note_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            print(f"❌ Note {note_id} query returned no results")
            return jsonify({
                'status': 'error',
                'message': 'Note not found'
            }), 404
        
        # ✅ Build note object with AI data
        note = {
            'id': row[0],
            'title': row[1] or 'Untitled',
            'content': row[2] or '',
            'category': row[3] or '',
            'created_at': row[4],
            'updated_at': row[5],
            'ai_processed': bool(row[6]) if row[6] is not None else False,
            'summary': row[7],
            'sentiment': row[8],
            'keywords': [],
            'image_text': row[10],
            'audio_text': row[11]
        }
        
        # ✅ Handle keywords safely
        if row[9]:
            try:
                note['keywords'] = json.loads(row[9]) if isinstance(row[9], str) else []
            except (json.JSONDecodeError, TypeError):
                note['keywords'] = []
        
        print(f"✅ Retrieved note {note_id}: '{note['title']}' (AI: {note['ai_processed']})")
        
        return jsonify({
            'status': 'success',
            'note': note
        }), 200
        
    except Exception as e:
        print(f"❌ Error fetching note {note_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


# backend/routes/api.py - Fix update note to handle AI analysis
@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    """Update note with AI analysis"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400

        print(f"📝 Updating note {note_id}: {data.get('title', 'No title')}")

        # ✅ Extract AI analysis from request
        ai_analysis_str = data.get('ai_analysis')
        summary = None
        sentiment = None
        keywords_json = None
        ai_processed = False
        
        if ai_analysis_str:
            try:
                ai_analysis = json.loads(ai_analysis_str)
                print(f"🤖 AI Analysis received for update: {ai_analysis}")
                
                # Handle nested analysis structure
                analysis_data = ai_analysis.get('analysis', ai_analysis)
                
                summary = analysis_data.get('summary')
                sentiment = analysis_data.get('sentiment')
                keywords = analysis_data.get('keywords', [])
                keywords_json = json.dumps(keywords) if keywords else None
                ai_processed = True
                
                print(f"📊 Processed AI data for update: sentiment={sentiment}, keywords_count={len(keywords) if keywords else 0}")
            except (json.JSONDecodeError, AttributeError) as e:
                print(f"⚠️ Failed to parse AI analysis during update: {e}")

        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note exists
        cursor.execute('SELECT id FROM notes WHERE id = ?', (note_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({
                'status': 'error',
                'message': 'Note not found'
            }), 404
        
        # ✅ Update note with AI data
        cursor.execute('''
            UPDATE notes 
            SET title = ?, content = ?, category = ?, 
                ai_processed = ?, summary = ?, sentiment = ?, keywords = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            data.get('title', ''),
            data.get('content', ''),
            data.get('category', ''),
            ai_processed,
            summary,
            sentiment,
            keywords_json,
            note_id
        ))
        
        conn.commit()
        
        # ✅ Return updated note with AI data
        cursor.execute('''
            SELECT id, title, content, category, created_at, updated_at,
                   COALESCE(ai_processed, 0) as ai_processed, 
                   summary, sentiment, keywords
            FROM notes 
            WHERE id = ?
        ''', (note_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            updated_note = {
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'category': row[3],
                'created_at': row[4],
                'updated_at': row[5],
                'ai_processed': bool(row[6]),
                'summary': row[7],
                'sentiment': row[8],
                'keywords': json.loads(row[9]) if row[9] else []
            }
            
            print(f"✅ Note {note_id} updated with AI analysis!")
            
            return jsonify({
                'status': 'success',
                'message': 'Note updated successfully',
                'note': updated_note
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to retrieve updated note'
            }), 500
            
    except Exception as e:
        print(f"❌ Error updating note {note_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@notes_bp.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    """Delete a specific note"""
    try:
        print(f"🗑️ Deleting note {note_id}...")
        
        from database import get_db
        conn = get_db()
        cursor = conn.cursor()
        
        # Check if note exists
        cursor.execute('SELECT COUNT(*) FROM notes WHERE id = ?', (note_id,))
        exists = cursor.fetchone()[0]
        
        if not exists:
            conn.close()
            return jsonify({
                'status': 'error',
                'message': 'Note not found'
            }), 404
        
        # Delete the note
        cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        conn.commit()
        conn.close()
        
        print(f"✅ Note {note_id} deleted successfully")
        
        return jsonify({
            'status': 'success',
            'message': 'Note deleted successfully'
        }), 200
        
    except Exception as e:
        print(f"❌ Error deleting note {note_id}: {e}")
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



