import requests
import json
import time
import base64
from PIL import Image, ImageDraw
import io

def test_all_ai_services():
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 Testing All AI Services")
    print("=" * 50)
    
    # Test 1: Check dependencies
    print("\n1. Checking Dependencies:")
    try:
        import librosa
        import cv2
        import pytesseract
        from PIL import Image
        import speech_recognition
        print("✅ All dependencies available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return
    
    # Test 2: Server health
    print("\n2. Testing Server Health:")
    try:
        response = requests.get(f"{base_url}/api/health")
        print(f"✅ Health Check: {response.status_code}")
    except Exception as e:
        print(f"❌ Server not running: {e}")
        return
    
    # Test 3: GPU and AI services info
    print("\n3. Checking AI Services Status:")
    try:
        response = requests.get(f"{base_url}/api/ai/gpu-info")
        if response.status_code == 200:
            data = response.json()
            gpu_info = data.get('gpu_info', {})
            services = data.get('ai_services', {})
            
            print(f"CUDA Available: {gpu_info.get('cuda_available')}")
            if gpu_info.get('cuda_available'):
                print(f"GPU: {gpu_info.get('gpu_name')}")
                print(f"Memory: {gpu_info.get('gpu_memory_allocated')}")
            
            for service, info in services.items():
                print(f"{service}: {info.get('status')}")
    except Exception as e:
        print(f"❌ Error checking services: {e}")
    
    # Test 4: Image processing
    print("\n4. Testing Image-to-Text:")
    try:
        # Create a test image
        img = Image.new('RGB', (300, 100), color='white')
        draw = ImageDraw.Draw(img)
        draw.text((10, 30), "This is a test image for OCR", fill='black')
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        response = requests.post(
            f"{base_url}/api/ai/image-to-text",
            headers={'Content-Type': 'application/json'},
            json={
                'image': img_base64,
                'mode': 'auto'
            }
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            result = data.get('result', {})
            print(f"Caption: {result.get('caption', 'N/A')}")
            print(f"OCR: {result.get('ocr_text', 'N/A')}")
            print(f"Best Text: {result.get('best_text', 'N/A')}")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Image processing error: {e}")
    
    # Test 5: Test image endpoint
    print("\n5. Testing Built-in Image Tests:")
    try:
        response = requests.get(f"{base_url}/api/ai/test-image")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            tests = data.get('test_results', [])
            for test in tests:
                test_name = test.get('test')
                result = test.get('result', {})
                print(f"{test_name}: {result.get('best_text', 'N/A')[:50]}...")
    except Exception as e:
        print(f"❌ Built-in image test error: {e}")
    
    # Test 6: Speech processing capabilities
    print("\n6. Testing Speech-to-Text Capabilities:")
    try:
        response = requests.get(f"{base_url}/api/ai/test-speech")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            model_info = data.get('model_info', {})
            print(f"Whisper Available: {model_info.get('whisper_pipeline_loaded')}")
            print(f"Device: {model_info.get('device')}")
            print(f"Supported Formats: {data.get('supported_formats')}")
    except Exception as e:
        print(f"❌ Speech test error: {e}")
    
    # Test 7: Benchmark image processing
    print("\n7. Benchmarking Image Processing:")
    try:
        response = requests.post(
            f"{base_url}/api/ai/benchmark-image",
            headers={'Content-Type': 'application/json'},
            json={}  # Will use default test image
        )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            benchmark = data.get('benchmark', {})
            print(f"Device: {benchmark.get('device_used')}")
            print(f"Total Time: {benchmark.get('total_time')}")
            print(f"Image Size: {benchmark.get('image_size')}")
    except Exception as e:
        print(f"❌ Benchmark error: {e}")
    
    # Test 8: Existing services (summarization and NLP)
    print("\n8. Testing Existing Services:")
    test_text = "Artificial intelligence is revolutionizing technology with machine learning and deep learning algorithms that can process vast amounts of data."
    
    # Test summarization
    try:
        response = requests.post(
            f"{base_url}/api/ai/summarize",
            headers={'Content-Type': 'application/json'},
            json={'text': test_text}
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Summarization: {data.get('summary', '')[:50]}...")
        else:
            print(f"❌ Summarization failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Summarization error: {e}")
    
    # Test NLP
    try:
        response = requests.post(
            f"{base_url}/api/ai/analyze",
            headers={'Content-Type': 'application/json'},
            json={'text': test_text}
        )
        if response.status_code == 200:
            data = response.json()
            analysis = data.get('analysis', {})
            print(f"✅ NLP - Keywords: {analysis.get('keywords', [])[:3]}")
            print(f"✅ NLP - Sentiment: {analysis.get('sentiment')}")
        else:
            print(f"❌ NLP failed: {response.status_code}")
    except Exception as e:
        print(f"❌ NLP error: {e}")

if __name__ == "__main__":
    test_all_ai_services()