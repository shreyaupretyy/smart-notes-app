from flask import Blueprint, request, jsonify
from services.summarizer import summarize_text
from services.image_to_text import convert_image_to_text
from services.speech_to_text import convert_speech_to_text

api = Blueprint('api', __name__)

@api.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    text = data.get('text')
    summary = summarize_text(text)
    return jsonify({'summary': summary})

@api.route('/image-to-text', methods=['POST'])
def image_to_text():
    image_file = request.files['image']
    text = convert_image_to_text(image_file)
    return jsonify({'text': text})

@api.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    audio_file = request.files['audio']
    text = convert_speech_to_text(audio_file)
    return jsonify({'text': text})