const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');

// Signup Controller (Strictly for Standard Users)
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
//
// NOTE: role is intentionally NOT taken from the request body. It used to
// filter the query (`AND role = ?`) based on a client-side guess (e.g.
// "does the email contain 'admin'"). That guess is both insecure (a client
// should never get to declare its own role) and buggy in practice: a real
// admin whose email doesn't happen to contain "admin" would get 0 rows back
// and see "Invalid credentials" even with the right password. The role that
// matters is whatever is stored against that email in the DB — we look the
// user up by email+password alone and return their actual role so the
// frontend can route them correctly.
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
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
      { expiresIn: JWT_EXPIRES_IN }
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
