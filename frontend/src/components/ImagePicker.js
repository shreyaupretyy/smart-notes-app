// src/components/ImagePicker.js - Make image cover the whole box
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, Platform, Linking } from 'react-native';
import { Button, Dialog, Portal, Card } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function ImagePickerComponent({ onImageSelected, currentImage }) {
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (imageUri) => {
    setIsProcessing(true);
    try {
      console.log('📷 Processing image from:', imageUri);
      
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get image info
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      
      const imageData = {
        uri: imageUri,
        base64: base64,
        size: imageInfo.size,
        name: imageUri.split('/').pop(),
      };

      console.log('📷 Image processed successfully');
      onImageSelected(imageData);
    } catch (error) {
      console.error('❌ Error processing image:', error);
      Alert.alert('Error', 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    try {
      console.log('📷 Requesting camera permissions...');
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed', 
          'Camera permission is required to take photos',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      console.log('✅ Camera permission granted, launching camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      console.log('📷 Camera result:', { 
        canceled: result.canceled, 
        hasAssets: result.assets?.length > 0 
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Error taking photo:', error);
      Alert.alert('Error', `Failed to take photo: ${error.message}`);
    }
    setDialogVisible(false);
  };

  const pickFromGallery = async () => {
    try {
      console.log('🖼️ Requesting media library permissions...');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed', 
          'Photo library permission is required to select images',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }}
          ]
        );
        return;
      }

      console.log('✅ Media library permission granted, launching picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      console.log('🖼️ Gallery result:', { 
        canceled: result.canceled, 
        hasAssets: result.assets?.length > 0 
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
    setDialogVisible(false);
  };

  const removeImage = () => {
    onImageSelected(null);
  };

  return (
    <View style={styles.container}>
      {currentImage ? (
        <Card style={styles.imageCard}>
          {/* ✅ Image covers the whole card except button area */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: currentImage.uri }} 
              style={styles.imagePreview}
              resizeMode="cover" // ✅ Changed back to 'cover' to fill the entire space
            />
          </View>
          
          {/* ✅ Buttons positioned at bottom with overlay style */}
          <View style={styles.buttonOverlay}>
            <View style={styles.buttonContainer}>
              <Button 
                onPress={removeImage} 
                mode="contained"
                buttonColor="rgba(244, 67, 54, 0.9)"
                textColor="white"
                compact
                style={styles.overlayButton}
              >
                Remove
              </Button>
              <Button 
                onPress={() => setDialogVisible(true)}
                mode="contained"
                buttonColor="rgba(33, 150, 243, 0.9)"
                textColor="white"
                compact
                style={styles.overlayButton}
              >
                Change
              </Button>
            </View>
          </View>
        </Card>
      ) : (
        <Button 
          mode="outlined" 
          onPress={() => setDialogVisible(true)}
          icon="camera"
          style={styles.addButton}
          loading={isProcessing}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Add Image'}
        </Button>
      )}

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Add Image</Dialog.Title>
          <Dialog.Content>
            <Text>Choose how you want to add an image to your note:</Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setDialogVisible(false)}>
              Cancel
            </Button>
            <Button 
              onPress={takePhoto} 
              icon="camera"
              mode="contained"
              style={styles.actionButton}
            >
              Take Photo
            </Button>
            <Button 
              onPress={pickFromGallery} 
              icon="image"
              mode="outlined"
              style={styles.actionButton}
            >
              Gallery
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  addButton: {
    marginVertical: 8,
  },
  imageCard: {
    marginVertical: 8,
    elevation: 2,
    overflow: 'hidden', // ✅ Ensures image doesn't overflow card borders
    position: 'relative', // ✅ For absolute positioning of buttons
  },
  // ✅ Image container takes full card space
  imageContainer: {
    width: '100%',
    height: 300, // Fixed height for consistent card size
    position: 'relative',
  },
  // ✅ Image covers the entire container
  imagePreview: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // ✅ Button overlay positioned at bottom
  buttonOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent background
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  // ✅ Button container for horizontal layout
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // ✅ Overlay button styles
  overlayButton: {
    minWidth: 80,
    elevation: 2,
  },
  dialogActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  actionButton: {
    marginVertical: 4,
  },
});