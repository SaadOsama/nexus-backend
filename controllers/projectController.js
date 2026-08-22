const db = require('../config/db');

// 1. Get All Projects
exports.getAllProjects = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM projects ORDER BY created_at DESC');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 2. Get Project By User ID
exports.getProjectsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.execute('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 3. Create Project
exports.createProject = async (req, res) => {
  try {
    const { user_id, title, description, category, industry, stage, location, looking_for, match_score, tags } = req.body;

    if (!user_id || !title || !description) {
      return res.status(400).json({ success: false, message: 'User ID, title, and description are required.' });
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

// 4. Update Project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, industry, stage, location, looking_for, tags } = req.body;

    const tagsJson = tags ? JSON.stringify(tags) : null;

    const [result] = await db.execute(
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

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.status(200).json({ success: true, message: 'Project updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 5. Delete Project
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.execute('DELETE FROM projects WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.status(200).json({ success: true, message: 'Project deleted successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 6. Save Project
exports.saveProject = async (req, res) => {
  try {
    const { user_id, project_id } = req.body;

    if (!user_id || !project_id) {
      return res.status(400).json({ success: false, message: 'user_id and project_id are required.' });
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
    const { user_id, project_id } = req.body;

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

// 8. Get Saved Projects By User ID
exports.getSavedProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await db.execute(
      `SELECT p.*, sp.created_at AS saved_at 
       FROM saved_projects sp 
       JOIN projects p ON sp.project_id = p.id 
       WHERE sp.user_id = ? 
       ORDER BY sp.created_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};