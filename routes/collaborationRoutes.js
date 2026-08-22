const express = require('express');
const router = express.Router();
const collaborationController = require('../controllers/collaborationController');

// POST: Create collaboration request (project_id, sender_id, email, message)
router.post('/request', collaborationController.sendRequest);

// GET: Incoming requests for the logged-in project owner
router.get('/incoming/:userId', collaborationController.getIncomingRequests);

// PUT: Accept / Dismiss a request
router.put('/accept/:id', collaborationController.acceptRequest);
router.put('/dismiss/:id', collaborationController.dismissRequest);

module.exports = router;