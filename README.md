# 🤖 Smart Notes App

> An intelligent note-taking application powered by AI, built with React Native and Flask

[![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
[![Flask](https://img.shields.io/badge/Flask-2.3.0-green.svg)](https://flask.palletsprojects.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-purple.svg)](https://github.com/shreyaupretyy/smart-notes-app)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A beautiful and intelligent note-taking application that combines the power of AI with an intuitive user interface. Create, organize, and analyze your notes with advanced AI features including sentiment analysis, keyword extraction, OCR, and voice-to-text conversion.

## 📱 Screenshots

<div align="center">
  <img src="screenshots/Screenshot 1.png" width="200" alt="Notes List" />
  <img src="screenshots/Screenshot 2.png" width="200" alt="Note Detail" />
  <img src="screenshots/Screenshot 3.png" width="200" alt="Create Note" />
</div>

*Beautiful, modern interface with AI-powered insights*

## ✨ Features

### 📝 **Smart Note Management**
- Create, edit, and delete notes with rich text support
- Organize notes with categories and tags
- Advanced search functionality with filters
- Beautiful, responsive Material Design UI

### 🤖 **AI-Powered Analysis**
- **Sentiment Analysis** - Understand the emotional tone of your notes
- **Keyword Extraction** - Automatically identify key topics and themes
- **Text Summarization** - Generate concise summaries of longer notes
- **Real-time AI Preview** - See AI insights as you type

### 🖼️ **Image Processing**
- **OCR (Optical Character Recognition)** - Extract text from images
- **Image Analysis** - AI analysis of extracted text
- Support for multiple image formats

### 🎤 **Voice Integration**
- **Voice-to-Text** - Convert speech to written notes
- **Audio Analysis** - AI insights from voice recordings
- High-quality speech recognition

### 🔍 **Advanced Search & Organization**
- Smart search across all note content
- Filter by categories, dates, and AI insights
- Quick access to recently created notes

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- React Native development environment
- Android Studio / Xcode (for mobile testing)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/shreyaupretyy/smart-notes-app.git
   cd smart-notes-app
   ```

2. **Set up the backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Initialize the database**
   ```bash
   python database.py
   ```

4. **Start the Flask server**
   ```bash
   python app.py
   ```
   
   Server will be running at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the React Native app**
   ```bash
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   
   # For development server
   npm start
   ```

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **React Navigation** - Navigation and routing
- **React Query** - Data fetching and state management
- **React Native Paper** - Material Design components
- **React Native Vector Icons** - Beautiful icons

### Backend
- **Flask** - Python web framework
- **SQLite** - Lightweight database
- **OpenAI API** - AI text analysis
- **Tesseract OCR** - Image text extraction
- **Speech Recognition** - Voice-to-text conversion

### AI Services
- Text analysis and sentiment detection
- Keyword extraction and summarization
- OCR for image processing
- Speech recognition for voice notes

## 📁 Project Structure

```
smart-notes-app/
├── frontend/                 # React Native app
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── screens/         # App screens
│   │   ├── services/        # API services
│   │   ├── navigation/      # Navigation setup
│   │   └── hooks/          # Custom React hooks
│   ├── android/            # Android-specific files
│   ├── ios/               # iOS-specific files
│   └── package.json       # Dependencies
├── backend/               # Flask API server
│   ├── routes/           # API routes
│   ├── models/           # Database models
│   ├── services/         # AI processing services
│   ├── database.py       # Database setup
│   ├── app.py           # Main Flask app
│   └── requirements.txt  # Python dependencies
├── screenshots/          # App screenshots
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# AI Service Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database
DATABASE_URL=sqlite:///notes.db

# Server
FLASK_ENV=development
FLASK_DEBUG=True
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/notes` | GET | Get all notes |
| `/api/notes` | POST | Create new note |
| `/api/notes/{id}` | GET | Get specific note |
| `/api/notes/{id}` | PUT | Update note |
| `/api/notes/{id}` | DELETE | Delete note |
| `/api/analyze-text` | POST | Analyze text with AI |
| `/api/process-image` | POST | Process image with OCR |
| `/api/process-audio` | POST | Convert audio to text |

## 🎯 Features in Detail

### AI Analysis Dashboard
The AI Features screen provides a testing ground for all AI capabilities:
- **Text Analysis**: Test sentiment analysis, keyword extraction, and summarization
- **Image Processing**: Upload images and extract text with OCR
- **Voice Processing**: Record audio and convert to text with analysis

### Smart Note Creation
- Real-time AI preview as you type
- Automatic sentiment detection
- Keyword suggestions
- Summary generation
- Support for images and voice attachments

### Beautiful UI/UX
- Modern Material Design interface
- Smooth animations and transitions
- Intuitive navigation
- Responsive design for different screen sizes
- Dark and light theme support

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- OpenAI for providing powerful AI capabilities
- React Native community for excellent documentation
- Material Design for beautiful UI components
- All contributors who helped make this project better

## 📧 Contact

**Shreya Uprety** - [@shreyaupretyy](https://github.com/shreyaupretyy)

Project Link: [https://github.com/shreyaupretyy/smart-notes-app](https://github.com/shreyaupretyy/smart-notes-app)

---
