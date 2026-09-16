const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, getConversations } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all unique (project + other-user) conversations for the logged-in user
router.get('/conversations', verifyToken, getConversations);

// Send message and insert into DB
router.post('/send', verifyToken, sendMessage);

// Get chat history for a SPECIFIC project between logged-in user and receiverId
router.get('/:projectId/:receiverId', verifyToken, getMessages);

module.exports = router;
