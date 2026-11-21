const jwt = require('jsonwebtoken');
const db = require('../config/db');

const SUSPENDED_MSG = 'Your account is suspended. Contact the Nexus team.';

const verifyToken = async (req, res, next) => {
  let decoded;
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: No token provided or invalid format.'
      });
    }

    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'nexus_super_secret_key_123');
  } catch (err) {
    console.error('JWT Verification Error:', err.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }

  // Suspended user ka purana token bhi reject
  try {
    if (decoded.role !== 'admin') {
      const [rows] = await db.query('SELECT is_suspended FROM users WHERE id = ?', [decoded.id]);
      if (rows.length && rows[0].is_suspended) {
        return res.status(401).json({ success: false, code: 'ACCOUNT_SUSPENDED', message: SUSPENDED_MSG });
      }
    }
  } catch (err) {
    console.error('Suspension check failed:', err.message);
  }

  req.user = decoded;
  next();
};

module.exports = { verifyToken };