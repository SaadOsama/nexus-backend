const db = require('../config/db');

// Audit helper: conn dein to wahi transaction use hogi
const logAdminAction = async (
  { adminId, action, targetType, targetId, summary, details = null },
  conn = db
) => {
  await conn.query(
    `INSERT INTO audit_log (admin_id, action, target_type, target_id, summary, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, action, targetType, targetId, String(summary).slice(0, 255), details]
  );
};
exports.logAdminAction = logAdminAction;

// GET /admin/projects?q=&status=&page=
exports.listProjects = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const offset = (page - 1) * limit;
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();

    const where = ["p.status <> 'draft'"];
    const params = [];
    if (status && status !== 'all') {
      where.push('p.status = ?');
      params.push(status);
    }
    if (q) {
      where.push('(p.title LIKE ? OR u.fullName LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    const w = `WHERE ${where.join(' AND ')}`;

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM projects p JOIN users u ON u.id = p.user_id ${w}`,
      params
    );
    const [rows] = await db.query(
      `SELECT p.id, p.title, p.industry, p.stage, p.status, p.is_featured, p.created_at,
              u.id AS ownerId, u.fullName AS ownerName
       FROM projects p JOIN users u ON u.id = p.user_id
       ${w}
       ORDER BY p.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: { total, totalPages: Math.ceil(total / limit) || 1, currentPage: page },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server Error: ' + e.message });
  }
};

// POST /admin/projects/:id/unpublish   body: { reason }
exports.unpublishProject = async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || '').trim();

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }
  if (reason.length < 3) {
    return res.status(400).json({ success: false, message: 'A reason is required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, user_id, title, status FROM projects WHERE id = ? FOR UPDATE',
      [id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const p = rows[0];
    if (p.status !== 'approved') {
      await conn.rollback();
      return res
        .status(409)
        .json({ success: false, message: 'Only published projects can be unpublished.' });
    }

    await conn.query(
      `UPDATE projects
       SET status = 'changes_requested', admin_response = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reason, req.user.id, id]
    );

    await conn.query(
      `INSERT INTO notifications (user_id, project_id, message, type) VALUES (?, ?, ?, 'project')`,
      [p.user_id, id, `Your project "${p.title}" was unpublished. Reason: ${reason}`]
    );

    await logAdminAction(
      {
        adminId: req.user.id,
        action: 'unpublish',
        targetType: 'project',
        targetId: id,
        summary: `Unpublished project "${p.title}"`,
        details: reason,
      },
      conn
    );

    await conn.commit();
    res.json({ success: true, message: 'Project unpublished.' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Server Error: ' + e.message });
  } finally {
    conn.release();
  }
};

// GET /admin/users?q=
exports.listUsers = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const params = [];
    let w = '';
    if (q) {
      w = 'WHERE (u.fullName LIKE ? OR u.email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const [rows] = await db.query(
      `SELECT u.id, u.fullName, u.email, u.role, u.created_at, u.is_suspended,
              (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.status <> 'draft') AS projectCount
       FROM users u ${w}
       ORDER BY u.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server Error: ' + e.message });
  }
};

// Suspend / Reactivate (server par admin aur self ke checks)
const setSuspended = (suspend) => async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }
  try {
    const [rows] = await db.query(
      'SELECT id, fullName, role, is_suspended FROM users WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const u = rows[0];

    if (suspend) {
      if (Number(id) === Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'You cannot suspend yourself.' });
      }
      if (u.role === 'admin') {
        return res.status(403).json({ success: false, message: 'Admins cannot be suspended.' });
      }
    }
    if (Boolean(u.is_suspended) === suspend) {
      return res
        .status(409)
        .json({ success: false, message: suspend ? 'Already suspended.' : 'Already active.' });
    }

    await db.query('UPDATE users SET is_suspended = ? WHERE id = ?', [suspend ? 1 : 0, id]);

    await logAdminAction({
      adminId: req.user.id,
      action: suspend ? 'suspend_user' : 'reactivate_user',
      targetType: 'user',
      targetId: id,
      summary: `${suspend ? 'Suspended' : 'Reactivated'} user ${u.fullName}`,
    });

    res.json({ success: true, message: suspend ? 'User suspended.' : 'User reactivated.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server Error: ' + e.message });
  }
};
exports.suspendUser = setSuspended(true);
exports.reactivateUser = setSuspended(false);

// GET /admin/activity  (Overview panel)
exports.getActivity = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.summary, a.details, a.created_at,
              u.fullName AS adminName
       FROM audit_log a LEFT JOIN users u ON u.id = a.admin_id
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT 15`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server Error: ' + e.message });
  }
};