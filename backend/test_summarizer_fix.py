import torch
from services.summarizer import Summarizer

def test_summarizer_directly():
    print("🧪 Testing Summarizer Directly")
    print("=" * 40)
    
    print(f"CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    print("\n🔄 Initializing Summarizer...")
    summarizer = Summarizer()
    
    print(f"\n📊 Model Info:")
    info = summarizer.get_model_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    if summarizer.summarizer:
        print("\n🧪 Testing summarization...")
        test_text = """
        Artificial intelligence has become a transformative force in modern technology. 
        Machine learning algorithms are now capable of processing vast amounts of data 
        and making intelligent decisions. These systems are being deployed across various 
        industries including healthcare, finance, and transportation. The rapid advancement 
        in AI capabilities has opened up new possibilities for automation and optimization.
        """
        
        try:
            summary = summarizer.summarize(test_text.strip())
            print(f"✅ Summarization successful!")
            print(f"Original: {len(test_text.strip())} chars")
            print(f"Summary: {len(summary)} chars")
            print(f"Result: {summary}")
        except Exception as e:
            print(f"❌ Summarization failed: {e}")
    else:
        print("❌ Summarizer not loaded")

if __name__ == "__main__":
    test_summarizer_directly()