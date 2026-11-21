const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../controllers/authController');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// GET /api/admin/users?q=
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const like = `%${q}%`;

    const [rows] = await db.query(
      `SELECT u.id,
              u.fullName,
              u.fullName AS name,
              u.email,
              u.role,
              u.created_at,
              u.created_at AS joined_at,
              u.is_suspended,
              IF(u.is_suspended = 1, 'suspended', 'active') AS status,
              COUNT(p.id) AS project_count
       FROM users u
       LEFT JOIN projects p ON p.user_id = u.id
       WHERE (? = '' OR u.fullName LIKE ? OR u.email LIKE ? OR u.role LIKE ?)
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      [q, like, like, like]
    );

    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
});

module.exports = router;