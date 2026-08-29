const db = require('../config/db');

// 1. Browse ALL projects (own + others), each flagged with isOwner /
// hasRequested so the frontend knows exactly when to disable the
// "Request Collaboration" button (requirement #2 and #6) without a
// separate round trip per card.
exports.getBrowseProjects = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const [rows] = await db.execute(
      `SELECT p.*,
              CASE WHEN p.user_id = ? THEN 1 ELSE 0 END AS isOwner,
              CASE WHEN cr.id IS NOT NULL THEN 1 ELSE 0 END AS hasRequested
       FROM projects p
       LEFT JOIN collaboration_requests cr
              ON cr.project_id = p.id AND cr.sender_id = ?
       ORDER BY p.created_at DESC`,
      [currentUserId, currentUserId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 2. Only the logged-in user's own projects — requirement #1 / #3.
// Deliberately ignores any :userId param and uses req.user.id from the
// verified token, so one user can never fetch another user's "my
// projects" list by editing the URL.
exports.getMyProjects = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 3. Create Project — user_id comes from the verified token, never from
// the request body, so a user can only ever publish as themselves.
exports.createProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { title, description, category, industry, stage, location, looking_for, match_score, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const tagsJson = tags ? JSON.stringify(tags) : JSON.stringify([]);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, title, description, category, industry, stage, location, looking_for, match_score, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, category || null, industry || null, stage || null, location || null, looking_for || null, match_score || 90, tagsJson]
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully!',
      projectId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 4. Update Project — only the owner may update.
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, industry, stage, location, looking_for, tags } = req.body;

    const [existing] = await db.execute('SELECT user_id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only edit your own projects.' });
    }

    const tagsJson = tags ? JSON.stringify(tags) : null;

    await db.execute(
      `UPDATE projects 
       SET title = COALESCE(?, title), 
           description = COALESCE(?, description), 
           category = COALESCE(?, category), 
           industry = COALESCE(?, industry), 
           stage = COALESCE(?, stage), 
           location = COALESCE(?, location), 
           looking_for = COALESCE(?, looking_for), 
           tags = COALESCE(?, tags) 
       WHERE id = ?`,
      [title || null, description || null, category || null, industry || null, stage || null, location || null, looking_for || null, tagsJson, id]
    );

    res.status(200).json({ success: true, message: 'Project updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 5. Delete Project — only the owner may delete.
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT user_id FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (existing[0].user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only delete your own projects.' });
    }

    await db.execute('DELETE FROM projects WHERE id = ?', [id]);
    res.status(200).json({ success: true, message: 'Project deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 6. Save Project
exports.saveProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { project_id } = req.body;

    if (!project_id) {
      return res.status(400).json({ success: false, message: 'project_id is required.' });
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

// 8. Get Saved Projects for the logged-in user
exports.getSavedProjects = async (req, res) => {
  try {
    const user_id = req.user.id;
    const [rows] = await db.execute(
      `SELECT p.*, sp.created_at AS saved_at 
       FROM saved_projects sp 
       JOIN projects p ON sp.project_id = p.id 
       WHERE sp.user_id = ? 
       ORDER BY sp.created_at DESC`,
      [user_id]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};
