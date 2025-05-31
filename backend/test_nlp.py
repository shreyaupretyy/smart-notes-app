import requests
import json

def test_nlp_processor():
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 Testing NLP Processor")
    print("=" * 50)
    
    # Test 1: Basic NLP test endpoint
    print("\n1. Testing NLP Test Endpoint:")
    try:
        response = requests.get(f"{base_url}/api/ai/test-nlp")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Model Info: {data.get('model_info')}")
            
            for i, result in enumerate(data.get('test_results', [])):
                print(f"\nTest {i+1}:")
                print(f"  Text: {result.get('text', '')[:50]}...")
                print(f"  Keywords: {result.get('keywords', [])}")
                print(f"  Sentiment: {result.get('sentiment', 'unknown')}")
                print(f"  Word Count: {result.get('statistics', {}).get('word_count', 'N/A')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Individual analyze endpoint
    print("\n2. Testing Individual Analyze Endpoint:")
    test_text = "I'm really excited about this new AI technology! It's working amazingly well and I love the results."
    
    try:
        response = requests.post(
            f"{base_url}/api/ai/analyze",
            headers={'Content-Type': 'application/json'},
            json={'text': test_text}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            analysis = data.get('analysis', {})
            print(f"Keywords: {analysis.get('keywords', [])}")
            print(f"Sentiment: {analysis.get('sentiment', 'unknown')}")
            print(f"Statistics: {analysis.get('statistics', {})}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Benchmark NLP
    print("\n3. Testing NLP Benchmark:")
    try:
        response = requests.post(
            f"{base_url}/api/ai/benchmark-nlp",
            headers={'Content-Type': 'application/json'},
            json={'text': test_text}
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            benchmark = data.get('benchmark', {})
            print(f"Total Time: {benchmark.get('total_time')}")
            print(f"Device Used: {benchmark.get('device_used')}")
            print(f"Keywords Time: {benchmark.get('keyword_extraction_time')}")
            print(f"Sentiment Time: {benchmark.get('sentiment_analysis_time')}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_nlp_processor()