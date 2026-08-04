/* eslint-disable */
const http = require('http');
const { Server } = require('socket.io');

const PORT = 3001;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io Real-time Server is running...\n');
});

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST']
  }
});

// Event handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join a chat session room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket.io] Client ${socket.id} joined room: ${roomId}`);
  });

  // Handle message exchange
  socket.on('send-message', (data) => {
    console.log(`[Socket.io] Message received in room ${data.roomId}:`, data);
    
    // Broadcast message to everyone in the room
    io.to(data.roomId).emit('receive-message', data.message);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Socket.io Server running on http://localhost:${PORT}`);
  console.log(`====================================================`);
});
