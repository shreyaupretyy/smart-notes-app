import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # Database Configuration
    # Priority: DATABASE_URL > Individual DB components > SQLite fallback
    
    if os.getenv('DATABASE_URL'):
        # Use full database URL (for production/PostgreSQL)
        SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    elif all([os.getenv('DB_HOST'), os.getenv('DB_NAME'), os.getenv('DB_USER'), os.getenv('DB_PASSWORD')]):
        # Use individual components (for PostgreSQL/MySQL)
        DB_HOST = os.getenv('DB_HOST', 'localhost')
        DB_PORT = os.getenv('DB_PORT', '5432')
        DB_NAME = os.getenv('DB_NAME')
        DB_USER = os.getenv('DB_USER')
        DB_PASSWORD = os.getenv('DB_PASSWORD')
        SQLALCHEMY_DATABASE_URI = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    else:
        # Fallback to SQLite for development
        SQLALCHEMY_DATABASE_URI = 'sqlite:///smart_notes.db'
    
    # SQLAlchemy settings
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = os.getenv('SQLALCHEMY_ECHO', 'False').lower() == 'true'
    
    # Flask settings
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # File upload settings
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # AI service settings
    HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY', '')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    
    @staticmethod
    def get_db_info():
        """Get database connection info for debugging"""
        return {
            'database_uri': Config.SQLALCHEMY_DATABASE_URI,
            'using_env_file': os.path.exists('.env'),
            'db_type': 'sqlite' if 'sqlite' in Config.SQLALCHEMY_DATABASE_URI else 'postgresql',
            'upload_folder': Config.UPLOAD_FOLDER
        }