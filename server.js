const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// DB import (apne existing db file path ke mutabiq adjust karein agar zaroorat ho)
const db = require('./config/db');

require('./utils/ensureSchema')();

// BUILD CHECK - confirm naya deployment live hai ya nahi
console.log('BUILD CHECK v3 (Share + SPA Ready): ' + new Date().toISOString());

// Imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const adminUsersRoutes = require('./routes/adminUsers');

const app = express();

const FRONTEND_URL = (
  process.env.FRONTEND_URL || 'https://nexus-frontend-matz4.vercel.app'
).replace(/\/+$/, '');

// Allowed Origins for CORS (Production + Local domains)
const allowedOrigins = [
  'http://localhost:5173',
  'https://nexus-frontend-matz4.vercel.app',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser / server-to-server / crawler requests or allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization', 'Content-Disposition'],
  maxAge: 86400,
};

// Disable ETag generation so API responses are never served as 304
app.disable('etag');

app.use(cors(corsOptions));
app.use(express.json());

// Never cache API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Safe mount route helper
const safeMount = (path, router, routerName) => {
  if (typeof router === 'function') {
    app.use(path, router);
    console.log(`Route Mounted Successfully: ${path}`);
  } else {
    console.error(`ERROR: ${routerName} is UNDEFINED! Check 'module.exports = router;' in that file.`);
    app.use(path, (req, res) => {
      res.status(500).json({ error: `Route handler for ${path} is not correctly exported.` });
    });
  }
};

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper to fetch a single project across common DB query shapes (mysql2 promise/callback or pg/sqlite)
async function findProjectById(id) {
  if (!db) return null;

  // Case 1: mysql2 / promise pool with .query or .execute
  if (typeof db.query === 'function') {
    const result = await db.query(
      'SELECT id, title, description FROM projects WHERE id = ? LIMIT 1',
      [id]
    );
    if (Array.isArray(result) && Array.isArray(result[0])) {
      return result[0][0] || null;
    }
    if (result && Array.isArray(result.rows)) {
      return result.rows[0] || null;
    }
  }

  // Case 2: Sequelize / Mongoose style model if exported
  if (db.Project && typeof db.Project.findByPk === 'function') {
    return await db.Project.findByPk(id);
  }

  return null;
}

// Share Preview Route for WhatsApp, Slack, etc. (returns dynamic OG title & description)
app.get('/share/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const project = await findProjectById(id);

    if (!project) {
      return res.redirect(`${FRONTEND_URL}/`);
    }

    const projectUrl = `${FRONTEND_URL}/projects/${project.id}`;
    const safeTitle = escapeHtml(project.title || 'Project Nexus');
    const safeDescription = escapeHtml(
      (project.description || 'Explore this project on Project Nexus').slice(0, 200)
    );

    res.status(200).set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}" />

    <!-- Open Graph (WhatsApp, Slack, LinkedIn, etc.) -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${projectUrl}" />
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />

    <!-- Twitter / Slack Card Meta -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />

    <!-- Redirect normal browsers to React SPA route -->
    <meta http-equiv="refresh" content="0; url=${projectUrl}" />
    <script>window.location.replace(${JSON.stringify(projectUrl)});</script>
  </head>
  <body>
    <p>Opening <a href="${projectUrl}">${safeTitle}</a>...</p>
  </body>
</html>`);
  } catch (error) {
    console.error('Share preview error:', error);
    res.status(500).send('Unable to load project preview');
  }
});

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend server is active and running!',
    timestamp: new Date().toISOString(),
  });
});

// Route Mountings
safeMount('/api/auth', authRoutes, 'authRoutes');
safeMount('/api/projects', projectRoutes, 'projectRoutes');
safeMount('/api/collaborations', collaborationRoutes, 'collaborationRoutes');
safeMount('/api/admin', adminUsersRoutes, 'adminUsersRoutes');
safeMount('/api/messages', messageRoutes, 'messageRoutes');
safeMount('/api/notifications', notificationRoutes, 'notificationRoutes');

// Catch-all 404 Handler for Unmatched Routes
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}. Route is not mounted correctly.`);
});

// Create HTTP server wrapper
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Online Users mapping: userId (String) -> socketId
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected to socket:', socket.id);

  // Register Online User
  socket.on('register_user', (userId) => {
    if (userId) {
      const stringId = String(userId);
      onlineUsers.set(stringId, socket.id);
      socket.join(`user_${stringId}`);
      console.log(`User ID ${stringId} mapped to Socket ${socket.id}`);
    }
  });

  // Real-time message relay
  socket.on('send_message', (data) => {
    console.log('send_message event received:', data);

    const senderId = Number(data.senderId || data.sender_id);
    const receiverId = Number(data.receiverId || data.receiver_id);
    const projectId = data.projectId || data.project_id || null;
    const messageText = data.text || data.message;
    const senderName = data.senderName || 'User';

    if (!senderId || !receiverId || !messageText) {
      console.error('Missing message payload keys:', data);
      return;
    }

    const payload = {
      id: Date.now(),
      senderId,
      sender_id: senderId,
      receiverId,
      receiver_id: receiverId,
      projectId,
      project_id: projectId,
      text: messageText,
      message: messageText,
      senderName,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const receiverSocketId = onlineUsers.get(String(receiverId));
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('receive_message', payload);
      console.log(`Delivered message to Receiver ID ${receiverId} via Socket ${receiverSocketId}`);
    } else {
      io.to(`user_${receiverId}`).emit('receive_message', payload);
      console.log(`Dispatched message to room user_${receiverId}`);
    }
  });

  

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`User ID ${userId} disconnected.`);
        break;
      }
    }
  });
});

// Export Express App (Useful for serverless / Vercel context)
module.exports = app;

// Start HTTP Server on dynamic port for Railway & Local Environments
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});