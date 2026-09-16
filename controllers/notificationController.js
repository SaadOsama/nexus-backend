const db = require('../config/db');

const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const [rows] = await db.execute(
      `SELECT id, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return res.status(200).json({ success: true, notifications: rows });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return res.status(200).json({ success: true, count: rows[0].count });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const [result] = await db.execute(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    return res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    await db.execute(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
