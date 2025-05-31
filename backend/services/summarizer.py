from transformers import pipeline

def summarize_text(text):
    summarizer = pipeline("summarization")
    summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
    return summary[0]['summary_text'] if summary else None

# Example usage
if __name__ == "__main__":
    sample_text = "Your long text goes here."
    print(summarize_text(sample_text))