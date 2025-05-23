import React, { useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, FAB, Text, Chip, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useNotes } from '../contexts/NoteContext';
import NoteCard from '../components/NoteCard';
import NetInfo from '@react-native-community/netinfo';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { 
    filteredNotes, 
    isLoading, 
    error, 
    refreshNotes, 
    isOnline, 
    clearFilters,
    searchQuery,
    filterCategory,
    categories,
    setActiveNote
  } = useNotes();
  
  // Load notes on component mount
  useEffect(() => {
    refreshNotes();
  }, []);
  
  // Handle note press
  const handleNotePress = (note) => {
    setActiveNote(note);
    navigation.navigate('NoteEditor', { note });
  };
  
  // Create new note
  const handleNewNote = () => {
    navigation.navigate('NoteEditor');
  };
  
  // Get category name by ID
  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : null;
  };
  
  // Main render
  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Smart Notes" />
        {!isOnline && <Appbar.Action icon="wifi-off" />}
        <Appbar.Action icon="refresh" onPress={refreshNotes} disabled={isLoading} />
      </Appbar.Header>
      
      {/* Active filters display */}
      {(searchQuery || filterCategory) && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Active filters:</Text>
          <View style={styles.chipContainer}>
            {searchQuery && (
              <Chip 
                style={styles.chip} 
                onClose={() => clearFilters()}
                icon="magnify"
              >
                "{searchQuery}"
              </Chip>
            )}
            
            {filterCategory && (
              <Chip 
                style={styles.chip} 
                onClose={() => clearFilters()}
                icon="tag"
              >
                {getCategoryName(filterCategory)}
              </Chip>
            )}
          </View>
        </View>
      )}
      
      {/* Notes list */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredNotes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No notes found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={handleNotePress} />
          )}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refreshNotes}
        />
      )}
      
      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={handleNewNote}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#eee',
  },
  filtersLabel: {
    marginRight: 8,
    fontSize: 14,
    color: '#555',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
});

export default HomeScreen;