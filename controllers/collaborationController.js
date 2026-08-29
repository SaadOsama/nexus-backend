const db = require('../config/db');

// Send Request
const sendRequest = async (req, res) => {
  try {
    const { project_id, sender_id, email, message } = req.body;

    if (!project_id || !sender_id) {
      return res.status(400).json({ success: false, message: 'project_id and sender_id are required.' });
    }

    const [result] = await db.execute(
      `INSERT INTO collaboration_requests (project_id, sender_id, email, message) VALUES (?, ?, ?, ?)`,
      [project_id, sender_id, email || null, message || null]
    );

    res.status(201).json({
      success: true,
      message: 'Request sent successfully!',
      requestId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Get Incoming Requests for User
const getIncomingRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.execute(
      `SELECT 
        cr.id,
        cr.project_id,
        cr.sender_id,
        cr.email,
        cr.message,
        cr.status,
        SUBSTRING_INDEX(cr.email, '@', 1) AS senderName,
        'wants to collaborate on' AS actionText,
        p.title AS targetName
       FROM collaboration_requests cr
       JOIN projects p ON cr.project_id = p.id
       WHERE p.user_id = ? AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Accept Request
const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "UPDATE collaboration_requests SET status = 'accepted' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: 'Request accepted!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

// Dismiss Request
const dismissRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      "UPDATE collaboration_requests SET status = 'rejected' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, message: 'Request dismissed!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

module.exports = {
  sendRequest,
  getIncomingRequests,
  acceptRequest,
  dismissRequest
};