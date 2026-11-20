const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Controller mein naam signup ho ya register, dono chalenge
const signupHandler = authController.signup || authController.register;
const loginHandler = authController.login;

// Debugging checks
if (typeof signupHandler !== 'function' || typeof loginHandler !== 'function') {
  console.error("ERROR: authController functions are not exported properly!");
  console.error("Exported keys:", Object.keys(authController));
  console.error("signup/register:", typeof signupHandler, "| login:", typeof loginHandler);
  process.exit(1); // saaf error ke saath ruk jao, confusing crash nahi
}

// /signup ko change karke /register kar dein
router.post('/register', signupHandler);
router.post('/login', loginHandler);

module.exports = router;