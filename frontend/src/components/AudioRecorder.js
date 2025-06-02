// src/components/AudioRecorder.js - Fixed version with proper audio handling
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Linking } from 'react-native';
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
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Cleanup function
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      cleanupAudio();
    };
  }, []);

  // ✅ Cleanup sound when it changes
  useEffect(() => {
    return sound
      ? () => {
          console.log('🧹 Cleaning up sound...');
          sound.unloadAsync().catch(console.error);
        }
      : undefined;
  }, [sound]);

  // ✅ Cleanup audio resources
  const cleanupAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      setIsPlaying(false);
      setIsRecording(false);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  };

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

  // ✅ Start recording with better audio settings
  const startRecording = async () => {
    try {
      console.log('🎤 Starting audio recording...');
      
      // ✅ First cleanup any existing recording
      await cleanupAudio();
      
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // ✅ Configure audio mode for better recording quality
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // ✅ Better recording options for higher volume and quality
      const recordingOptions = {
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 44100, // Higher sample rate for better quality
          numberOfChannels: 2, // Stereo for better sound
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.MAX, // ✅ Maximum quality
          sampleRate: 44100, // Higher sample rate
          numberOfChannels: 2, // Stereo
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      console.log('🎤 Creating recording with options:', recordingOptions);

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording) {
            setRecordingDuration(Math.floor(status.durationMillis / 1000));
          }
        }
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      console.log('✅ Recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      Alert.alert('Error', `Failed to start recording: ${error.message}`);
      // ✅ Reset state on error
      setIsRecording(false);
      setRecording(null);
    }
  };

  // ✅ Stop recording with proper cleanup
  const stopRecording = async () => {
    try {
      console.log('🛑 Stopping recording...');
      
      if (!recording) {
        console.log('⚠️ No recording to stop');
        return;
      }

      setIsRecording(false);
      setIsProcessing(true);

      // Stop and get URI
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('📁 Recording saved to:', uri);

      // ✅ Clear recording reference immediately
      setRecording(null);
      setRecordingDuration(0);

      // Process the audio file
      if (uri) {
        await processAudioFile(uri);
      }

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      setIsProcessing(false);
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

  // ✅ Play/pause audio with better volume settings
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
        // ✅ Set audio mode for better playback volume
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentAudio.uri },
          { 
            shouldPlay: true,
            volume: 1.0, // ✅ Maximum volume
            rate: 1.0,
            shouldCorrectPitch: true,
          },
          (status) => {
            if (status.isLoaded) {
              setPlaybackPosition(status.positionMillis || 0);
              setPlaybackDuration(status.durationMillis || 0);
              setIsPlaying(status.isPlaying || false);
              
              // When playback finishes
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPlaybackPosition(0);
              }
            }
          }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('❌ Playback error:', error);
      Alert.alert('Error', `Failed to play audio: ${error.message}`);
    }
  };

  // ✅ Remove audio with complete cleanup
  const removeAudio = async () => {
    try {
      console.log('🗑️ Removing audio...');
      
      // ✅ Complete cleanup
      await cleanupAudio();
      
      // ✅ Reset all state
      setRecordingDuration(0);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
      
      // ✅ Notify parent component
      onAudioRecorded(null);
      
      console.log('✅ Audio removed successfully');
    } catch (error) {
      console.error('❌ Error removing audio:', error);
    }
  };

  // ✅ Re-record function with proper cleanup
  const reRecord = async () => {
    try {
      console.log('🔄 Re-recording...');
      
      // ✅ Remove current audio first
      await removeAudio();
      
      // ✅ Small delay to ensure cleanup
      setTimeout(() => {
        startRecording();
      }, 100);
      
    } catch (error) {
      console.error('❌ Re-record error:', error);
    }
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
          
          <Card.Actions style={styles.cardActions}>
            <Button 
              onPress={togglePlayback}
              icon={isPlaying ? "pause" : "play"}
              mode="outlined"
              style={styles.actionButton}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button 
              onPress={removeAudio}
              textColor="#d32f2f"
              icon="delete"
              style={styles.actionButton}
            >
              Remove
            </Button>
            <Button 
              onPress={reRecord} // ✅ Use new reRecord function
              icon="microphone"
              style={styles.actionButton}
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
                  <View style={[styles.pulsingDot, isRecording && styles.pulsing]} />
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
            ) : isProcessing ? (
              <View style={styles.processingContainer}>
                <Text style={styles.processingText}>Processing audio...</Text>
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
  cardActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
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
  },
  pulsing: {
    opacity: 0.7,
    // You can add animation here if needed
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
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});