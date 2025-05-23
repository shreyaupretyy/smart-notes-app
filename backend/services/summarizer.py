import logging
import re

logger = logging.getLogger(__name__)

def summarize_text(text):
    """
    Summarize the provided text
    
    In a production app, this would use a proper NLP model or API,
    but for demo purposes we'll implement a simple extractive summarization
    """
    logger.info("Summarizing text")
    
    # Clean the text
    text = re.sub(r'\s+', ' ', text).strip()
    
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    if len(sentences) <= 3:
        return text  # Text is already short, return as is
        
    # For a simple demo, just take the first sentence and the last two sentences
    summary_sentences = [sentences[0]] + sentences[-2:]
    summary = ' '.join(summary_sentences)
    
    logger.info(f"Summarization complete: {len(text)} chars → {len(summary)} chars")
    
    return summary