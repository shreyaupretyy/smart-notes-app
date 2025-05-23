import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, Searchbar, Text, Chip, Divider } from 'react-native-paper';
import { useNotes } from '../contexts/NoteContext';
import NoteCard from '../components/NoteCard';
import { useNavigation } from '@react-navigation/native';
import { debounce } from '../utils/helpers';

const SearchScreen = () => {
  const navigation = useNavigation();
  const { filteredNotes, categories, searchNotes, filterByCategory, clearFilters, setActiveNote } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  // Handle search query change with debounce
  const handleSearch = debounce((query) => {
    searchNotes(query);
    
    // Add to recent searches if not empty
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updatedSearches = [query.trim(), ...recentSearches.slice(0, 4)];
      setRecentSearches(updatedSearches);
    }
  }, 300);

  // Update search query
  const updateSearchQuery = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  // Select category for filtering
  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    filterByCategory(categoryId);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    clearFilters();
  };

  // Use recent search
  const useRecentSearch = (query) => {
    setSearchQuery(query);
    searchNotes(query);
  };

  // Handle note press
  const handleNotePress = (note) => {
    setActiveNote(note);
    navigation.navigate('NoteEditor', { note });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Search Notes" />
      </Appbar.Header>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by title or content"
          onChangeText={updateSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {searchQuery.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentSearchesContainer}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <View style={styles.chipContainer}>
            {recentSearches.map((search, index) => (
              <Chip 
                key={index} 
                mode="outlined" 
                onPress={() => useRecentSearch(search)}
                style={styles.chip}
              >
                {search}
              </Chip>
            ))}
          </View>
          <Divider style={styles.divider} />
        </View>
      )}

      <View style={styles.categoriesContainer}>
        <Text style={styles.sectionTitle}>Filter by Category</Text>
        <View style={styles.chipContainer}>
          <Chip 
            selected={selectedCategory === null}
            onPress={() => handleCategorySelect(null)}
            style={styles.chip}
          >
            All
          </Chip>
          {categories.map(category => (
            <Chip 
              key={category.id} 
              selected={selectedCategory === category.id}
              onPress={() => handleCategorySelect(category.id)}
              style={styles.chip}
            >
              {category.name}
            </Chip>
          ))}
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Results</Text>
          {(searchQuery.length > 0 || selectedCategory !== null) && (
            <Chip onPress={handleClearFilters} icon="close">Clear Filters</Chip>
          )}
        </View>

        <FlatList
          data={filteredNotes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={handleNotePress} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.length > 0 || selectedCategory !== null
                  ? 'No notes match your search criteria'
                  : 'Enter a search term to find notes'}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  searchbar: {
    elevation: 0,
  },
  recentSearchesContainer: {
    padding: 16,
  },
  categoriesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  divider: {
    marginVertical: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default SearchScreen;