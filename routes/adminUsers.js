const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../controllers/authController');
const { logAudit } = require('../utils/audit');

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

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ success: false, message: 'Failed to load users.' });
  }
});

// PATCH /api/admin/users/:id/status   body: { suspended: true|false } or { status: 'suspended'|'active' }
router.patch('/users/:id/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }

    let suspend;
    if (typeof req.body.suspended === 'boolean') {
      suspend = req.body.suspended;
    } else if (req.body.status === 'suspended' || req.body.status === 'active') {
      suspend = req.body.status === 'suspended';
    } else {
      return res.status(400).json({ success: false, message: 'Send suspended (true/false) or status.' });
    }

    if (targetId === req.user.id) {
      return res.status(403).json({ success: false, message: 'You cannot suspend yourself.' });
    }

    const [rows] = await db.query('SELECT id, fullName, role FROM users WHERE id = ?', [targetId]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (rows[0].role === 'admin') {
      return res.status(403).json({ success: false, message: 'You cannot suspend an admin.' });
    }

    await db.query('UPDATE users SET is_suspended = ? WHERE id = ?', [suspend ? 1 : 0, targetId]);

    await logAudit({
      adminId: req.user.id,
      action: suspend ? 'user_suspended' : 'user_reactivated',
      targetType: 'user',
      targetId,
      summary: `${suspend ? 'Suspended' : 'Reactivated'} user ${rows[0].fullName} (#${targetId})`,
    });

    res.json({
      success: true,
      id: targetId,
      is_suspended: suspend ? 1 : 0,
      status: suspend ? 'suspended' : 'active',
    });
  } catch (err) {
    console.error('PATCH /api/admin/users/:id/status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

module.exports = router;