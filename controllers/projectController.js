const db = require('../config/db');

// 1. Browse ALL projects with Pagination, Category Filter & Search
exports.getBrowseProjects = async (req, res) => {
  try {
    console.log('ðŸ”¥ðŸ”¥ðŸ”¥ NEW CODE RUNNING â€” VERSION 2 ðŸ”¥ðŸ”¥ðŸ”¥'); // ðŸŸ¢ TEMPORARY debug marker

    const currentUserId = req.user?.id || req.query.current_user_id || req.query.user_id || 0;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const offset = (page - 1) * limit;

    const { category, search } = req.query;

    // ðŸŸ¢ FIX: sirf admin-approved projects hi public Discover page par dikhenge
    let whereConditions = ["p.status = 'approved'"];
    let queryParams = [];

    if (category && category !== 'All projects' && category !== 'All') {
      whereConditions.push('(p.category = ? OR p.industry = ?)');
      queryParams.push(category, category);
    }

    if (search && search.trim() !== '') {
      whereConditions.push('(p.title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)');
      const searchTerm = `%${search.trim()}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM projects p ${whereClause}`,
      queryParams
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit) || 1;

    const mainQueryParams = [currentUserId, currentUserId, ...queryParams];

    const [rows] = await db.query(
      `SELECT p.*,
              CASE WHEN p.user_id = ? THEN 1 ELSE 0 END AS isOwner,
              CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END AS hasRequested,
              c.status AS collaborationStatus
       FROM projects p
       LEFT JOIN collaborations c
              ON c.project_id = p.id AND c.sender_id = ?
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      mainQueryParams
    );

    console.log(`ðŸ”¥ Query returned ${rows.length} rows, WHERE clause: ${whereClause}`); // ðŸŸ¢ TEMPORARY debug marker

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalProjects,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 2. Only the logged-in user's own projects
exports.getMyProjects = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 3. Create Project
exports.createProject = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { title, description, category, industry, stage, location, looking_for, match_score, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const tagsJson = tags ? JSON.stringify(tags) : JSON.stringify([]);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, title, description, category, industry, stage, location, looking_for, match_score, tags, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [user_id, title, description, category || null, industry || null, stage || null, location || null, looking_for || null, match_score || 90, tagsJson]
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully!',
      projectId: result.insertId
    });
  } catch (error) {
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 4. Update Project
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
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 5. Delete Project
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
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
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
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
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
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};

// 8. Get Saved Projects (with pagination)
exports.getSavedProjects = async (req, res) => {
  try {
    const user_id = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const offset = (page - 1) * limit;

    // Query 1: Total saved projects count for this user
    const [countRows] = await db.execute(
      'SELECT COUNT(*) AS total FROM saved_projects WHERE user_id = ?',
      [user_id]
    );
    const totalProjects = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalProjects / limit) || 1;

    // Query 2: Paginated saved projects
    const [rows] = await db.query(
      `SELECT p.*, sp.created_at AS saved_at 
       FROM saved_projects sp 
       JOIN projects p ON sp.project_id = p.id 
       WHERE sp.user_id = ? 
       ORDER BY sp.created_at DESC
       LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
      [user_id]
    );

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        totalProjects,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('REAL DB ERROR:', error); res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
  }
};
