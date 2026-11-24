// db.js (Backend)
const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nexus_db',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// ---- Auto schema check for projects table (runs once on startup) ----
async function columnExists(table, col) {
  const [rows] = await db.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, col]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(col, definition) {
  if (!(await columnExists('projects', col))) {
    await db.query(`ALTER TABLE projects ADD COLUMN \`${col}\` ${definition}`);
    console.log(`[schema] added projects.${col}`);
  }
}

async function ensureProjectsSchema() {
  try {
    await addColumnIfMissing('looking_for', 'VARCHAR(255) NULL');
    await addColumnIfMissing('funding_requirement', 'VARCHAR(30) NULL');
    await addColumnIfMissing('admin_response', 'TEXT NULL');
    await addColumnIfMissing('reviewed_by', 'INT NULL');
    await addColumnIfMissing('reviewed_at', 'DATETIME NULL');
    await addColumnIfMissing('submitted_at', 'DATETIME NULL');

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

// Server start hote hi chalega, app.listen mein koi change nahi chahiye
db.ready = ensureProjectsSchema();

module.exports = db;