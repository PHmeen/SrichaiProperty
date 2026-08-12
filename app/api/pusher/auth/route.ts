import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อยืนยันตัวผู้ใช้ก่อนอนุญาต subscribe channel
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับตรวจสอบสิทธิ์เข้าถึงห้องแชท/การแจ้งเตือน
import { getPusher } from '@/lib/pusher'; // ใช้ authorizeChannel เพื่อออก token ให้ pusher-js ฝั่ง client
import { parseChatSessionId } from '@/lib/chatChannel'; // แยก sessionId ออกจากชื่อ channel ห้องแชท private
import { parseNotificationUserId } from '@/lib/notificationChannel'; // แยก userId ออกจากชื่อ channel แจ้งเตือนส่วนตัว

// POST: ยืนยันสิทธิ์ก่อนอนุญาตให้ subscribe private channel (ห้องแชท private-chat-{sessionId}
// หรือช่องแจ้งเตือนส่วนตัว private-user-{userId})
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

  // กรณีที่ 1: ห้องแชท private-chat-{sessionId} — ตรวจกับ DB ว่าเป็นสมาชิกห้องนี้จริง
  const roomId = parseChatSessionId(channel);
  if (roomId) {
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: roomId },
      select: { customer_id: true, agent_id: true }
    });

    const isMember = !!chatSession && (chatSession.customer_id === user.id || chatSession.agent_id === user.id);
    if (!isMember) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าห้องแชทนี้' }, { status: 403 });
    }

    const authResponse = getPusher().authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  // กรณีที่ 2: ช่องแจ้งเตือนส่วนตัว private-user-{userId} — subscribe ได้เฉพาะช่องของตัวเองเท่านั้น
  const notifyUserId = parseNotificationUserId(channel);
  if (notifyUserId) {
    if (notifyUserId !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าช่องทางนี้' }, { status: 403 });
    }

    const authResponse = getPusher().authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  }

  return NextResponse.json({ error: 'ช่องทางไม่ถูกต้อง' }, { status: 400 });
}
