const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_key_123';

// Signup Controller (Strictly for Standard Users)
exports.signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Direct required field validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    // 1. Existing user check
    const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // 2. Hash password & force role = 'user'
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = 'user'; // Fixed as standard user

    // 3. Database insert
    const [result] = await db.execute(
      'INSERT INTO users (fullName, email, password, role) VALUES (?, ?, ?, ?)',
      [fullName, email, hashedPassword, userRole]
    );

    const newUserId = result.insertId;

    // 4. Token generate karein auto-login ke liye
    const token = jwt.sign(
      { id: newUserId, email, role: userRole },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token,
      user: {
        id: newUserId,
        fullName,
        email,
        role: userRole
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// Login Controller (Standard user & Admin dono yahan se login kar sakenge)
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

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
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};