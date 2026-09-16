const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');

// 🟢 NEW: Admin-only guard, same pattern jo collaborationRoutes me hai
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// GET /api/projects — sirf approved projects (public browse)
router.get('/', projectController.getBrowseProjects);

// Saved Projects Routes
router.post('/save', verifyToken, projectController.saveProject);
router.post('/unsave', verifyToken, projectController.unsaveProject);
router.get('/saved', verifyToken, projectController.getSavedProjects);

// GET /api/projects/mine — status aur admin_response already aayenge (p.* me included hain)
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const offset = (page - 1) * limit;

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM projects WHERE user_id = ?',
      [userId]
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit);

    const query = `
      SELECT 
        p.*,
        1 AS isOwner,
        CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS hasRequested
      FROM projects p
      LEFT JOIN collaborations c 
        ON c.project_id = p.id AND c.sender_id = ?
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;

    const [rows] = await db.query(query, [userId, userId]);

    res.json({
      success: true,
      data: rows,
      pagination: {
        totalProjects, totalPages, currentPage: page, limit,
        hasNextPage: page < totalPages, hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error('Error fetching user projects:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// 🟢 FIX: ab verifyToken required hai, aur project hamesha 'pending' status se banta hai
const createProject = async (req, res) => {
  try {
    const user_id = req.user.id; // 🟢 token se aata hai, body se trust nahi karte ab
    const {
      title, description, category, industry, stage,
      location, looking_for, match_score, tags,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.',
      });
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]);

    const query = `
      INSERT INTO projects (user_id, title, description, category, industry, stage, location, looking_for, match_score, tags, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const [result] = await db.execute(query, [
      user_id, title, description, category || null, industry || null,
      stage || null, location || null, looking_for || null, match_score || 90, tagsJson,
    ]);

    res.status(201).json({
      success: true,
      message: 'Project submitted for admin review!',
      projectId: result.insertId,
    });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
};

router.post('/', verifyToken, createProject);
router.post('/publish', verifyToken, createProject);

// ==========================================
// 🟢 NEW: ADMIN — Pending projects queue
// GET /api/projects/admin/pending
// ==========================================
router.get('/admin/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.fullName AS ownerName, u.email AS ownerEmail
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching pending projects:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// 🟢 NEW: ADMIN — Approve / Reject a project (+ notification)
// POST /api/projects/admin/action/:id   body: { action: 'approve'|'reject', adminNote }
// ==========================================
router.post('/admin/action/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const actionInput = req.body.action;
    const adminNote = req.body.adminNote || req.body.adminMessage || '';
    const isAccept = actionInput === 'approve' || actionInput === 'accepted' || actionInput === 'approved';
    const newStatus = isAccept ? 'approved' : 'rejected';
    const adminId = req.user?.id || null;

    const [projRows] = await db.query('SELECT user_id, title FROM projects WHERE id = ?', [id]);
    if (projRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const { user_id: ownerId, title } = projRows[0];

    await db.execute(
      `UPDATE projects SET status = ?, admin_response = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [newStatus, adminNote, adminId, id]
    );

    let notifMessage = isAccept
      ? `Your project "${title}" has been APPROVED and is now live on Discover.`
      : `Your project "${title}" was REJECTED by Admin.`;
    if (adminNote.trim()) {
      notifMessage += ` Admin Note: ${adminNote}`;
    }

    try {
      await db.execute(
        `INSERT INTO notifications (user_id, message, type) VALUES (?, ?, 'project')`,
        [ownerId, notifMessage]
      );
    } catch (notifErr) {
      console.warn('Notification insertion bypassed:', notifErr.message);
    }

    res.json({ success: true, message: `Project ${isAccept ? 'approved' : 'rejected'} successfully!` });
  } catch (err) {
    console.error('Error in project admin action:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

module.exports = router;