# Smart Notes App Backend

This is the backend for the Smart Notes App, built using Flask. The backend provides various functionalities including note management and AI/NLP features.

## Project Structure

- `app.py`: Main entry point for the Flask application.
- `requirements.txt`: Lists the required Python packages.
- `config.py`: Configuration settings for the application.
- `models/note.py`: Data model for notes.
- `routes/api.py`: API routes for handling requests.
- `services/`: Contains various services for AI and NLP functionalities.
  - `summarizer.py`: Summarization functionality.
  - `image_to_text.py`: Converts images to text.
  - `speech_to_text.py`: Converts speech to text.
  - `nlp_processor.py`: Various NLP processing functions.

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the backend directory:
   ```
   cd smart-notes-app/backend
   ```

3. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python app.py
   ```

## API Usage

- The API endpoints will be documented in the `routes/api.py` file.
- Ensure to check the configurations in `config.py` for any necessary API keys or settings.

## Contributing

Feel free to submit issues or pull requests for improvements and new features.