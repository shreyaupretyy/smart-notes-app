from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
# Import from our new database module instead of app
from database import db

class Note(db.Model):
    __tablename__ = 'notes'
    
    # Primary fields
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    
    # AI-generated fields
    summary = db.Column(db.Text)
    keywords = db.Column(db.Text)  # JSON string of keywords list
    sentiment = db.Column(db.String(20))  # positive, negative, neutral
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Organization
    category = db.Column(db.String(100))
    tags = db.Column(db.Text)  # JSON string of tags list
    
    # AI processing status
    ai_processed = db.Column(db.Boolean, default=False)
    
    # File attachments (for images/audio)
    has_image = db.Column(db.Boolean, default=False)
    has_audio = db.Column(db.Boolean, default=False)
    image_text = db.Column(db.Text)  # Extracted text from images
    audio_text = db.Column(db.Text)  # Transcribed text from audio
    
    def __init__(self, title, content, category=None):
        self.title = title
        self.content = content
        self.category = category
        
    def set_keywords(self, keywords_list):
        """Store keywords as JSON string"""
        self.keywords = json.dumps(keywords_list) if keywords_list else None
        
    def get_keywords(self):
        """Get keywords as Python list"""
        return json.loads(self.keywords) if self.keywords else []
    
    def set_tags(self, tags_list):
        """Store tags as JSON string"""
        self.tags = json.dumps(tags_list) if tags_list else None
        
    def get_tags(self):
        """Get tags as Python list"""
        return json.loads(self.tags) if self.tags else []
    
    def get_full_text(self):
        """Get all text content including extracted text from media"""
        full_text = self.content
        if self.image_text:
            full_text += f"\n\n[Image Text]: {self.image_text}"
        if self.audio_text:
            full_text += f"\n\n[Audio Text]: {self.audio_text}"
        return full_text
    
    def to_dict(self):
        """Convert note to dictionary for JSON responses"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'keywords': self.get_keywords(),
            'sentiment': self.sentiment,
            'category': self.category,
            'tags': self.get_tags(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'ai_processed': self.ai_processed,
            'has_image': self.has_image,
            'has_audio': self.has_audio,
            'image_text': self.image_text,
            'audio_text': self.audio_text,
            'full_text': self.get_full_text()
        }
    
    def __repr__(self):
        return f'<Note {self.id}: {self.title[:30]}...>'