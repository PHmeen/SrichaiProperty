import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { pusherServer } from '@/lib/pusher';

// POST: ยืนยันสิทธิ์ก่อนอนุญาตให้ subscribe private channel ของห้องแชท (private-chat-{sessionId})
// pusher-js เรียก endpoint นี้อัตโนมัติทุกครั้งที่ subscribe channel ที่ขึ้นต้นด้วย "private-"
// แทนที่ io.use() JWT middleware ของ socket-server.js เดิม โดยใช้ NextAuth session cookie แทน JWT
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const user = await db.users.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
  }

  const formData = await request.formData();
  const socketId = formData.get('socket_id');
  const channel = formData.get('channel_name');

  if (typeof socketId !== 'string' || typeof channel !== 'string' || !socketId || !channel) {
    return NextResponse.json({ error: 'ข้อมูลคำขอไม่ถูกต้อง' }, { status: 400 });
  }

  // ยอมเฉพาะช่องทางแชทที่ตั้งชื่อตามรูปแบบ private-chat-{sessionId} เท่านั้น
  const prefix = 'private-chat-';
  if (!channel.startsWith(prefix)) {
    return NextResponse.json({ error: 'ช่องทางไม่ถูกต้อง' }, { status: 400 });
  }
  const roomId = channel.slice(prefix.length);

  // ตรวจสอบกับฐานข้อมูลจริงว่าผู้ใช้เป็นสมาชิกของห้องแชทนี้ (customer_id หรือ agent_id) ก่อนอนุญาต
  const chatSession = await db.chat_sessions.findUnique({
    where: { id: roomId },
    select: { customer_id: true, agent_id: true }
  });

  const isMember = !!chatSession && (chatSession.customer_id === user.id || chatSession.agent_id === user.id);
  if (!isMember) {
    return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าห้องแชทนี้' }, { status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}
