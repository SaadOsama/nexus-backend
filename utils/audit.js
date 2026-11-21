const db = require('../config/db');

// Har admin action yahan se audit_log mein jata hai. Fail ho to main action nahi rukta.
exports.logAudit = async ({ adminId, action, targetType, targetId, summary }) => {
  try {
    await db.query(
      `INSERT INTO audit_log (admin_id, action, target_type, target_id, summary)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId || null, action, targetType, targetId || null, String(summary).slice(0, 255)]
    );
  } catch (err) {
    console.warn('Audit log insert failed:', err.message);
  }
};