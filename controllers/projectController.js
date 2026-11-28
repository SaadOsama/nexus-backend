const db = require('../config/db');
const { OWNER_EDITABLE, OWNER_DELETABLE, OWNER_SUBMITTABLE } = require('../utils/ProjectRules');
const { IS_FEATURED_SQL } = require('../utils/featured');
const {
  validateProjectFields, serializeProject, normalizeStage,
} = require('../utils/projectFields');

const failValidation = (res, errors) =>
  res.status(400).json({ success: false, message: Object.values(errors)[0], errors });

const toList = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

// Sab admins ko "project review ke liye aaya" notification
const notifyAdmins = async (projectId, title, resubmitted = false) => {
  try {
    const [admins] = await db.query(`SELECT id FROM users WHERE role = 'admin'`);
    if (!admins.length) return;
    const msg = resubmitted
      ? `Project "${title}" was updated and resubmitted for review.`
      : `New project "${title}" was submitted and is awaiting your review.`;
    const values = admins.map((a) => [a.id, projectId, msg, 'project']);
    await db.query(
      `INSERT INTO notifications (user_id, project_id, message, type) VALUES ?`,
      [values]
    );
  } catch (e) {
    console.warn('Admin notification skipped:', e.message);
  }
};

// 1. Browse ALL approved projects: search, filters, sort, pagination
exports.getBrowseProjects = async (req, res) => {
  try {
    const currentUserId = req.user?.id || req.query.current_user_id || req.query.user_id || 0;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 6));
    const offset = (page - 1) * limit;

    const { search, q, featured, country, funding, sort } = req.query;
    const industries = toList(req.query.industry || req.query.category);
    // Purana "Growth" filter bhi "Scaling" se match karega
    const stages = toList(req.query.stage).map(normalizeStage).filter(Boolean);

    const where = ["p.status = 'approved'", "p.user_id NOT IN (SELECT id FROM users WHERE is_suspended = 1)"];
    const params = [];

    // Expiry read time par check hota hai
    if (featured === 'true' || featured === '1') where.push(IS_FEATURED_SQL);

    const realIndustries = industries.filter((i) => i !== 'All projects' && i !== 'All');
    if (realIndustries.length) {
      where.push('(p.category IN (?) OR p.industry IN (?))');
      params.push(realIndustries, realIndustries);
    }

    if (stages.length) {
      where.push('p.stage IN (?)');
      params.push(stages);
    }

    if (country && country.trim()) {
      where.push('p.location = ?');
      params.push(country.trim());
    }

    if (funding && funding.trim()) {
      where.push('p.funding_requirement = ?');
      params.push(funding.trim());
    }

    const keyword = (q || search || '').trim();
    if (keyword) {
      where.push(
        '(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.looking_for LIKE ? OR p.problem_statement LIKE ? OR p.tech_stack LIKE ?)'
      );
      const term = `%${keyword}%`;
      params.push(term, term, term, term, term, term);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    // Default sort: active featured pehle. Doosre sorts mein featured pin nahi hota.
    let orderBy = `${IS_FEATURED_SQL} DESC, p.featured_at DESC, p.created_at DESC`;
    if (sort === 'newest') orderBy = 'p.created_at DESC';
    if (sort === 'az') orderBy = 'p.title ASC, p.created_at DESC';

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM projects p ${whereClause}`,
      params
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit) || 1;

    const [rows] = await db.query(
      `SELECT p.*,
              ${IS_FEATURED_SQL} AS is_featured,
              CASE WHEN p.user_id = ? THEN 1 ELSE 0 END AS isOwner,
              CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS hasRequested,
              c.status AS collaborationStatus
       FROM projects p
       LEFT JOIN collaborations c
              ON c.project_id = p.id AND c.sender_id = ?
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [currentUserId, currentUserId, ...params]
    );

    res.status(200).json({
      success: true,
      data: rows.map(serializeProject),
      pagination: {
        totalProjects,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// Country dropdown: approved projects ki distinct locations
exports.getFilterOptions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT location FROM projects
       WHERE status = 'approved' AND location IS NOT NULL AND location <> ''
       ORDER BY location ASC`
    );
    res.json({ success: true, countries: rows.map((r) => r.location) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 2. Sirf logged-in user ke apne projects (drafts samet)
exports.getMyProjects = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.*, ${IS_FEATURED_SQL} AS is_featured
       FROM projects p
       WHERE p.user_id = ?
       ORDER BY ${IS_FEATURED_SQL} DESC, p.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json({ success: true, data: rows.map(serializeProject) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 3. Create: draft to draft, warna seedha review ke liye pending
exports.createProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const {
      title, category, industry, location,
      looking_for, match_score, tags, saveAsDraft,
    } = req.body;

    // saveAsDraft: true YA status: 'draft', dono ko draft maana jayega
    const isDraft =
      saveAsDraft === true || saveAsDraft === 'true' ||
      String(req.body.status || '').toLowerCase() === 'draft';

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    // Naye fields: draft par bhi galat value reject hogi
    const { errors, values, ok } = validateProjectFields(req.body);
    if (!ok) return failValidation(res, errors);

    if (!isDraft && !values.description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]);
    const status = isDraft ? 'draft' : 'pending';

    const [result] = await db.execute(
      `INSERT INTO projects
        (user_id, title, description, category, industry, stage, location, looking_for,
         funding_requirement, match_score, tags, status,
         problem_statement, tech_stack, required_skills, website, pitch_url, team_size,
         submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${isDraft ? 'NULL' : 'NOW()'})`,
      [
        user_id, String(title).trim(), values.description ?? '', category || null, industry || null,
        values.stage ?? null, location || null, looking_for || null, values.funding_requirement ?? null,
        match_score || 90, tagsJson, status,
        values.problem_statement ?? null, values.tech_stack ?? null, values.required_skills ?? null,
        values.website ?? null, values.pitch_url ?? null, values.team_size ?? null,
      ]
    );

    if (!isDraft) await notifyAdmins(result.insertId, String(title).trim());

    res.status(201).json({
      success: true,
      message: isDraft ? 'Draft saved.' : 'Project submitted for admin review!',
      projectId: result.insertId,
      status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// Read: owner, ya admin (admin ko draft nahi dikhta). Baqi sab ko 404
exports.getProjectById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const [rows] = await db.execute(
      `SELECT p.*, ${IS_FEATURED_SQL} AS is_featured, u.fullName AS ownerName
       FROM projects p LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ?`,
      [id]
    );
    const project = rows[0];
    const isOwner = project && Number(project.user_id) === Number(req.user.id);
    const isAdmin = req.user.role === 'admin' && project && project.status !== 'draft';

    if (!project || !(isOwner || isAdmin)) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.json({ success: true, data: serializeProject(project) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 4. Update: sirf owner, draft / changes_requested / rejected mein
exports.updateProject = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, category, industry, location, looking_for, tags } = req.body;

    const [existing] = await db.execute(
      'SELECT user_id, status, stage, funding_requirement FROM projects WHERE id = ?',
      [id]
    );
    if (!existing.length || Number(existing[0].user_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (!OWNER_EDITABLE.includes(existing[0].status)) {
      return res.status(409).json({ success: false, message: 'This project can no longer be edited.' });
    }

    const { errors, values, ok } = validateProjectFields(req.body, { partial: true, current: existing[0] });
    if (!ok) return failValidation(res, errors);

    const tagsJson = Array.isArray(tags) ? JSON.stringify(tags) : null;

    // Purane fields: khali aaye to purani value rehti hai
    const keep = {
      title: title || null,
      description: values.description ?? null,
      category: category || null,
      industry: industry || null,
      stage: values.stage ?? null,
      location: location || null,
      looking_for: looking_for || null,
      funding_requirement: values.funding_requirement ?? null,
      tags: tagsJson,
    };
    const sets = [];
    const params = [];
    for (const [col, val] of Object.entries(keep)) {
      sets.push(`${col} = COALESCE(?, ${col})`);
      params.push(val);
    }

    // Naye optional fields: bheje gaye to set honge, khali bheje to clear (NULL)
    for (const col of ['problem_statement', 'tech_stack', 'required_skills', 'website', 'pitch_url', 'team_size']) {
      if (col in values) {
        sets.push(`${col} = ?`);
        params.push(values[col]);
      }
    }

    // status aur user_id body se kabhi nahi liye jate
    await db.execute(
      `UPDATE projects SET ${sets.join(', ')}
       WHERE id = ? AND user_id = ? AND status IN ('draft','changes_requested','rejected')`,
      [...params, id, req.user.id]
    );

    res.status(200).json({ success: true, message: 'Project updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 5. Delete: sirf owner, sirf draft
exports.deleteProject = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [existing] = await db.execute('SELECT user_id, status FROM projects WHERE id = ?', [id]);
    if (!existing.length || Number(existing[0].user_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (!OWNER_DELETABLE.includes(existing[0].status)) {
      return res.status(409).json({ success: false, message: 'Only drafts can be deleted.' });
    }

    await db.execute(
      `DELETE FROM projects WHERE id = ? AND user_id = ? AND status = 'draft'`,
      [id, req.user.id]
    );
    res.status(200).json({ success: true, message: 'Draft deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// Submit / Resubmit: draft, changes_requested ya rejected se pending, submitted_at = abhi
exports.submitProject = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [existing] = await db.execute(
      'SELECT user_id, status, title, description FROM projects WHERE id = ?',
      [id]
    );
    if (!existing.length || Number(existing[0].user_id) !== Number(req.user.id)) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const p = existing[0];
    if (!OWNER_SUBMITTABLE.includes(p.status)) {
      return res.status(409).json({ success: false, message: 'This project cannot be submitted in its current state.' });
    }
    if (!p.title?.trim() || !p.description?.trim()) {
      return res.status(400).json({ success: false, message: 'Title and description are required before submitting.' });
    }

    const [result] = await db.execute(
      `UPDATE projects SET status = 'pending', submitted_at = NOW()
       WHERE id = ? AND user_id = ? AND status IN ('draft','changes_requested','rejected')`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(409).json({ success: false, message: 'This project cannot be submitted in its current state.' });
    }

    await notifyAdmins(id, p.title, p.status === 'changes_requested' || p.status === 'rejected');
    res.json({ success: true, message: 'Project submitted for review.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 6. Save Project: sirf approved project save ho sakta hai
exports.saveProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'project_id is required.' });
    }

    const [proj] = await db.execute('SELECT status FROM projects WHERE id = ?', [project_id]);
    if (!proj.length || proj[0].status !== 'approved') {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await db.execute(
      'INSERT INTO saved_projects (user_id, project_id) VALUES (?, ?)',
      [user_id, project_id]
    );

    res.status(201).json({ success: true, message: 'Project saved successfully!' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Project is already saved.' });
    }
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 7. Unsave Project
exports.unsaveProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { project_id } = req.body;

    const [result] = await db.execute(
      'DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?',
      [user_id, project_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Saved record not found.' });
    }

    res.status(200).json({ success: true, message: 'Project unsaved successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 8. Saved Projects (sirf approved, pagination ke saath)
exports.getSavedProjects = async (req, res) => {
  try {
    const user_id = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const offset = (page - 1) * limit;

    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total
       FROM saved_projects sp JOIN projects p ON sp.project_id = p.id
       WHERE sp.user_id = ? AND p.status = 'approved' AND p.user_id NOT IN (SELECT id FROM users WHERE is_suspended = 1)`,
      [user_id]
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit) || 1;

    const [rows] = await db.query(
      `SELECT p.*, ${IS_FEATURED_SQL} AS is_featured, sp.created_at AS saved_at
       FROM saved_projects sp
       JOIN projects p ON sp.project_id = p.id
       WHERE sp.user_id = ? AND p.status = 'approved' AND p.user_id NOT IN (SELECT id FROM users WHERE is_suspended = 1)
       ORDER BY sp.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      data: rows.map(serializeProject),
      pagination: {
        totalProjects,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};
