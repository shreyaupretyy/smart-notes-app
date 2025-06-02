// src/components/AudioRecorder.js - New audio recording component
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Button, Card, ProgressBar, Chip } from 'react-native-paper';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export default function AudioRecorder({ onAudioRecorded, currentAudio }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  // Request audio permissions
  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Microphone permission is required to record audio',
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
        return false;
      }
      return true;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          android: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
            audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
            sampleRate: 16000, // Optimal for Whisper
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
            audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
            sampleRate: 16000, // Optimal for Whisper
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
        },
        (status) => {
          if (status.isRecording) {
            setRecordingDuration(Math.floor(status.durationMillis / 1000));
          }
        }
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      console.log('✅ Recording started');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      console.log('📁 Recording saved to:', uri);

      // Process the audio file
      if (uri) {
        await processAudioFile(uri);
      }

      setRecording(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  // Process audio file and convert to base64
  const processAudioFile = async (uri) => {
    try {
      console.log('🔄 Processing audio file...');
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);
      console.log('📊 Audio file info:', {
        size: `${(fileInfo.size / 1024).toFixed(1)} KB`,
        exists: fileInfo.exists
      });

      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const audioData = {
        uri: uri,
        base64: base64,
        size: fileInfo.size,
        duration: recordingDuration,
        name: `recording_${Date.now()}.wav`,
      };

      console.log('✅ Audio processed successfully');
      onAudioRecorded(audioData);
    } catch (error) {
      console.error('❌ Error processing audio file:', error);
      Alert.alert('Error', 'Failed to process audio file');
    }
  };

  // Play/pause audio
  const togglePlayback = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else if (currentAudio) {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentAudio.uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPlaybackPosition(status.positionMillis || 0);
              setPlaybackDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying);
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Playback error:', error);
      Alert.alert('Error', 'Failed to play audio');
    }
  };

  // Remove audio
  const removeAudio = () => {
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    onAudioRecorded(null);
  };

  // Format time display
  const formatTime = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {currentAudio ? (
        <Card style={styles.audioCard}>
          <Card.Content>
            <View style={styles.audioInfo}>
              <Text style={styles.audioTitle}>🎤 Voice Recording</Text>
              <Chip mode="outlined" compact>
                {formatTime(currentAudio.duration * 1000)}
              </Chip>
            </View>
            
            {playbackDuration > 0 && (
              <View style={styles.progressContainer}>
                <ProgressBar 
                  progress={playbackDuration > 0 ? playbackPosition / playbackDuration : 0}
                  style={styles.progressBar}
                />
                <Text style={styles.timeText}>
                  {formatTime(playbackPosition)} / {formatTime(playbackDuration)}
                </Text>
              </View>
            )}
          </Card.Content>
          
          <Card.Actions>
            <Button 
              onPress={togglePlayback}
              icon={isPlaying ? "pause" : "play"}
              mode="outlined"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button 
              onPress={removeAudio}
              textColor="#d32f2f"
              icon="delete"
            >
              Remove
            </Button>
            <Button 
              onPress={startRecording}
              icon="microphone"
            >
              Re-record
            </Button>
          </Card.Actions>
        </Card>
      ) : (
        <Card style={styles.recordingCard}>
          <Card.Content>
            {isRecording ? (
              <View style={styles.recordingContainer}>
                <View style={styles.recordingIndicator}>
                  <View style={styles.pulsingDot} />
                  <Text style={styles.recordingText}>Recording...</Text>
                </View>
                <Text style={styles.durationText}>
                  {formatTime(recordingDuration * 1000)}
                </Text>
                <Button 
                  mode="contained"
                  onPress={stopRecording}
                  icon="stop"
                  buttonColor="#d32f2f"
                  style={styles.stopButton}
                >
                  Stop Recording
                </Button>
              </View>
            ) : (
              <View style={styles.startContainer}>
                <Text style={styles.instructionText}>
                  Tap to record a voice note
                </Text>
                <Button 
                  mode="contained"
                  onPress={startRecording}
                  icon="microphone"
                  style={styles.recordButton}
                >
                  Start Recording
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  audioCard: {
    elevation: 2,
  },
  recordingCard: {
    elevation: 2,
    backgroundColor: '#f8f9fa',
  },
  audioInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulsingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d32f2f',
    marginRight: 8,
    // Add pulsing animation if needed
  },
  recordingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  stopButton: {
    minWidth: 150,
  },
  startContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  recordButton: {
    minWidth: 150,
    backgroundColor: '#6366f1',
  },
});