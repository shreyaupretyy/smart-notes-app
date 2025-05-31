import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const HomeScreen = () => {
    const notes = []; // This will eventually be populated with notes from the backend

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Smart Notes</Text>
            <FlatList
                data={notes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>{item.title}</Text>
                        <Text style={styles.noteContent}>{item.content}</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    noteCard: {
        padding: 15,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
    },
    noteTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    noteContent: {
        fontSize: 14,
        color: '#555',
    },
});

export default HomeScreen;