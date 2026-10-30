const express = require('express');
const app = express();

// Middleware & Routes
app.use(express.json());
// ... apke baqi routes

module.exports = app;