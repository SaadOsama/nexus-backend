async function columnExists(db, table, col) {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(db, col, definition) {
      await addColumnIfMissing(db, 'problem_statement', 'VARCHAR(500) NULL AFTER description');
    await addColumnIfMissing(db, 'tech_stack', 'LONGTEXT NULL');
    await addColumnIfMissing(db, 'required_skills', 'LONGTEXT NULL');
    await addColumnIfMissing(db, 'website', 'VARCHAR(500) NULL');
    await addColumnIfMissing(db, 'pitch_url', 'VARCHAR(500) NULL');
    await addColumnIfMissing(db, 'team_size', 'SMALLINT UNSIGNED NULL');
    await db.query(`UPDATE projects SET stage = 'Scaling' WHERE stage = 'Growth'`);
  if (!(await columnExists(db, 'projects', col))) {
    await db.query(`ALTER TABLE projects ADD COLUMN \`${col}\` ${definition}`);
    console.log(`[schema] added projects.${col}`);
  }
}

async function ensureProjectsSchema(db) {
  try {
    await addColumnIfMissing(db, 'looking_for', 'VARCHAR(255) NULL');
    await addColumnIfMissing(db, 'funding_requirement', 'VARCHAR(30) NULL');
    await addColumnIfMissing(db, 'admin_response', 'TEXT NULL');
    await addColumnIfMissing(db, 'reviewed_by', 'INT NULL');
    await addColumnIfMissing(db, 'reviewed_at', 'DATETIME NULL');
    await addColumnIfMissing(db, 'submitted_at', 'DATETIME NULL');

    await db.query(`ALTER TABLE projects MODIFY COLUMN description TEXT NULL`);

    await db.query(
      `ALTER TABLE projects MODIFY COLUMN status
       ENUM('pending','approved','rejected','draft','changes_requested')
       NOT NULL DEFAULT 'pending'`
    );

    console.log('[schema] projects table OK');
  } catch (err) {
    console.error('[schema] ensureProjectsSchema failed:', err.message);
  }
}

module.exports = ensureProjectsSchema;