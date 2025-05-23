from flask import jsonify

def create_success_response(data, status_code=200):
    """Create a standardized success response"""
    response = {
        "success": True,
        "data": data
    }
    return jsonify(response), status_code

def create_error_response(message, status_code=500):
    """Create a standardized error response"""
    response = {
        "success": False,
        "error": {
            "message": message
        }
    }
    return jsonify(response), status_code