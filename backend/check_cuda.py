import sys
import subprocess
import torch

def check_system_info():
    """Check system information"""
    print("🖥️ System Information")
    print("=" * 50)
    print(f"Python Version: {sys.version}")
    print(f"Platform: {sys.platform}")
    
def check_nvidia_driver():
    """Check NVIDIA driver installation"""
    print("\n🎮 NVIDIA Driver Check")
    print("=" * 50)
    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ NVIDIA Driver installed")
            print("Driver output:")
            print(result.stdout)
        else:
            print("❌ NVIDIA Driver not found or not working")
            print(f"Error: {result.stderr}")
    except FileNotFoundError:
        print("❌ nvidia-smi command not found")
        print("This usually means NVIDIA drivers are not installed")
    except Exception as e:
        print(f"❌ Error checking NVIDIA driver: {e}")

def check_cuda_installation():
    """Check CUDA installation"""
    print("\n🔧 CUDA Installation Check")
    print("=" * 50)
    try:
        result = subprocess.run(['nvcc', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ CUDA Toolkit installed")
            print("CUDA version:")
            print(result.stdout)
        else:
            print("❌ CUDA Toolkit not found")
    except FileNotFoundError:
        print("❌ nvcc command not found")
        print("CUDA Toolkit might not be installed")
    except Exception as e:
        print(f"❌ Error checking CUDA: {e}")

def check_pytorch_cuda():
    """Check PyTorch CUDA support"""
    print("\n🔥 PyTorch CUDA Check")
    print("=" * 50)
    
    print(f"PyTorch Version: {torch.__version__}")
    print(f"CUDA Available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"CUDA Version (PyTorch): {torch.version.cuda}")
        print(f"cuDNN Version: {torch.backends.cudnn.version()}")
        print(f"GPU Count: {torch.cuda.device_count()}")
        
        for i in range(torch.cuda.device_count()):
            print(f"\nGPU {i}:")
            print(f"  Name: {torch.cuda.get_device_name(i)}")
            props = torch.cuda.get_device_properties(i)
            print(f"  Memory: {props.total_memory / 1024**3:.1f} GB")
            print(f"  Compute Capability: {props.major}.{props.minor}")
            
        # Test CUDA operations
        try:
            print("\n🧪 Testing CUDA Operations:")
            device = torch.device('cuda:0')
            x = torch.randn(1000, 1000).to(device)
            y = torch.randn(1000, 1000).to(device)
            z = torch.matmul(x, y)
            print("✅ CUDA tensor operations working")
            print(f"✅ GPU Memory allocated: {torch.cuda.memory_allocated(0) / 1024**2:.1f} MB")
            torch.cuda.empty_cache()
        except Exception as e:
            print(f"❌ CUDA operations failed: {e}")
    else:
        print("❌ CUDA not available in PyTorch")
        print("\nPossible reasons:")
        print("1. NVIDIA GPU not present")
        print("2. NVIDIA drivers not installed")
        print("3. PyTorch CPU-only version installed")
        print("4. CUDA version mismatch")

def check_transformers_cuda():
    """Check Transformers library CUDA support"""
    print("\n🤖 Transformers CUDA Check")
    print("=" * 50)
    
    try:
        from transformers import pipeline
        
        if torch.cuda.is_available():
            print("Testing CUDA pipeline creation...")
            # Test with a small model
            classifier = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=0
            )
            result = classifier("This is a test")
            print("✅ Transformers CUDA pipeline working")
            print(f"Test result: {result}")
        else:
            print("❌ CUDA not available for Transformers")
            
    except Exception as e:
        print(f"❌ Transformers CUDA test failed: {e}")

def check_installed_packages():
    """Check installed Python packages"""
    print("\n📦 Package Versions")
    print("=" * 50)
    
    packages = ['torch', 'torchvision', 'torchaudio', 'transformers', 'accelerate']
    
    for package in packages:
        try:
            module = __import__(package)
            version = getattr(module, '__version__', 'Unknown')
            print(f"{package}: {version}")
        except ImportError:
            print(f"{package}: Not installed")

def provide_installation_instructions():
    """Provide CUDA installation instructions"""
    print("\n📋 CUDA Installation Instructions")
    print("=" * 50)
    
    if not torch.cuda.is_available():
        print("To enable CUDA support:")
        print("\n1. Install NVIDIA GPU drivers:")
        print("   https://www.nvidia.com/Download/index.aspx")
        
        print("\n2. Install CUDA Toolkit (if needed):")
        print("   https://developer.nvidia.com/cuda-toolkit")
        
        print("\n3. Install PyTorch with CUDA:")
        print("   pip uninstall torch torchvision torchaudio")
        print("   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        
        print("\n4. Verify installation:")
        print("   python -c \"import torch; print(torch.cuda.is_available())\"")
        
        print("\n5. If still not working, check:")
        print("   - GPU compatibility: https://developer.nvidia.com/cuda-gpus")
        print("   - CUDA version compatibility with PyTorch")
        print("   - Environment variables (PATH, CUDA_HOME)")

def main():
    """Main function to run all checks"""
    print("🔍 CUDA Availability Diagnostic Tool")
    print("=" * 60)
    
    check_system_info()
    check_nvidia_driver()
    check_cuda_installation()
    check_pytorch_cuda()
    check_transformers_cuda()
    check_installed_packages()
    provide_installation_instructions()
    
    print("\n" + "=" * 60)
    print("🎯 Summary:")
    if torch.cuda.is_available():
        print("✅ CUDA is available and working!")
    else:
        print("❌ CUDA is not available. Follow the installation instructions above.")

if __name__ == "__main__":
    main()