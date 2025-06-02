# backend/debug_db.py - Create this file to check your database
import sqlite3
import json
from database import get_db

def debug_database():
    """Debug what's in the database"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        print("🔍 DATABASE DEBUGGING")
        print("=" * 50)
        
        # Check table structure
        cursor.execute("PRAGMA table_info(notes)")
        columns = cursor.fetchall()
        print(f"📋 Table structure:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
        # Count total notes
        cursor.execute('SELECT COUNT(*) FROM notes')
        total = cursor.fetchone()[0]
        print(f"\n📊 Total notes: {total}")
        
        # Get all notes
        cursor.execute('SELECT * FROM notes ORDER BY id')
        rows = cursor.fetchall()
        
        print(f"\n📋 All notes:")
        for row in rows:
            print(f"  ID: {row[0]}, Title: '{row[1]}', Created: {row[4] if len(row) > 4 else 'N/A'}")
        
        # Check for any null or problematic data
        cursor.execute('SELECT id, title FROM notes WHERE title IS NULL OR title = ""')
        null_titles = cursor.fetchall()
        if null_titles:
            print(f"\n⚠️ Notes with null/empty titles: {null_titles}")
        
        cursor.execute('SELECT id, content FROM notes WHERE content IS NULL OR content = ""')
        null_content = cursor.fetchall()
        if null_content:
            print(f"\n⚠️ Notes with null/empty content: {[row[0] for row in null_content]}")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Database debug error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_database()