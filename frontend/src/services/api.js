import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api'; // Update with your backend URL

export const fetchNotes = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/notes`);
        return response.data;
    } catch (error) {
        console.error('Error fetching notes:', error);
        throw error;
    }
};

export const createNote = async (noteData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/notes`, noteData);
        return response.data;
    } catch (error) {
        console.error('Error creating note:', error);
        throw error;
    }
};

export const updateNote = async (noteId, noteData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/notes/${noteId}`, noteData);
        return response.data;
    } catch (error) {
        console.error('Error updating note:', error);
        throw error;
    }
};

export const deleteNote = async (noteId) => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/notes/${noteId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
    }
};