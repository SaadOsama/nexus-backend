const db = require('../config/db');

const getMessages = async (req, res) => {
  try {
    const { projectId, receiverId } = req.params;
    const senderId = req.user?.id;
    if (!senderId) return res.status(401).json({ success: false, message: 'Unauthorized user.' });
    if (!projectId || !receiverId) return res.status(400).json({ success: false, message: 'projectId and receiverId are required.' });

    const [messages] = await db.execute(
      `SELECT * FROM messages
       WHERE project_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY id ASC`,
      [projectId, senderId, receiverId, receiverId, senderId]
    );

    try {
      await db.execute(
        `UPDATE messages SET is_read = 1
         WHERE project_id = ? AND sender_id = ? AND receiver_id = ? AND is_read = 0`,
        [projectId, receiverId, senderId]
      );
    } catch (readErr) {
      console.warn('Mark-as-read bypassed:', readErr.message);
    }

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Error in getMessages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, projectId, message } = req.body;
    if (!senderId) return res.status(401).json({ success: false, message: 'Unauthorized. User token missing.' });
    if (!receiverId || !projectId || !message) {
      return res.status(400).json({ success: false, message: 'receiverId, projectId and message are required.' });
    }

    const [result] = await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, project_id, message) VALUES (?, ?, ?, ?)`,
      [senderId, receiverId, projectId, message]
    );

    try {
      const [senderRows] = await db.execute('SELECT fullName FROM users WHERE id = ?', [senderId]);
      const senderName = senderRows[0]?.fullName || 'Someone';
      await db.execute(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'message')`,
        [receiverId, `${senderName} sent you a message.`]
      );
    } catch (notifErr) {
      console.warn('Notification insertion bypassed:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Message saved successfully.',
      id: result.insertId,
      data: { id: result.insertId, sender_id: senderId, receiver_id: receiverId, project_id: projectId, message },
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized user.' });

    const [rows] = await db.execute(
      `SELECT
         IF(m.sender_id = ?, m.receiver_id, m.sender_id) AS userId,
         COALESCE(u.fullName, u.email, 'User') AS name,
         m.project_id AS projectId,
         p.title AS projectTitle,
         m.message AS lastMessage,
         m.created_at
       FROM messages m
       JOIN users u ON u.id = IF(m.sender_id = ?, m.receiver_id, m.sender_id)
       JOIN projects p ON p.id = m.project_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.id DESC`,
      [userId, userId, userId, userId]
    );

    const seen = new Map();
    for (const row of rows) {
      const key = `${row.projectId}_${row.userId}`;
      if (!seen.has(key)) {
        seen.set(key, {
          id: row.userId,
          projectId: row.projectId,
          name: row.name,
          projectTitle: row.projectTitle,
          lastMessage: row.lastMessage,
          created_at: row.created_at,
        });
      }
    }

    return res.status(200).json({ success: true, conversations: [...seen.values()] });
  } catch (error) {
    console.error('Error in getConversations:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMessageCounts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized user.' });

    const [[{ unreadMessages }]] = await db.query(
      `SELECT COUNT(*) AS unreadMessages FROM messages WHERE receiver_id = ? AND is_read = 0`,
      [userId]
    );

    const [[{ pendingRequests }]] = await db.query(
      `SELECT COUNT(*) AS pendingRequests
       FROM collaborations c
       JOIN projects p ON c.project_id = p.id
       WHERE p.user_id = ? AND c.status IN ('pending', 'pending_admin')`,
      [userId]
    );

    return res.status(200).json({ success: true, unreadMessages, pendingRequests });
  } catch (error) {
    console.error('Error in getMessageCounts:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getMessages, sendMessage, getConversations, getMessageCounts };
