const db = require('../config/db');

// Startup par zaroori columns bana deta hai (agar pehle se hon to skip karta hai).
module.exports = async function ensureSchema() {
  try {
    await db.query('ALTER TABLE users ADD COLUMN is_suspended TINYINT(1) NOT NULL DEFAULT 0');
    console.log('Schema: added users.is_suspended');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      console.log('Schema: users.is_suspended already exists');
    } else {
      console.warn('Schema check failed:', err.message);
    }
  }
};