import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

// POST: ส่งข้อความแชทใหม่เข้าห้องสนทนา และบันทึกลง Database
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    const body = await request.json();
    const { sessionId, content } = body;

    if (!sessionId || !content?.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและข้อความ' }, { status: 400 });
    }

    // ตรวจสอบว่าผู้ใช้มีสิทธิ์ในห้องแชทนี้จริงหรือไม่
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชทนี้' }, { status: 404 });
    }

    if (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้' }, { status: 403 });
    }

    // บันทึกข้อความลง Database
    const message = await db.messages.create({
      data: {
        session_id: sessionId,
        sender_id: user.id,
        content: content.trim()
      }
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        sender: 'user',
        text: message.content,
        time: new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Send Message Error:', err);
    return NextResponse.json({ error: 'ส่งข้อความล้มเหลว: ' + err.message }, { status: 500 });
  }
}
