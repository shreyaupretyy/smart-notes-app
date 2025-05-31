from flask import jsonify
from transformers import BlipProcessor, BlipForConditionalGeneration, pipeline
import torch
from PIL import Image
import io
import base64
import cv2
import numpy as np
import pytesseract
import os

class ImageToText:
    def __init__(self):
        self.device = self._get_device()
        
        # CUDA-enabled models
        self.blip_model_name = "Salesforce/blip-image-captioning-large"
        self.blip_processor = None
        self.blip_model = None
        
        # OCR alternative
        self.ocr_available = self._check_tesseract()
        
        # Document analysis model
        self.doc_model_name = "microsoft/trocr-large-printed"
        self.doc_processor = None
        self.doc_model = None
        
        self._initialize_models()
    
    def _get_device(self):
        """Get the best available device"""
        if torch.cuda.is_available():
            device = torch.device('cuda:0')
            print(f"🎮 Image-to-Text using CUDA: {torch.cuda.get_device_name(0)}")
            return device
        else:
            print("🎮 Image-to-Text using CPU")
            return torch.device('cpu')
    
    def _check_tesseract(self):
        """Check if Tesseract OCR is available"""
        try:
            pytesseract.get_tesseract_version()
            print("✅ Tesseract OCR available")
            return True
        except Exception as e:
            print(f"⚠️ Tesseract OCR not available: {e}")
            return False
    
    def _initialize_models(self):
        """Initialize CUDA-accelerated image captioning models"""
        try:
            print("🔄 Loading image-to-text models with CUDA support...")
            
            # Initialize BLIP for image captioning
            if self.device.type == 'cuda':
                print(f"🖼️ Loading BLIP model: {self.blip_model_name}")
                try:
                    self.blip_processor = BlipProcessor.from_pretrained(self.blip_model_name)
                    self.blip_model = BlipForConditionalGeneration.from_pretrained(
                        self.blip_model_name,
                        torch_dtype=torch.float16,
                        low_cpu_mem_usage=False
                    ).to(self.device)
                    print("✅ CUDA BLIP model loaded successfully")
                    
                except Exception as cuda_error:
                    print(f"⚠️ CUDA BLIP loading failed: {cuda_error}")
                    print("🔄 Trying CPU fallback...")
                    self._initialize_cpu_models()
            else:
                self._initialize_cpu_models()
            
            # Initialize TrOCR for document text recognition
            try:
                print(f"📄 Loading TrOCR model: {self.doc_model_name}")
                if self.device.type == 'cuda':
                    self.doc_processor = pipeline(
                        "image-to-text",
                        model=self.doc_model_name,
                        device=0,
                        torch_dtype=torch.float16
                    )
                else:
                    self.doc_processor = pipeline(
                        "image-to-text",
                        model=self.doc_model_name,
                        device=-1
                    )
                print("✅ TrOCR model loaded successfully")
                
            except Exception as trocr_error:
                print(f"⚠️ TrOCR loading failed: {trocr_error}")
                self.doc_processor = None
            
            # Show GPU memory usage
            if self.device.type == 'cuda':
                print(f"🎮 GPU Memory allocated: {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB")
                
        except Exception as e:
            print(f"❌ Error loading image-to-text models: {e}")
            self.blip_model = None
            self.blip_processor = None
            self.doc_processor = None
    
    def _initialize_cpu_models(self):
        """Initialize CPU-only models as fallback"""
        try:
            print("🔄 Loading CPU image-to-text models...")
            self.blip_processor = BlipProcessor.from_pretrained(self.blip_model_name)
            self.blip_model = BlipForConditionalGeneration.from_pretrained(self.blip_model_name)
            print("✅ CPU BLIP model loaded successfully")
        except Exception as e:
            print(f"❌ CPU model loading failed: {e}")
            self.blip_model = None
            self.blip_processor = None
    
    def process_image(self, image_data, mode='auto'):
        """
        Process image and extract text
        Modes: 'auto', 'caption', 'ocr', 'document'
        """
        try:
            # Convert image data to PIL Image
            image = self._prepare_image(image_data)
            if image is None:
                return {"error": "Invalid image data"}
            
            print(f"🖼️ Processing image ({image.size}) with mode: {mode}")
            
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
                memory_before = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory before: {memory_before:.2f} GB")
            
            results = {}
            
            if mode in ['auto', 'caption']:
                # Image captioning
                caption = self._generate_caption(image)
                results['caption'] = caption
            
            if mode in ['auto', 'ocr']:
                # OCR text extraction
                ocr_text = self._extract_ocr_text(image)
                results['ocr_text'] = ocr_text
            
            if mode in ['auto', 'document']:
                # Document text recognition
                doc_text = self._extract_document_text(image)
                results['document_text'] = doc_text
            
            # Auto-determine best result
            if mode == 'auto':
                results['best_text'] = self._select_best_text(results)
            
            # GPU memory cleanup
            if self.device.type == 'cuda':
                memory_after = torch.cuda.memory_allocated(0) / 1024**3
                print(f"🎮 GPU Memory after: {memory_after:.2f} GB")
                torch.cuda.empty_cache()
            
            print(f"✅ Image processing completed")
            return results
            
        except Exception as e:
            print(f"❌ Image processing error: {e}")
            if self.device.type == 'cuda':
                torch.cuda.empty_cache()
            return {"error": str(e)}
    
    def _prepare_image(self, image_data):
        """Convert various image formats to PIL Image"""
        try:
            if isinstance(image_data, str):
                # Base64 encoded image
                if image_data.startswith('data:image'):
                    # Remove data URL prefix
                    image_data = image_data.split(',')[1]
                
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
            
            elif isinstance(image_data, bytes):
                # Raw bytes
                image = Image.open(io.BytesIO(image_data))
            
            elif hasattr(image_data, 'read'):
                # File-like object
                image = Image.open(image_data)
            
            else:
                return None
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image
            
        except Exception as e:
            print(f"❌ Image preparation error: {e}")
            return None
    
    def _generate_caption(self, image):
        """Generate image caption using BLIP"""
        try:
            if not self.blip_model or not self.blip_processor:
                return "Caption model not available"
            
            print("🖼️ Generating image caption...")
            
            # Process image
            inputs = self.blip_processor(image, return_tensors="pt")
            
            if self.device.type == 'cuda':
                inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate caption
            with torch.no_grad():
                out = self.blip_model.generate(
                    **inputs,
                    max_length=100,
                    num_beams=5,
                    early_stopping=True
                )
            
            caption = self.blip_processor.decode(out[0], skip_special_tokens=True)
            print(f"✅ Caption generated: {caption}")
            return caption
            
        except Exception as e:
            print(f"❌ Caption generation error: {e}")
            return f"Caption error: {str(e)}"
    
    def _extract_ocr_text(self, image):
        """Extract text using OCR (Tesseract)"""
        try:
            if not self.ocr_available:
                return "OCR not available"
            
            print("📝 Extracting text with OCR...")
            
            # Convert PIL to OpenCV format for preprocessing
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Preprocess image for better OCR
            gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
            
            # Apply threshold to get better text
            _, threshold = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Extract text
            text = pytesseract.image_to_string(threshold, config='--psm 6')
            
            # Clean up text
            text = text.strip()
            if text:
                print(f"✅ OCR text extracted: {len(text)} characters")
                return text
            else:
                return "No text detected"
                
        except Exception as e:
            print(f"❌ OCR error: {e}")
            return f"OCR error: {str(e)}"
    
    def _extract_document_text(self, image):
        """Extract text using TrOCR for documents"""
        try:
            if not self.doc_processor:
                return "Document processor not available"
            
            print("📄 Extracting document text with TrOCR...")
            
            # Process with TrOCR
            result = self.doc_processor(image)
            
            if isinstance(result, list) and len(result) > 0:
                text = result[0].get('generated_text', '')
            else:
                text = str(result)
            
            if text:
                print(f"✅ Document text extracted: {len(text)} characters")
                return text
            else:
                return "No document text detected"
                
        except Exception as e:
            print(f"❌ Document text extraction error: {e}")
            return f"Document extraction error: {str(e)}"
    
    def _select_best_text(self, results):
        """Select the best text extraction result"""
        # Priority: document_text > ocr_text > caption
        
        doc_text = results.get('document_text', '')
        ocr_text = results.get('ocr_text', '')
        caption = results.get('caption', '')
        
        # Check for substantial text content
        if doc_text and len(doc_text) > 10 and 'error' not in doc_text.lower():
            return doc_text
        
        if ocr_text and len(ocr_text) > 5 and 'error' not in ocr_text.lower():
            return ocr_text
        
        if caption and 'error' not in caption.lower():
            return caption
        
        return "No text could be extracted from the image"
    
    def get_model_info(self):
        """Get information about loaded models"""
        info = {
            'device': str(self.device),
            'blip_model_loaded': self.blip_model is not None,
            'doc_processor_loaded': self.doc_processor is not None,
            'ocr_available': self.ocr_available,
            'models': {
                'blip': self.blip_model_name,
                'document': self.doc_model_name
            }
        }
        
        if self.device.type == 'cuda' and torch.cuda.is_available():
            info.update({
                'cuda_available': True,
                'gpu_memory_allocated': f"{torch.cuda.memory_allocated(0) / 1024**3:.2f} GB"
            })
        else:
            info['cuda_available'] = False
            
        return info
    
    def benchmark_image_processing(self, image_data):
        """Benchmark image processing performance"""
        import time
        
        print("🏁 Starting image processing benchmark...")
        
        # Prepare image
        image = self._prepare_image(image_data)
        if image is None:
            return {"error": "Invalid image for benchmark"}
        
        benchmark_results = {}
        
        # Benchmark caption generation
        if self.blip_model:
            start_time = time.time()
            caption = self._generate_caption(image)
            caption_time = time.time() - start_time
            benchmark_results['caption'] = {
                'time': f"{caption_time:.3f} seconds",
                'result': caption
            }
        
        # Benchmark OCR
        if self.ocr_available:
            start_time = time.time()
            ocr_text = self._extract_ocr_text(image)
            ocr_time = time.time() - start_time
            benchmark_results['ocr'] = {
                'time': f"{ocr_time:.3f} seconds",
                'result': ocr_text[:100] + "..." if len(ocr_text) > 100 else ocr_text
            }
        
        # Benchmark document processing
        if self.doc_processor:
            start_time = time.time()
            doc_text = self._extract_document_text(image)
            doc_time = time.time() - start_time
            benchmark_results['document'] = {
                'time': f"{doc_time:.3f} seconds",
                'result': doc_text[:100] + "..." if len(doc_text) > 100 else doc_text
            }
        
        total_time = sum([float(r['time'].split()[0]) for r in benchmark_results.values()])
        
        return {
            'device_used': str(self.device),
            'image_size': f"{image.size[0]}x{image.size[1]}",
            'total_time': f"{total_time:.3f} seconds",
            'individual_results': benchmark_results
        }