const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Base Mounted Route: /api/notifications

// GET /api/notifications/unread-count
router.get('/unread-count', verifyToken, getUnreadCount);

// PATCH /api/notifications/read-all
router.patch('/read-all', verifyToken, markAllAsRead);

// GET /api/notifications/
router.get('/', verifyToken, getNotifications);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', verifyToken, markAsRead);

module.exports = router;