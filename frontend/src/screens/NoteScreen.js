import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { getNote, updateNote } from '../services/api';

const NoteScreen = ({ route, navigation }) => {
    const { noteId } = route.params;
    const [note, setNote] = useState({ title: '', content: '' });

    useEffect(() => {
        const fetchNote = async () => {
            const fetchedNote = await getNote(noteId);
            setNote(fetchedNote);
        };
        fetchNote();
    }, [noteId]);

    const handleSave = async () => {
        await updateNote(noteId, note);
        navigation.goBack();
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.titleInput}
                value={note.title}
                onChangeText={(text) => setNote({ ...note, title: text })}
                placeholder="Note Title"
            />
            <TextInput
                style={styles.contentInput}
                value={note.content}
                onChangeText={(text) => setNote({ ...note, content: text })}
                placeholder="Note Content"
                multiline
            />
            <Button title="Save" onPress={handleSave} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    titleInput: {
        fontSize: 24,
        marginBottom: 16,
    },
    contentInput: {
        fontSize: 16,
        height: 200,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 16,
        padding: 8,
    },
});

export default NoteScreen;