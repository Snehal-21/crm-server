require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const connectDB = require('./config/db');
const notificationService = require('./services/notificationService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const leadRoutes = require('./routes/leads');
const notificationRoutes = require('./routes/notifications');

const app = express();
const httpServer = http.createServer(app);

// Socket.IO setup (shared HTTP server)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Initialize notification service with Socket.IO
notificationService.init(io);

// Socket.IO JWT authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication error: no token'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.sub;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error: invalid token'));
  }
});

io.on('connection', (socket) => {
  // Join user-specific room for targeted notifications
  socket.join(socket.userId);
  console.log(`Socket connected: user ${socket.userId}`);

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API Routes
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/leads', leadRoutes);
app.use('/notifications', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  });
});
