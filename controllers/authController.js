const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');

// Signup Controller
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = 'user';

    const [result] = await db.execute(
      'INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)',
      [fullName, email, hashedPassword, userRole]
    );

    const newUserId = result.insertId;

    const token = jwt.sign(
      { id: newUserId, email, role: userRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token,
      user: { id: newUserId, fullName, email, role: userRole }
    });

  } catch (error) {
    console.error('❌ SIGNUP ERROR:', error);
    res.status(500).json({
      message: 'Server Error',
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message || 'No message',
      errorName: error.name || 'Unknown'
    });
  }
};

// Login Controller
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Hardcoded Admin Bypass
    if (email.toLowerCase() === 'admin@nexus.com' && password === 'admin123') {
      const adminToken = jwt.sign(
        { id: 4, email: 'admin@nexus.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      return res.status(200).json({
        success: true,
        token: adminToken,
        user: { id: 4, fullName: 'Administrator', email: 'admin@nexus.com', role: 'admin' },
      });
    }

    // Database User Lookup
    let query = 'SELECT * FROM users WHERE email = ?';
    let queryParams = [email];
    if (role) {
      query += ' AND role = ?';
      queryParams.push(role);
    }

    const [users] = await db.execute(query, queryParams);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials or account not found.' });
    }

    const user = users[0];

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName || 'Administrator',
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    res.status(500).json({
      message: 'Server Error',
      errorCode: error.code || 'UNKNOWN',
      errorMessage: error.message || 'No message',
      errorName: error.name || 'Unknown'
    });
  }
};

// Middleware: Verify Token
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token provided.' });
  }

  const token = authHeader.split(' ')[1]?.trim();

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token string missing.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ JWT Verification Error:', err.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }
  next();
};