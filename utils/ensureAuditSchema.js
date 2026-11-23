const db = require('../config/db');

// Server start par audit_log aur uska details column ensure karta hai (sirf agar missing ho)
module.exports = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT(11) NOT NULL AUTO_INCREMENT,
        admin_id INT(11) NULL,
        action VARCHAR(50) NOT NULL,
        target_type VARCHAR(30) NOT NULL,
        target_id INT(11) NULL,
        summary VARCHAR(255) NOT NULL,
        details TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_audit_created (created_at)
      )
    `);

    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'audit_log' AND column_name = 'details'`
    );
    if (!cols.length) {
      await db.query('ALTER TABLE audit_log ADD COLUMN details TEXT NULL');
      console.log('Schema: audit_log.details added');
    } else {
      console.log('Schema: audit_log ready');
    }
  } catch (err) {
    console.warn('ensureAuditSchema failed:', err.message);
  }
};