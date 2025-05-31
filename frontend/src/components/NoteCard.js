import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const NoteCard = ({ note }) => {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{note.title}</Text>
            <Text style={styles.content}>{note.content}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 10,
        margin: 10,
        borderRadius: 5,
        backgroundColor: '#f9f9f9',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        fontSize: 14,
        color: '#333',
    },
});

export default NoteCard;