const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');
const c = require('../controllers/adminConsoleController');
const MAX_FEATURED_SLOTS = 6;

// GET /api/admin/projects?status=all
router.get('/admin/projects', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const params = [];
    let whereSql = '';

    if (['pending', 'approved', 'rejected'].includes(status)) {
      whereSql = 'WHERE p.status = ?';
      params.push(status);
    }

    const [projects] = await pool.query(
      `SELECT
         p.id,
         p.user_id,
         p.title,
         p.category,
         p.industry,
         p.stage,
         p.location,
         p.status,
         p.is_featured,
         p.featured_at,
         p.created_at,
         u.fullName AS owner_name,
         u.email AS owner_email
       FROM projects p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereSql}
       ORDER BY p.is_featured DESC, p.created_at DESC`,
      params
    );

    const [[{ featuredCount }]] = await pool.query(
      'SELECT COUNT(*) AS featuredCount FROM projects WHERE is_featured = 1'
    );

    return res.json({
      projects,
      total: projects.length,
      featuredCount,
      maxFeaturedSlots: MAX_FEATURED_SLOTS,
    });
  } catch (err) {
    console.error('GET /api/admin/projects error:', err);
    return res.status(500).json({ message: 'Failed to load admin projects' });
  }
});

// PATCH /api/admin/projects/:id/feature
router.patch('/admin/projects/:id/feature', verifyToken, requireAdmin, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId <= 0) {
      conn.release();
      return res.status(400).json({ message: 'Invalid project ID' });
    }

    await conn.beginTransaction();

    const [[project]] = await conn.query(
      'SELECT id, status, is_featured FROM projects WHERE id = ? FOR UPDATE',
      [projectId]
    );

    if (!project) {
      await conn.rollback();
      return res.status(404).json({ message: 'Project not found' });
    }

    const nextFeatured = project.is_featured === 1 ? 0 : 1;

    if (nextFeatured === 1 && project.status !== 'approved') {
      await conn.rollback();
      return res.status(400).json({ message: 'Only approved projects can be featured' });
    }

    if (nextFeatured === 1) {
      const [[{ count }]] = await conn.query(
        'SELECT COUNT(*) AS count FROM projects WHERE is_featured = 1 AND id != ?',
        [projectId]
      );
      if (count >= MAX_FEATURED_SLOTS) {
        await conn.rollback();
        return res.status(400).json({
          message: `Maximum ${MAX_FEATURED_SLOTS} featured slots allowed. Unfeature one first.`,
        });
      }
    }

    await conn.query(
      `UPDATE projects
       SET is_featured = ?, featured_at = ${nextFeatured === 1 ? 'NOW()' : 'NULL'}
       WHERE id = ?`,
      [nextFeatured, projectId]
    );

    const [[{ featuredCount }]] = await conn.query(
      'SELECT COUNT(*) AS featuredCount FROM projects WHERE is_featured = 1'
    );

    await c.logAdminAction(
      {
        adminId: req.user.id,
        action: nextFeatured === 1 ? 'feature_project' : 'unfeature_project',
        targetType: 'project',
        targetId: projectId,
        summary: `${nextFeatured === 1 ? 'Featured' : 'Unfeatured'} project #${projectId}`,
      },
      conn
    );

    await conn.commit();

    return res.json({
      id: projectId,
      is_featured: nextFeatured,
      featuredCount,
      maxFeaturedSlots: MAX_FEATURED_SLOTS,
    });
  } catch (err) {
    await conn.rollback();
    console.error('PATCH /api/admin/projects/:id/feature error:', err);
    return res.status(500).json({ message: 'Failed to toggle featured status' });
  } finally {
    conn.release();
  }
});

// ---- Admin console v1 ----
router.get('/admin/console/projects', verifyToken, requireAdmin, c.listProjects);
router.post('/admin/console/projects/:id/unpublish', verifyToken, requireAdmin, c.unpublishProject);
router.get('/admin/console/users', verifyToken, requireAdmin, c.listUsers);
router.post('/admin/console/users/:id/suspend', verifyToken, requireAdmin, c.suspendUser);
router.post('/admin/console/users/:id/reactivate', verifyToken, requireAdmin, c.reactivateUser);
router.get('/admin/console/activity', verifyToken, requireAdmin, c.getActivity);

module.exports = router;