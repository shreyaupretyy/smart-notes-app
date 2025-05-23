import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, FAB, Searchbar, ActivityIndicator } from 'react-native-paper';
import { NotesContext } from '../contexts/NotesContext';
import NoteCard from '../components/NoteCard';
import { apiClient } from '../api/apiClient';

const HomeScreen = ({ navigation }) => {
  const { notes, isLoading } = useContext(NotesContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    // Filter notes based on search query
    if (searchQuery.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, notes]);

  // Check API health
  useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await apiClient.checkHealth();
      setApiHealth(response.status === 'healthy');
    } catch (error) {
      console.error('Failed to check API health:', error);
      setApiHealth(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkApiHealth();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <NoteCard
      note={item}
      onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Smart Notes</Text>
        {apiHealth !== null && (
          <View style={[styles.statusDot, { backgroundColor: apiHealth ? '#4CAF50' : '#F44336' }]} />
        )}
      </View>
      
      <Searchbar
        placeholder="Search notes..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {filteredNotes.length > 0 ? (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          {searchQuery.trim() !== '' ? (
            <Text variant="bodyLarge">No notes match your search.</Text>
          ) : (
            <Text variant="bodyLarge">No notes yet. Create your first note!</Text>
          )}
        </View>
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('CreateNote')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontWeight: 'bold',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  searchBar: {
    margin: 16,
    elevation: 2,
    borderRadius: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default HomeScreen;