const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// 🔵 BUILD CHECK - confirm naya deployment live hai ya nahi
console.log('🔵🔵🔵 BUILD CHECK v2: ' + new Date().toISOString());

// Imports
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Allowed Origins for CORS (Production + Local domains)
const allowedOrigins = [
  'http://localhost:5173', 'https://nexus-frontend-matz4.vercel.app',
  'http://localhost:5174', 
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allows requests from Vercel frontend or local origin
    callback(null, true);
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
    console.log(`✅ Route Mounted Successfully: ${path}`);
  } else {
    console.error(`❌ ERROR: ${routerName} is UNDEFINED! Check 'module.exports = router;' in that file.`);
    app.use(path, (req, res) => {
      res.status(500).json({ error: `Route handler for ${path} is not correctly exported.` });
    });
  }
};

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Backend server is active and running!',
    timestamp: new Date().toISOString()
  });
});

// Route Mountings
safeMount('/api/auth', authRoutes, 'authRoutes');
safeMount('/api/projects', projectRoutes, 'projectRoutes');
safeMount('/api/collaborations', collaborationRoutes, 'collaborationRoutes');
safeMount('/api/messages', messageRoutes, 'messageRoutes');
safeMount('/api/notifications', notificationRoutes, 'notificationRoutes');

// Catch-all 404 Handler for Unmatched Routes
app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl} - Route is not mounted correctly.`);
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
  console.log('⚡ User connected to socket:', socket.id);

  // Register Online User
  socket.on('register_user', (userId) => {
    if (userId) {
      const stringId = String(userId);
      onlineUsers.set(stringId, socket.id);
      socket.join(`user_${stringId}`);
      console.log(`✅ User ID ${stringId} mapped to Socket ${socket.id}`);
    }
  });

  // Real-time message relay
  socket.on('send_message', (data) => {
    console.log('🟡 send_message event received:', data);

    const senderId = Number(data.senderId || data.sender_id);
    const receiverId = Number(data.receiverId || data.receiver_id);
    const projectId = data.projectId || data.project_id || null;
    const messageText = data.text || data.message;
    const senderName = data.senderName || 'User';

    if (!senderId || !receiverId || !messageText) {
      console.error('❌ Missing message payload keys:', data);
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
      console.log(`📩 Delivered message to Receiver ID ${receiverId} via Socket ${receiverSocketId}`);
    } else {
      io.to(`user_${receiverId}`).emit('receive_message', payload);
      console.log(`📩 Dispatched message to room user_${receiverId}`);
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`🔌 User ID ${userId} disconnected.`);
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
  console.log(`🚀 Server running on port ${PORT}`);
});