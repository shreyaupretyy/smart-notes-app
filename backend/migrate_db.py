# backend/migrate_db.py - Create this new file
import sqlite3
import os

def migrate_database():
    """Migrate existing database to new schema"""
    if not os.path.exists('smart_notes.db'):
        print("❌ Database file not found")
        return
    
    conn = sqlite3.connect('smart_notes.db')
    cursor = conn.cursor()
    
    # Get existing columns
    cursor.execute("PRAGMA table_info(notes)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    print(f"📊 Existing columns: {existing_columns}")
    
    # Define new columns to add
    new_columns = [
        ('summary', 'TEXT'),
        ('keywords', 'TEXT'),
        ('sentiment', 'VARCHAR(20)'),
        ('tags', 'TEXT'),
        ('ai_processed', 'BOOLEAN DEFAULT 0'),
        ('has_image', 'BOOLEAN DEFAULT 0'),
        ('has_audio', 'BOOLEAN DEFAULT 0'),
        ('image_text', 'TEXT'),
        ('audio_text', 'TEXT'),
    ]
    
    # Add missing columns
    for column_name, column_type in new_columns:
        if column_name not in existing_columns:
            try:
                cursor.execute(f"ALTER TABLE notes ADD COLUMN {column_name} {column_type}")
                print(f"✅ Added column: {column_name}")
            except sqlite3.OperationalError as e:
                print(f"❌ Error adding column {column_name}: {e}")
    
    conn.commit()
    conn.close()
    print("✅ Migration completed successfully")

if __name__ == "__main__":
    migrate_database()