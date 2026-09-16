const db = require('../config/db');

const Message = {
    create: async (sender_id, receiver_id, message) => {
        console.log('🔵 Message.create called with:', { sender_id, receiver_id, message });
        try {
            const [result] = await db.execute(
                'INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)',
                [sender_id, receiver_id, message]
            );
            console.log('✅ Insert successful, insertId:', result.insertId);
            return result.insertId;
        } catch (err) {
            console.error('🔴 Insert FAILED inside Message.create:', err.message, err.code);
            throw err;
        }
    },

    getConversation: async (user1, user2) => {
        const [rows] = await db.execute(
            `SELECT * FROM messages 
             WHERE (sender_id = ? AND receiver_id = ?) 
                OR (sender_id = ? AND receiver_id = ?) 
             ORDER BY created_at ASC`,
            [user1, user2, user2, user1]
        );
        return rows;
    }
};

module.exports = Message;