// src/screens/NotesListScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { FAB, Card, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

export default function NotesListScreen({ navigation }) {
  const [connectionInfo, setConnectionInfo] = useState(null);

  const { 
    data: notesData, 
    isLoading, 
    isError,
    error,  // ✅ Add error object
    refetch 
  } = useQuery({
    queryKey: ['notes'],
    queryFn: () => apiService.getNotes(),
  });

  const notes = notesData?.data?.notes || [];

  // Connection info effect
  useEffect(() => {
    const info = apiService.getConnectionInfo();
    setConnectionInfo(info);
    console.log('🔗 Connection Info:', info);
  }, []);

  // ✅ Add debugging logs
  console.log('🏠 NotesListScreen Debug:', {
    isLoading,
    isError,
    error: error?.message,
    notesData: notesData?.data,
    notesCount: notes.length
  });

  const renderNote = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
    >
      <Card style={styles.noteCard}>
        <Card.Content>
          <Text style={styles.noteTitle}>{item.title}</Text>
          <Text style={styles.notePreview} numberOfLines={2}>
            {item.content}
          </Text>
          
          {item.ai_processed && (
            <View style={styles.aiInfo}>
              <Chip 
                icon="brain"  // ✅ Changed from "psychology"
                compact 
                style={[styles.chip, { backgroundColor: getSentimentColor(item.sentiment) }]}
              >
                {item.sentiment}
              </Chip>
              {item.keywords && item.keywords.slice(0, 3).map((keyword, index) => (
                <Chip key={index} compact style={styles.chip}>
                  {keyword}
                </Chip>
              ))}
            </View>
          )}
          
          <Text style={styles.noteDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#e8f5e8';
      case 'negative': return '#ffeaea';
      default: return '#f0f0f0';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading your smart notes...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text>❌ Error loading notes</Text>
        <TouchableOpacity onPress={refetch} style={styles.retryButton}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Add connection status check
  if (!connectionInfo?.isConnected) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>❌ Backend Connection Lost</Text>
        <Text style={styles.errorSubtext}>
          Trying to connect to: {connectionInfo?.baseURL}
        </Text>
        <Button onPress={refetch} mode="contained" style={{ marginTop: 16 }}>
          Retry Connection
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>Create your first AI-powered note!</Text>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateNote')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  noteCard: {
    marginBottom: 12,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  aiInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});