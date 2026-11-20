const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, getConversations, getMessageCounts } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

// ⚠️ IMPORTANT: specific routes hamesha dynamic-param routes se PEHLE
// aayen, warna Express unhe galat handler match kar dega.

// Get all unique (project + other-user) conversations for the logged-in user
router.get('/conversations', verifyToken, getConversations);

// 🟢 NEW: Get unread message count + pending collaboration requests count (for badge)
router.get('/counts', verifyToken, getMessageCounts);

// Send message and insert into DB — body: { receiverId, projectId, message }
router.post('/send', verifyToken, sendMessage);

// Get chat history for a SPECIFIC project between logged-in user and receiverId
// ⚠️ Yeh route sabse AAKHIR mein rehna chahiye, warna '/counts' aur '/conversations'
// ko galti se :projectId/:receiverId samajh lega
router.get('/:projectId/:receiverId', verifyToken, getMessages);

module.exports = router;