from flask import jsonify
import pytesseract
from PIL import Image

def image_to_text(image_path):
    """
    Convert an image to text using OCR.
    
    Args:
        image_path (str): The path to the image file.

    Returns:
        str: The extracted text from the image.
    """
    try:
        # Open the image file
        img = Image.open(image_path)
        # Use pytesseract to do OCR on the image
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        return jsonify({"error": str(e)}), 500