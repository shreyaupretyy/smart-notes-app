import React from 'react';
import { Menu, Divider } from 'react-native-paper';

/**
 * Component for displaying AI features in a menu
 */
const AIFeaturesMenu = ({ visible, onDismiss, onImageToText, onSpeechToText, onSummarize, onGetSuggestions }) => {
  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      contentStyle={{ backgroundColor: '#ffffff' }}
    >
      <Menu.Item 
        onPress={onImageToText} 
        title="Image to Text" 
        leadingIcon="image-text" 
      />
      <Menu.Item 
        onPress={onSpeechToText} 
        title="Speech to Text" 
        leadingIcon="microphone" 
      />
      <Divider />
      <Menu.Item 
        onPress={onSummarize} 
        title="Summarize" 
        leadingIcon="text-box-check" 
      />
      <Menu.Item 
        onPress={onGetSuggestions} 
        title="Get Suggestions" 
        leadingIcon="lightbulb-on" 
      />
    </Menu>
  );
};

export default AIFeaturesMenu;