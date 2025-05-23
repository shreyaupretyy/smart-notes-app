# A simple Note model class
class Note:
    """Model to represent a Note entity"""
    
    def __init__(self, id, title, content, created_at=None, updated_at=None):
        self.id = id
        self.title = title
        self.content = content
        self.created_at = created_at
        self.updated_at = updated_at
    
    def to_dict(self):
        """Convert Note object to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data):
        """Create Note object from dictionary"""
        return cls(
            id=data.get('id'),
            title=data.get('title'),
            content=data.get('content'),
            created_at=data.get('created_at'),
            updated_at=data.get('updated_at')
        )