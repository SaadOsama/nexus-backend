const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/projects — fetch all projects
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

// POST /api/projects — create a new project (used by the Publish modal)
router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      title,
      description,
      category,
      industry,
      stage,
      location,
      looking_for,
      match_score,
      tags,
    } = req.body;

    if (!user_id || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'User ID, title, and description are required.',
      });
    }

    const tagsJson = tags ? JSON.stringify(tags) : JSON.stringify([]);

    const [result] = await db.execute(
      `INSERT INTO projects (user_id, title, description, category, industry, stage, location, looking_for, match_score, tags) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        title,
        description,
        category || null,
        industry || null,
        stage || null,
        location || null,
        looking_for || null,
        match_score || 90,
        tagsJson,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Project created successfully!',
      projectId: result.insertId,
    });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
  }
});

module.exports = router;
