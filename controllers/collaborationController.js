const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

const handleSendRequest = async (req, res) => {
  try {
    const project_id = req.body.project_id || req.body.projectId;
    // Extract sender_id from body or JWT auth token
    const sender_id =
      req.body.sender_id ||
      req.body.senderId ||
      req.body.user_id ||
      req.body.userId ||
      req.user?.id;
    const message = req.body.message || null;

    console.log('Incoming Collaboration Request:', { project_id, sender_id });

    if (!project_id || !sender_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id and sender_id are required.',
      });
    }

    // Verify project owner
    const [projectRows] = await db.query(
      'SELECT user_id FROM projects WHERE id = ?',
      [project_id]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    // Prevent requesting own project
    if (Number(projectRows[0].user_id) === Number(sender_id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a collaboration request to your own project.',
      });
    }

    // 🟢 FIX: also store the optional message the sender typed, so the
    // recipient's inbox can actually show it (previously this went to a
    // different, disconnected table and was lost).
    await db.execute(
      'INSERT INTO collaborations (project_id, sender_id, message) VALUES (?, ?, ?)',
      [project_id, sender_id, message]
    );

    return res.status(201).json({
      success: true,
      message: 'Collaboration request sent successfully!',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'You have already requested collaboration for this project.',
      });
    }

    console.error('Error in sendRequest:', err);
    return res.status(500).json({
      success: false,
      message: 'Server Error: ' + err.message,
    });
  }
};

// 🟢 NEW: GET /api/collaborations — incoming requests for the logged-in
// user's projects. Reads from the SAME 'collaborations' table that
// handleSendRequest writes to (previously the inbox read from an unrelated,
// always-empty 'collaboration_requests' table).
const handleGetIncoming = async (req, res) => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const [rows] = await db.query(
      `SELECT
         c.id,
         c.project_id,
         c.sender_id,
         c.message,
         c.status,
         c.created_at,
         u.fullName AS senderName,
         u.email AS senderEmail,
         'wants to collaborate on' AS actionText,
         p.title AS targetName
       FROM collaborations c
       JOIN projects p ON c.project_id = p.id
       JOIN users u ON c.sender_id = u.id
       WHERE p.user_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`,
      [ownerId]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Error in getIncoming:', err);
    return res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};

// 🟢 NEW: shared ownership check for accept/dismiss so a user can only act
// on requests sent to THEIR OWN projects — a request id doesn't belong to
// them just because they're logged in.
const updateRequestStatus = async (req, res, status) => {
  try {
    const ownerId = req.user?.id;
    const { id } = req.params;

    const [result] = await db.execute(
      `UPDATE collaborations c
       JOIN projects p ON c.project_id = p.id
       SET c.status = ?
       WHERE c.id = ? AND p.user_id = ?`,
      [status, id, ownerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or you are not authorized to update it.',
      });
    }

    return res.status(200).json({ success: true, message: `Request ${status}!` });
  } catch (err) {
    console.error('Error updating request status:', err);
    return res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};

router.post('/', verifyToken, handleSendRequest);
router.post('/send', verifyToken, handleSendRequest);
router.get('/', verifyToken, handleGetIncoming);
router.post('/accept/:id', verifyToken, (req, res) => updateRequestStatus(req, res, 'accepted'));
router.post('/dismiss/:id', verifyToken, (req, res) => updateRequestStatus(req, res, 'rejected'));

module.exports = router;
