const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware to check Admin role
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// ==========================================
// 1. USER: Get sent requests (Logged-in user)
// GET /api/collaborations/my-requests
// ==========================================
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized access.' });
    }

    const [rows] = await db.query(
      `SELECT 
        c.id, 
        c.project_id, 
        c.message, 
        c.message AS user_message, 
        c.status, 
        c.admin_response, 
        c.created_at,
        p.title AS targetName,
        p.title AS project_name,
        p.title AS project_title,
        p.description AS project_description
       FROM collaborations c
       JOIN projects p ON c.project_id = p.id
       WHERE c.sender_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Error in my-requests:', err);
    return res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// 2. ADMIN: Get pending requests queue
// GET /api/collaborations/admin/pending
// GET /api/collaborations/admin/requests
// ==========================================
const handleGetAdminPending = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         c.id,
         c.project_id,
         c.sender_id,
         c.message,
         c.status,
         c.created_at,
         u.fullName AS senderName,
         u.fullName AS sender_name,
         u.email AS senderEmail,
         u.email AS sender_email,
         'wants to collaborate on' AS actionText,
         p.title AS targetName,
         p.title AS project_title,
         p.description AS project_description
       FROM collaborations c
       JOIN projects p ON c.project_id = p.id
       JOIN users u ON c.sender_id = u.id
       WHERE c.status IN ('pending_admin', 'pending')
       ORDER BY c.created_at DESC`
    );

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('Error in getAdminPending:', err);
    return res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};

router.get('/admin/pending', verifyToken, handleGetAdminPending);
router.get('/admin/requests', verifyToken, handleGetAdminPending);

// ==========================================
// 3. ADMIN: Approve / Reject Action Handler
// POST /api/collaborations/admin/action/:id
// PUT  /api/collaborations/admin/requests/:id/status
// ==========================================
const handleAdminAction = async (req, res) => {
  try {
    const { id } = req.params;
    const actionInput = req.body.action || req.body.status;
    const adminNote = req.body.adminNote || req.body.adminMessage || '';

    let isAccept = false;
    if (actionInput === 'accept' || actionInput === 'accepted' || actionInput === 'approved') {
      isAccept = true;
    }

    const newStatus = isAccept ? 'approved' : 'rejected';
    const adminId = req.user?.id || null;

    // 🟢 UPDATED: also fetch project owner id + sender name, needed for the owner notification
    const [reqRows] = await db.query(
      `SELECT c.sender_id, p.title AS projectTitle, p.user_id AS ownerId, u.fullName AS senderName
       FROM collaborations c 
       JOIN projects p ON c.project_id = p.id 
       JOIN users u ON c.sender_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const { sender_id, projectTitle, ownerId, senderName } = reqRows[0];

    try {
      await db.execute(
        `UPDATE collaborations SET status = ?, admin_response = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [newStatus, adminNote, adminId, id]
      );
    } catch (colErr) {
      await db.execute(
        `UPDATE collaborations SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [newStatus, adminId, id]
      );
    }

    let notifMessage = isAccept 
      ? `Your collaboration request for project "${projectTitle}" has been APPROVED by Admin.`
      : `Your collaboration request for project "${projectTitle}" was DISMISSED by Admin.`;

    if (adminNote.trim()) {
      notifMessage += ` Admin Note: ${adminNote}`;
    }

    try {
      await db.execute(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'collaboration')`,
        [sender_id, notifMessage]
      );

      // 🟢 NEW: only on approval, also notify the project owner about the new collaborator
      if (isAccept) {
        await db.execute(
          `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'collaboration')`,
          [ownerId, `${senderName} has been approved to collaborate on your project "${projectTitle}".`]
        );
      }
    } catch (notifErr) {
      console.warn("Notification table insertion bypassed:", notifErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Request ${isAccept ? 'approved' : 'dismissed'} successfully!`,
    });
  } catch (err) {
    console.error('Error in handleAdminAction:', err);
    return res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};

router.post('/admin/action/:id', verifyToken, handleAdminAction);
router.put('/admin/requests/:id/status', verifyToken, handleAdminAction);

// ==========================================
// 4. USER: Send Collaboration Request
// POST /api/collaborations
// POST /api/collaborations/send
// ==========================================
const handleSendRequest = async (req, res) => {
  try {
    const project_id = req.body.project_id || req.body.projectId;
    const sender_id =
      req.body.sender_id ||
      req.body.senderId ||
      req.body.user_id ||
      req.userId ||
      req.user?.id;
    const message = req.body.message || null;

    if (!project_id || !sender_id) {
      return res.status(400).json({
        success: false,
        message: 'project_id and sender_id are required.',
      });
    }

    const [projectRows] = await db.query(
      'SELECT user_id, title FROM projects WHERE id = ?',
      [project_id]
    );

    if (projectRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.',
      });
    }

    if (Number(projectRows[0].user_id) === Number(sender_id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot send a collaboration request to your own project.',
      });
    }

    await db.execute(
      'INSERT INTO collaborations (project_id, sender_id, message, status) VALUES (?, ?, ?, ?)',
      [project_id, sender_id, message, 'pending_admin']
    );

    // 🟢 NEW: notify admins that a collaboration request needs review
    try {
      const [admins] = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
      if (admins.length > 0) {
        const notifValues = admins.map((a) => [
          a.id,
          `New collaboration request on project "${projectRows[0].title}" is awaiting your review.`,
          'collaboration',
        ]);
        await db.query(`INSERT INTO notifications (user_id, message, type) VALUES ?`, [notifValues]);
      }
    } catch (notifErr) {
      console.warn('Admin notification insertion bypassed:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Collaboration request submitted for Admin approval!',
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

router.post('/', verifyToken, handleSendRequest);
router.post('/send', verifyToken, handleSendRequest);

module.exports = router;