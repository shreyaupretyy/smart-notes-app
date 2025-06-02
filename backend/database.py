from flask_sqlalchemy import SQLAlchemy
import sqlite3
from contextlib import contextmanager


# Initialize database instance
db = SQLAlchemy()
def get_db():
    """Get raw SQLite connection for legacy code"""
    # Use the same database file that SQLAlchemy uses
    conn = sqlite3.connect('smart_notes.db')
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()