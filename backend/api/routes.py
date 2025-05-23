from flask import Blueprint, request, jsonify
import logging

logger = logging.getLogger(__name__)

def register_api_routes(app):
    """Register API routes with the Flask app"""
    
    @app.route('/api/echo', methods=['POST'])
    def echo():
        """Echo endpoint for testing"""
        data = request.get_json()
        logger.info(f"Echo endpoint received: {data}")
        return jsonify({"echo": data}), 200