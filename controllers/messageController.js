const db = require('../config/db');

// GET /api/messages/:projectId/:receiverId
// Chat history is now scoped to a specific project — same two users can
// have separate threads for each project they collaborate on.
const getMessages = async (req, res) => {
  try {
    const { projectId, receiverId } = req.params;
    const senderId = req.user?.id;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized user.' });
    }

    if (!projectId || !receiverId) {
      return res.status(400).json({ success: false, message: 'projectId and receiverId are required.' });
    }

    const [messages] = await db.execute(
      `SELECT * FROM messages
       WHERE project_id = ?
         AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
       ORDER BY id ASC`,
      [projectId, senderId, receiverId, receiverId, senderId]
    );

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Error in getMessages:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/messages/send
// body: { receiverId, projectId, message }
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, projectId, message } = req.body;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User token missing.' });
    }

    if (!receiverId || !projectId || !message) {
      return res.status(400).json({
        success: false,
        message: 'receiverId, projectId and message are required.',
      });
    }

    console.log(`Saving Message: Sender=${senderId}, Receiver=${receiverId}, Project=${projectId}, Msg=${message}`);

    const [result] = await db.execute(
      `INSERT INTO messages (sender_id, receiver_id, project_id, message) VALUES (?, ?, ?, ?)`,
      [senderId, receiverId, projectId, message]
    );

    console.log('Message Inserted Successfully! DB ID:', result.insertId);

    return res.status(201).json({
      success: true,
      message: 'Message saved successfully.',
      id: result.insertId,
      data: {
        id: result.insertId,
        sender_id: senderId,
        receiver_id: receiverId,
        project_id: projectId,
        message,
      },
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/messages/conversations
// Returns one row PER (project, other-user) pair
const getConversations = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized user.' });
    }

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

module.exports = { getMessages, sendMessage, getConversations };
