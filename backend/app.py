from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from api.routes import register_api_routes
from api.ai_routes import register_ai_routes

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Register routes
register_api_routes(app)
register_ai_routes(app)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify the API is running"""
    logger.info("Health check endpoint accessed")
    return jsonify({"status": "healthy", "message": "Flask backend is running"}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)