import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { formatDate } from '../utils/dateUtils';

/**
 * Component for displaying a single note card
 */
const NoteCard = ({ note, onPress }) => {
  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" numberOfLines={1}>
            {note.title}
          </Text>
          <Text variant="bodyMedium" numberOfLines={2} style={styles.contentPreview}>
            {note.content}
          </Text>
          <Text variant="bodySmall" style={styles.date}>
            {formatDate(note.updatedAt)}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  contentPreview: {
    marginTop: 4,
    marginBottom: 8,
    color: '#666666',
  },
  date: {
    color: '#999999',
  },
});

export default NoteCard;