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
    
    // Broadcast message to everyone in the room (including sender or using separate emitter)
    io.to(data.roomId).emit('receive-message', data.message);

    // Simulation logic: If the sender is the agent, simulate a client response in 3 seconds!
    if (data.message.sender === 'agent') {
      const roomId = data.roomId;
      const clientName = roomId === 'patit' ? 'พาทิศ' : 'มอส';

      // 1. Emit typing indicator start
      setTimeout(() => {
        io.to(roomId).emit('client-typing', { isTyping: true, clientName });
      }, 1000);

      // 2. Send automated simulated reply
      setTimeout(() => {
        // Stop typing indicator
        io.to(roomId).emit('client-typing', { isTyping: false, clientName });

        const replies = {
          patit: [
            'รับทราบครับ! ขอบคุณสำหรับพิกัดครับ เดี๋ยวเจอกันวันเสาร์บ่ายโมงตรงครับ 🚗',
            'รบกวนสอบถามเพิ่มเติมครับ โครงการนี้สามารถกู้ได้เต็ม 100% ไหมครับ?',
            'โอเคครับ รายละเอียดชัดเจนดีครับ เดี๋ยวผมจะชวนภรรยาเข้าไปดูด้วยครับ'
          ],
          wipada: [
            'ขอบคุณสำหรับข้อมูลนะคะ มีห้องตัวอย่างว่างให้เข้าไปดูวันอาทิตย์นี้ช่วงเช้าไหมคะ? 🏢',
            'รบกวนส่งอัตราดอกเบี้ยเบื้องต้นให้ดูทางแชทหน่อยได้ไหมคะ?',
            'ถ้าตัดสินใจจองช่วงนี้ มีของแถมหรือโปรโมชั่นเครื่องใช้ไฟฟ้าอะไรบ้างไหมคะ?'
          ]
        };

        const currentReplies = replies[roomId] || ['เข้าใจแล้วครับ ขอบคุณครับ'];
        const randomReply = currentReplies[Math.floor(Math.random() * currentReplies.length)];

        const timeString = new Date().toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }).toUpperCase();

        const simulatedMessage = {
          id: `sim_${Date.now()}`,
          sender: 'client',
          content: randomReply,
          time: timeString,
          isRead: false
        };

        io.to(roomId).emit('receive-message', simulatedMessage);
        console.log(`[Socket.io] Sent simulated reply to room ${roomId}:`, simulatedMessage);
      }, 3500);
    }
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
