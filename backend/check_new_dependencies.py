import sys
import subprocess

def check_dependencies():
    print("🔍 Checking New Dependencies")
    print("=" * 40)
    
    # Check Python packages
    packages_to_check = [
        'librosa',
        'soundfile', 
        'pydub',
        'speech_recognition',
        'cv2',
        'pytesseract',
        'PIL',
        'transformers'
    ]
    
    print("📦 Checking Python Packages:")
    for package in packages_to_check:
        try:
            if package == 'cv2':
                import cv2
                print(f"✅ OpenCV: {cv2.__version__}")
            elif package == 'PIL':
                from PIL import Image
                print(f"✅ Pillow (PIL): Available")
            elif package == 'speech_recognition':
                import speech_recognition as sr
                print(f"✅ SpeechRecognition: {sr.__version__}")
            else:
                module = __import__(package)
                version = getattr(module, '__version__', 'Unknown')
                print(f"✅ {package}: {version}")
        except ImportError as e:
            print(f"❌ {package}: Not installed - {e}")
    
    # Check Tesseract OCR
    print("\n🔍 Checking Tesseract OCR:")
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✅ Tesseract: {version}")
        
        # Test OCR functionality
        from PIL import Image
        import numpy as np
        
        # Create a simple test image with text
        test_img = Image.new('RGB', (200, 50), color='white')
        import PIL.ImageDraw as ImageDraw
        import PIL.ImageFont as ImageFont
        
        draw = ImageDraw.Draw(test_img)
        try:
            font = ImageFont.load_default()
            draw.text((10, 15), "Test OCR", fill='black', font=font)
        except:
            draw.text((10, 15), "Test OCR", fill='black')
        
        # Test OCR
        text = pytesseract.image_to_string(test_img)
        if 'test' in text.lower() or 'ocr' in text.lower():
            print("✅ OCR functionality working")
        else:
            print(f"⚠️ OCR test result: '{text.strip()}'")
            
    except Exception as e:
        print(f"❌ Tesseract error: {e}")
        print("💡 Install Tesseract: https://github.com/UB-Mannheim/tesseract/wiki")
    
    # Check audio processing
    print("\n🎵 Checking Audio Processing:")
    try:
        import librosa
        import numpy as np
        
        # Create a simple test audio
        sample_rate = 16000
        duration = 1  # 1 second
        t = np.linspace(0, duration, sample_rate)
        test_audio = np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
        
        # Test librosa functionality
        stft = librosa.stft(test_audio)
        print(f"✅ Audio processing working - STFT shape: {stft.shape}")
        
    except Exception as e:
        print(f"❌ Audio processing error: {e}")
    
    # Check transformers models availability
    print("\n🤖 Checking Model Access:")
    try:
        from transformers import pipeline
        
        # Test small model download (this might take a moment)
        print("🔄 Testing model download (small model)...")
        classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
        result = classifier("This is a test")
        print(f"✅ Model download and inference working: {result}")
        
    except Exception as e:
        print(f"❌ Model access error: {e}")

if __name__ == "__main__":
    check_dependencies()