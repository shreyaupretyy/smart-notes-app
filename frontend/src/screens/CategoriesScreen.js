import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, List, FAB, Dialog, Portal, TextInput, Button, Text } from 'react-native-paper';
import { useNotes } from '../contexts/NoteContext';
import { getRandomColor } from '../utils/helpers';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CategoriesScreen = ({ navigation }) => {
  const { categories = [], filterByCategory, filteredNotes = [], isOnline } = useNotes();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);

  // Show dialog to add/edit category
  const showDialog = (category = null) => {
    if (category) {
      setIsEditing(true);
      setEditCategoryId(category.id);
      setNewCategoryName(category.name);
    } else {
      setIsEditing(false);
      setEditCategoryId(null);
      setNewCategoryName('');
    }
    setDialogVisible(true);
  };

  // Hide dialog
  const hideDialog = () => {
    setDialogVisible(false);
    setNewCategoryName('');
  };

  // Add new category
  const addCategory = async () => {
    if (!newCategoryName.trim()) {
      return;
    }

    try {
      const categoriesStr = await AsyncStorage.getItem('categories');
      const existingCategories = categoriesStr ? JSON.parse(categoriesStr) : [];
      
      const newCategory = {
        id: `cat_${Date.now()}`,
        name: newCategoryName.trim(),
        color: getRandomColor()
      };
      
      const updatedCategories = [...existingCategories, newCategory];
      
      await AsyncStorage.setItem('categories', JSON.stringify(updatedCategories));
      
      // Force a refresh - in a real app, this would update the context
      // For now, we'll just request a reload of the app
      alert('Category added! Please restart the app to see changes.');
      
      hideDialog();
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category');
    }
  };

  // Update category
  const updateCategory = async () => {
    if (!newCategoryName.trim() || !editCategoryId) {
      return;
    }

    try {
      const categoriesStr = await AsyncStorage.getItem('categories');
      const existingCategories = categoriesStr ? JSON.parse(categoriesStr) : [];
      
      const updatedCategories = existingCategories.map(cat => 
        cat.id === editCategoryId 
          ? { ...cat, name: newCategoryName.trim() } 
          : cat
      );
      
      await AsyncStorage.setItem('categories', JSON.stringify(updatedCategories));
      
      // Force a refresh
      alert('Category updated! Please restart the app to see changes.');
      
      hideDialog();
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  // Delete category
  const deleteCategory = async (categoryId) => {
    try {
      const categoriesStr = await AsyncStorage.getItem('categories');
      const existingCategories = categoriesStr ? JSON.parse(categoriesStr) : [];
      
      const updatedCategories = existingCategories.filter(cat => cat.id !== categoryId);
      
      await AsyncStorage.setItem('categories', JSON.stringify(updatedCategories));
      
      // Force a refresh
      alert('Category deleted! Please restart the app to see changes.');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  // Get note count by category
  const getNoteCountByCategory = (categoryId) => {
    return Array.isArray(filteredNotes) 
      ? filteredNotes.filter(note => note && note.categoryId === categoryId).length
      : 0;
  };

  // View notes by category
  const viewNotesByCategory = (categoryId) => {
    filterByCategory(categoryId);
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Categories" />
        {!isOnline && <Appbar.Action icon="wifi-off" />}
      </Appbar.Header>

      {Array.isArray(categories) && categories.length > 0 ? (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.name}
              description={`${getNoteCountByCategory(item.id)} notes`}
              left={props => <List.Icon {...props} icon="folder" color={item.color || '#2196f3'} />}
              right={props => (
                <View style={styles.actionsContainer}>
                  <List.Icon {...props} icon="pencil" onPress={() => showDialog(item)} />
                  <List.Icon {...props} icon="delete" onPress={() => deleteCategory(item.id)} />
                </View>
              )}
              onPress={() => viewNotesByCategory(item.id)}
              style={styles.listItem}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <List.Item
            title="No categories yet"
            description="Tap the + button to create a category"
            left={props => <List.Icon {...props} icon="information" />}
          />
        </View>
      )}

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => showDialog()}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>{isEditing ? 'Edit Category' : 'New Category'}</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Category Name"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button onPress={isEditing ? updateCategory : addCategory}>
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingBottom: 80,
  },
  listItem: {
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  input: {
    marginBottom: 8,
  },
  emptyContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
});

export default CategoriesScreen;