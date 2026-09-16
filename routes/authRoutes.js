const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Debugging checks
if (!authController.signup || !authController.login) {
  console.error("ERROR: authController functions are not exported properly!");
}

// /signup ko change karke /register kar dein
router.post('/register', authController.signup);
router.post('/login', authController.login);

module.exports = router;
