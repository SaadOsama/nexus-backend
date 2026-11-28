const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');
const { REVIEW_ACTIONS } = require('../utils/ProjectRules');

const { MAX_FEATURED_SLOTS, IS_FEATURED_SQL } = require('../utils/featured');

// Admin-only guard
const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
  next();
};

// Expire ho chuke featured projects ko automatically non-featured kar deta hai
const clearExpiredFeatured = (executor = db) =>
  executor.query(
    `UPDATE projects
     SET is_featured = 0, featured_at = NULL, featured_until = NULL
     WHERE is_featured = 1 AND featured_until IS NOT NULL AND featured_until < CURDATE()`
  );

// GET /api/projects: sirf approved projects (featured pehle)
router.get('/', projectController.getBrowseProjects);

// Saved Projects
router.post('/save', verifyToken, projectController.saveProject);
router.post('/unsave', verifyToken, projectController.unsaveProject);
router.get('/saved', verifyToken, projectController.getSavedProjects);

// GET /api/projects/mine: sirf apne projects (drafts samet), admin_response card par dikhane ke liye
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const offset = (page - 1) * limit;

    const [countRows] = await db.query(
      'SELECT COUNT(*) AS total FROM projects WHERE user_id = ?',
      [userId]
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit);

    const [rows] = await db.query(
      `SELECT p.*,
              ${IS_FEATURED_SQL} AS is_featured,
              1 AS isOwner,
              CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS hasRequested
       FROM projects p
       LEFT JOIN collaborations c
         ON c.project_id = p.id AND c.sender_id = ?
       WHERE p.user_id = ?
       ORDER BY ${IS_FEATURED_SQL} DESC, p.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [userId, userId]
    );

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

// Create (draft ya submit): controller wala
router.post('/', verifyToken, projectController.createProject);
router.post('/publish', verifyToken, projectController.createProject);

// ==========================================
// ADMIN: All projects list (drafts nahi dikhte)
// GET /api/projects/admin/all?status=all&page=1&limit=100
// ==========================================
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await clearExpiredFeatured();

    const status = req.query.status || 'all';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const offset = (page - 1) * limit;

    const params = [];
    let whereSql = "WHERE p.status <> 'draft'";

    if (['pending', 'approved', 'rejected', 'changes_requested'].includes(status)) {
      whereSql = 'WHERE p.status = ?';
      params.push(status);
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM projects p ${whereSql}`,
      params
    );

    const [rows] = await db.query(
      `SELECT p.*,
              DATE_FORMAT(p.featured_until, '%Y-%m-%d') AS featured_until,
              u.fullName AS ownerName, u.email AS ownerEmail
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereSql}
       ORDER BY p.is_featured DESC, p.featured_at DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ featuredCount }]] = await db.query(
      `SELECT COUNT(*) AS featuredCount FROM projects WHERE is_featured = 1`
    );

    res.json({
      success: true,
      data: rows,
      featuredCount,
      maxFeaturedSlots: MAX_FEATURED_SLOTS,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (err) {
    console.error('Error fetching all admin projects:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// ADMIN: Simple toggle (purana route, rehne diya)
// PATCH /api/projects/admin/feature/:id
// ==========================================
router.patch('/admin/feature/:id', verifyToken, verifyAdmin, async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await clearExpiredFeatured(conn);

    const [[project]] = await conn.query(
      'SELECT id, title, user_id, status, is_featured FROM projects WHERE id = ? FOR UPDATE',
      [projectId]
    );

    if (!project) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const nextFeatured = Number(project.is_featured) === 1 ? 0 : 1;

    if (nextFeatured === 1 && project.status !== 'approved') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only approved projects can be marked as Featured.',
      });
    }

    if (nextFeatured === 1) {
      const [[{ count }]] = await conn.query(
        'SELECT COUNT(*) AS count FROM projects WHERE is_featured = 1 AND id != ?',
        [projectId]
      );
      if (count >= MAX_FEATURED_SLOTS) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FEATURED_SLOTS} featured slots allowed. Unfeature one project first.`,
        });
      }
    }

    await conn.query(
      `UPDATE projects
       SET is_featured = ?, featured_at = ${nextFeatured === 1 ? 'NOW()' : 'NULL'}, featured_until = NULL
       WHERE id = ?`,
      [nextFeatured, projectId]
    );

    const [[{ featuredCount }]] = await conn.query(
      'SELECT COUNT(*) AS featuredCount FROM projects WHERE is_featured = 1'
    );

    await conn.commit();

    res.json({
      success: true,
      message: nextFeatured === 1 ? 'Project marked as Featured!' : 'Project removed from Featured.',
      data: {
        id: projectId,
        is_featured: nextFeatured,
        featuredCount,
        maxFeaturedSlots: MAX_FEATURED_SLOTS,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error toggling project featured status:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// ADMIN: Set/Toggle Featured (+ optional expiry date, max 6 active)
// PATCH /api/projects/admin/featured/:id   body: { featured, featured_until }
// ==========================================
router.patch('/admin/featured/:id', verifyToken, verifyAdmin, async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await clearExpiredFeatured(conn);

    const [[project]] = await conn.query(
      'SELECT id, status, is_featured FROM projects WHERE id = ? FOR UPDATE',
      [projectId]
    );
    if (!project) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const { featured, featured_until } = req.body;
    const nextFeatured =
      typeof featured === 'undefined'
        ? (Number(project.is_featured) === 1 ? 0 : 1)
        : (featured === true || featured === 'true' || featured === 1 || featured === '1' ? 1 : 0);

    const until =
      nextFeatured === 1 && /^\d{4}-\d{2}-\d{2}$/.test(featured_until || '') ? featured_until : null;

    if (nextFeatured === 1 && project.status !== 'approved') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Only approved projects can be marked as Featured.' });
    }

    if (nextFeatured === 1) {
      const [[{ count }]] = await conn.query(
        'SELECT COUNT(*) AS count FROM projects WHERE is_featured = 1 AND id != ?',
        [projectId]
      );
      if (count >= MAX_FEATURED_SLOTS) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: `Maximum ${MAX_FEATURED_SLOTS} active featured projects allowed at once. Unfeature one first.`,
        });
      }
    }

    await conn.query(
      `UPDATE projects
       SET is_featured = ?,
           featured_at = CASE WHEN ? = 1 THEN COALESCE(featured_at, NOW()) ELSE NULL END,
           featured_until = ?
       WHERE id = ?`,
      [nextFeatured, nextFeatured, until, projectId]
    );

    const [[{ featuredCount }]] = await conn.query(
      'SELECT COUNT(*) AS featuredCount FROM projects WHERE is_featured = 1'
    );

    await conn.commit();
    res.json({
      success: true,
      message: nextFeatured === 1 ? 'Project marked as Featured!' : 'Project removed from Featured.',
      data: {
        id: projectId,
        is_featured: nextFeatured,
        featured_until: until,
        featuredCount,
        maxFeaturedSlots: MAX_FEATURED_SLOTS,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error setting featured status:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// ADMIN: Pending queue (resubmitted project sab se upar)
// GET /api/projects/admin/pending
// ==========================================
router.get('/admin/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, u.fullName AS ownerName, u.email AS ownerEmail
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.status = 'pending'
       ORDER BY p.submitted_at DESC, p.id DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching pending projects:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// ADMIN: Dashboard stats + recent activity
// GET /api/projects/admin/stats
// ==========================================
router.get('/admin/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await clearExpiredFeatured();

    const [[{ totalUsers }]] = await db.query(`SELECT COUNT(*) AS totalUsers FROM users`);

    const [[{ totalApprovedProjects }]] = await db.query(
      `SELECT COUNT(*) AS totalApprovedProjects FROM projects WHERE status = 'approved'`
    );

    const [[{ pendingProjects }]] = await db.query(
      `SELECT COUNT(*) AS pendingProjects FROM projects WHERE status = 'pending'`
    );

    const [[{ featuredProjects }]] = await db.query(
      `SELECT COUNT(*) AS featuredProjects FROM projects WHERE is_featured = 1`
    );

    const [[{ pendingCollaborations }]] = await db.query(
      `SELECT COUNT(*) AS pendingCollaborations FROM collaborations WHERE status IN ('pending', 'pending_admin')`
    );

    const [[{ newProjectsThisWeek }]] = await db.query(
      `SELECT COUNT(*) AS newProjectsThisWeek FROM projects
       WHERE status = 'approved' AND reviewed_at >= (NOW() - INTERVAL 7 DAY)`
    );

    const [[{ newUsersThisWeek }]] = await db.query(
      `SELECT COUNT(*) AS newUsersThisWeek FROM users
       WHERE created_at >= (NOW() - INTERVAL 7 DAY)`
    );

    const [[{ collabsApprovedThisWeek }]] = await db.query(
      `SELECT COUNT(*) AS collabsApprovedThisWeek FROM collaborations
       WHERE status = 'approved' AND reviewed_at >= (NOW() - INTERVAL 7 DAY)`
    );

    const recentActivity = [
      { message: `${newProjectsThisWeek} new project${newProjectsThisWeek === 1 ? '' : 's'} published this week` },
      { message: `${newUsersThisWeek} new user${newUsersThisWeek === 1 ? '' : 's'} joined this week` },
      { message: `${collabsApprovedThisWeek} collaboration${collabsApprovedThisWeek === 1 ? '' : 's'} approved this week` },
    ];

    res.json({
      success: true,
      data: {
        totalUsers,
        totalApprovedProjects,
        pendingProjects,
        featuredProjects,
        maxFeaturedSlots: MAX_FEATURED_SLOTS,
        pendingCollaborations,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// ADMIN: Review decision
// POST /api/projects/admin/action/:id
// body: { action: 'approve' | 'request_changes' | 'reject', adminNote }
// ==========================================
router.post('/admin/action/:id', verifyToken, verifyAdmin, async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid project ID.' });
  }

  // purane frontend ke naam bhi chalte hain
  let action = req.body.action;
  if (action === 'accepted' || action === 'approved') action = 'approve';
  if (action === 'rejected') action = 'reject';

  const newStatus = REVIEW_ACTIONS[action];
  if (!newStatus) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
  }

  const note = String(req.body.adminNote ?? req.body.adminMessage ?? req.body.note ?? '').trim();
  if (action !== 'approve' && !note) {
    return res.status(400).json({ success: false, message: 'A note is required for this action.' });
  }

  const adminId = req.user.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [[project]] = await conn.query(
      'SELECT id, user_id, title, status FROM projects WHERE id = ? FOR UPDATE',
      [projectId]
    );
    if (!project) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (project.status !== 'pending') {
      await conn.rollback();
      return res.status(409).json({ success: false, message: 'This project is not awaiting review.' });
    }

    const clearFeatured = action === 'approve'
      ? ''
      : ', is_featured = 0, featured_at = NULL, featured_until = NULL';

    await conn.query(
      `UPDATE projects
       SET status = ?, admin_response = ?, reviewed_by = ?, reviewed_at = NOW()${clearFeatured}
       WHERE id = ?`,
      [newStatus, note, adminId, projectId]
    );

    await conn.query(
      `INSERT INTO project_reviews (project_id, admin_id, action, note) VALUES (?, ?, ?, ?)`,
      [projectId, adminId, action, note || null]
    );

    let message;
    if (action === 'approve') {
      message = `Your project "${project.title}" has been APPROVED and is now live on Discover.`;
      if (note) message += ` Admin note: ${note}`;
    } else if (action === 'request_changes') {
      message = `Changes were requested on your project "${project.title}". Admin note: ${note}`;
    } else {
      message = `Your project "${project.title}" was REJECTED. Admin note: ${note}`;
    }

    await conn.query(
      `INSERT INTO notifications (user_id, project_id, message, type) VALUES (?, ?, ?, 'project')`,
      [project.user_id, projectId, message]
    );

    await conn.commit();
    res.json({ success: true, message: 'Decision saved.', status: newStatus });
  } catch (err) {
    await conn.rollback();
    console.error('Error in project admin action:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  } finally {
    conn.release();
  }
});

// ==========================================
// ADMIN: Review history (who, what, note, time), newest first
// GET /api/projects/admin/history/:id
// ==========================================
router.get('/admin/history/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid project ID.' });
    }

    const [rows] = await db.query(
      `SELECT r.id, r.action, r.note, r.created_at, r.admin_id, u.fullName AS adminName
       FROM project_reviews r
       LEFT JOIN users u ON u.id = r.admin_id
       WHERE r.project_id = ?
       ORDER BY r.created_at DESC, r.id DESC`,
      [projectId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching review history:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// ==========================================
// Owner routes: /:id wale routes HAMESHA file ke aakhir mein
// ==========================================
router.get('/:id', verifyToken, projectController.getProjectById);
router.put('/:id', verifyToken, projectController.updateProject);
router.delete('/:id', verifyToken, projectController.deleteProject);
router.post('/:id/submit', verifyToken, projectController.submitProject);

module.exports = router;
