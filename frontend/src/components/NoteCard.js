import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, IconButton } from 'react-native-paper';
import { useNotes } from '../contexts/NoteContext';
import { formatDate } from '../utils/helpers';

const NoteCard = ({ note, onPress }) => {
  const { deleteNote, categories } = useNotes();
  
  // Get category name
  const getCategoryName = () => {
    if (!note.categoryId) return null;
    const category = categories.find(cat => cat.id === note.categoryId);
    return category ? category.name : null;
  };
  
  // Format date
  const formattedDate = formatDate(note.updatedAt || note.createdAt);
  
  // Handle delete
  const handleDelete = (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  };
  
  // Get preview text (first 100 characters)
  const getPreviewText = () => {
    if (!note.content) return '';
    return note.content.length > 100 
      ? note.content.substring(0, 100) + '...' 
      : note.content;
  };
  
  return (
    <TouchableOpacity onPress={() => onPress(note)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Title style={styles.title}>{note.title}</Title>
            <IconButton 
              icon="delete" 
              size={20} 
              onPress={handleDelete} 
              style={styles.deleteButton}
            />
          </View>
          
          <Paragraph style={styles.preview}>{getPreviewText()}</Paragraph>
          
          <View style={styles.footer}>
            {getCategoryName() && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{getCategoryName()}</Text>
              </View>
            )}
            <Text style={styles.date}>{formattedDate}</Text>
            
            {note._offlineCreated && (
              <View style={styles.offlineIndicator}>
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    elevation: 2,
    borderRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: 'bold',
  },
  preview: {
    marginVertical: 8,
    color: '#555',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  categoryPill: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#555',
  },
  deleteButton: {
    margin: 0,
  },
  offlineIndicator: {
    backgroundColor: '#ffe0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 12,
    color: '#c00',
  },
});

export default NoteCard;