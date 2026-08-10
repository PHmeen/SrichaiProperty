/* eslint-disable */
/**
 * ==============================================================================
 * Socket.io Real-time Server (สำหรับระบบแชท Srichai Property)
 * ==============================================================================
 * ความปลอดภัยที่บังคับใช้:
 * 1. ทุก connection ต้องแนบ JWT token (ออกโดย /api/chat/socket-token ของฝั่ง Next.js
 *    และเซ็นด้วยคีย์เดียวกับ NEXTAUTH_SECRET) มิฉะนั้นจะถูกปฏิเสธการเชื่อมต่อทันที
 * 2. ก่อนเข้าห้อง (join-room) เซิร์ฟเวอร์จะ query ฐานข้อมูลจริงเพื่อยืนยันว่า
 *    ผู้ใช้เป็น customer_id หรือ agent_id ของห้องแชทนั้นจริง ป้องกันการดักฟังห้องอื่น
 * 3. CORS จำกัดเฉพาะ origin ที่กำหนดผ่าน CLIENT_ORIGIN (คั่นด้วยจุลภาคถ้ามีหลายค่า)
 * ==============================================================================
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const PORT = process.env.SOCKET_PORT || 3001;
const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || process.env.NEXTAUTH_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (!JWT_SECRET) {
  console.error('[Socket.io] FATAL: NEXTAUTH_SECRET is not set. Refusing to start without an auth secret.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.io Real-time Server is running...\n');
});

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ----------------------------------------------------------------------------
// Middleware: ตรวจสอบ JWT ก่อนอนุญาตให้เชื่อมต่อ (ทำงานก่อน 'connection' เสมอ)
// ----------------------------------------------------------------------------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('unauthorized: missing token'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (!payload?.sub) {
      return next(new Error('unauthorized: invalid token payload'));
    }
    socket.data.userId = payload.sub;
    next();
  } catch (err) {
    next(new Error('unauthorized: ' + err.message));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id} (user ${socket.data.userId})`);

  // เข้าห้องสนทนา — ตรวจสิทธิ์กับฐานข้อมูลจริงก่อนทุกครั้ง
  socket.on('join-room', async (roomId) => {
    if (typeof roomId !== 'string' || !roomId) return;
    try {
      const chatSession = await prisma.chat_sessions.findUnique({
        where: { id: roomId },
        select: { customer_id: true, agent_id: true }
      });

      const userId = socket.data.userId;
      const isMember = !!chatSession && (chatSession.customer_id === userId || chatSession.agent_id === userId);

      if (!isMember) {
        socket.emit('room-error', { roomId, error: 'คุณไม่มีสิทธิ์เข้าห้องแชทนี้' });
        console.warn(`[Socket.io] Rejected join-room: user ${userId} -> room ${roomId}`);
        return;
      }

      socket.join(roomId);
      console.log(`[Socket.io] Client ${socket.id} (user ${userId}) joined room: ${roomId}`);
    } catch (err) {
      console.error('[Socket.io] join-room error:', err);
      socket.emit('room-error', { roomId, error: 'เกิดข้อผิดพลาดขณะเข้าห้องแชท' });
    }
  });

  // ออกจากห้องสนทนา (ใช้ตอนสลับห้อง แทนการ disconnect/reconnect ใหม่ทั้งหมด)
  socket.on('leave-room', (roomId) => {
    if (typeof roomId !== 'string' || !roomId) return;
    socket.leave(roomId);
    console.log(`[Socket.io] Client ${socket.id} left room: ${roomId}`);
  });

  // ส่งข้อความ — broadcast ได้เฉพาะห้องที่ตัวเองเป็นสมาชิกอยู่จริง (join-room ผ่านแล้วเท่านั้น)
  socket.on('send-message', (data) => {
    const roomId = data?.roomId;
    if (typeof roomId !== 'string' || !socket.rooms.has(roomId)) {
      console.warn(`[Socket.io] Blocked send-message: user ${socket.data.userId} not in room ${roomId}`);
      return;
    }
    io.to(roomId).emit('receive-message', data.message);
  });

  // แจ้งสถานะ "กำลังพิมพ์..." เฉพาะในห้องที่เป็นสมาชิกอยู่จริง
  socket.on('typing', (data) => {
    const roomId = data?.roomId;
    if (typeof roomId !== 'string' || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('client-typing', { isTyping: !!data?.isTyping });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Socket.io Server running on http://localhost:${PORT}`);
  console.log(`   Allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`====================================================`);
});
