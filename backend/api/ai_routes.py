from flask import request, jsonify
import logging
import base64
import os
import time
from services.summarizer import summarize_text
from services.image_processor import extract_text_from_image
from services.speech_processor import convert_speech_to_text
from utils.response_utils import create_error_response, create_success_response

logger = logging.getLogger(__name__)

def register_ai_routes(app):
    """Register AI-related routes with the Flask app"""
    
    @app.route('/api/summarize', methods=['POST'])
    def summarize():
        """Endpoint to summarize text using AI"""
        try:
            data = request.get_json()
            text = data.get('text', '')
            
            if not text:
                return create_error_response("No text provided", 400)
            
            # Log the request (truncate long text)
            display_text = text[:100] + "..." if len(text) > 100 else text
            logger.info(f"Summarize request received: {display_text}")
            
            # Process the text
            summary = summarize_text(text)
            
            return create_success_response({"summary": summary})
            
        except Exception as e:
            logger.error(f"Error in summarize endpoint: {str(e)}")
            return create_error_response(str(e))
    
    @app.route('/api/image-to-text', methods=['POST'])
    def image_to_text():
        """Endpoint to extract text from images using OCR"""
        try:
            data = request.get_json()
            image_data = data.get('image', '')
            
            if not image_data:
                return create_error_response("No image provided", 400)
            
            logger.info("Image-to-text request received")
            
            # Process the image
            extracted_text = extract_text_from_image(image_data)
            
            return create_success_response({"text": extracted_text})
            
        except Exception as e:
            logger.error(f"Error in image-to-text endpoint: {str(e)}")
            return create_error_response(str(e))
    
    @app.route('/api/speech-to-text', methods=['POST'])
    def speech_to_text():
        """Endpoint to convert speech to text"""
        try:
            data = request.get_json()
            audio_data = data.get('audio', '')
            
            if not audio_data:
                return create_error_response("No audio provided", 400)
            
            logger.info("Speech-to-text request received")
            
            # Process the audio
            transcribed_text = convert_speech_to_text(audio_data)
            
            return create_success_response({"text": transcribed_text})
            
        except Exception as e:
            logger.error(f"Error in speech-to-text endpoint: {str(e)}")
            return create_error_response(str(e))
    
    @app.route('/api/suggestions', methods=['POST'])
    def get_suggestions():
        """Endpoint to get AI-powered suggestions for note content"""
        try:
            data = request.get_json()
            text = data.get('text', '')
            
            if not text:
                return create_error_response("No text provided", 400)
            
            # Log the request (truncate long text)
            display_text = text[:100] + "..." if len(text) > 100 else text
            logger.info(f"Suggestions request received: {display_text}")
            
            # Simulate AI processing time
            time.sleep(1)
            
            # For demo purposes, generate simple suggestions
            # In a real app, this would use an AI model
            suggestions = [
                "Consider adding more specific details to your note.",
                "You might want to organize this content into clear sections with headings.",
                "Think about adding examples to illustrate your points.",
                "Consider adding references or sources if applicable."
            ]
            
            return create_success_response({"suggestions": suggestions})
            
        except Exception as e:
            logger.error(f"Error in suggestions endpoint: {str(e)}")
            return create_error_response(str(e))