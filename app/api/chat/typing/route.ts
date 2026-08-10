import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { getPusher } from '@/lib/pusher';
import { chatChannelName } from '@/lib/chatChannel';
import { checkRateLimit } from '@/lib/rateLimit';

// POST: แจ้งอีกฝ่ายในห้องแชทว่ากำลังพิมพ์อยู่หรือไม่ (ไม่บันทึกลง DB, ยิงผ่าน Pusher เท่านั้น)
// แทนที่ event 'typing' ของ socket-server.js เดิม
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const user = await db.users.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    // จำกัดอัตราการแจ้งสถานะพิมพ์กันสแปม (30 ครั้ง/นาที ต่อผู้ใช้ ฝั่ง UI debounce ไว้แล้ว 2 วิ/ครั้งอยู่แล้ว)
    if (!checkRateLimit(`chat-typing:${user.id}`, 30, 60 * 1000)) {
      return NextResponse.json({ error: 'คุณส่งสถานะพิมพ์บ่อยเกินไป' }, { status: 429 });
    }

    const body = await request.json();
    const { sessionId, isTyping } = body;

    if (typeof sessionId !== 'string' || !sessionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชท' }, { status: 400 });
    }

    // ตรวจสอบสิทธิ์กับฐานข้อมูลจริงก่อนยิง event ทุกครั้ง กันคนนอกห้องปลอมสถานะพิมพ์
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId },
      select: { customer_id: true, agent_id: true }
    });

    if (!chatSession || (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' }, { status: 403 });
    }

    await getPusher().trigger(chatChannelName(sessionId), 'client-typing', {
      isTyping: !!isTyping,
      userId: user.id
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('Typing Broadcast Error:', err);
    return NextResponse.json({ error: 'แจ้งสถานะพิมพ์ล้มเหลว: ' + err.message }, { status: 500 });
  }
}
