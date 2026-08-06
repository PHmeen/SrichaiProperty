import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

// POST: บันทึกรายงานพฤติกรรมไม่เหมาะสม / สแปม / ข้อความที่ไม่เหมาะสม
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
    const { sessionId, reason, details } = body;

    if (!sessionId || !reason) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและสาเหตุการรายงาน' }, { status: 400 });
    }

    // ✅ ตรวจสอบว่าห้องแชทนี้มีอยู่จริง และผู้รายงานเป็นสมาชิก
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชทนี้' }, { status: 404 });
    }

    if (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์รายงานห้องแชทนี้' }, { status: 403 });
    }

    // ✅ บันทึกรายงานลง DB จริง (ไม่ใช่แค่ console.log)
    const reportedUserId = user.id === chatSession.customer_id
      ? chatSession.agent_id     // ลูกค้ารายงานนายหน้า
      : chatSession.customer_id; // นายหน้ารายงานลูกค้า

    await db.reports.create({
      data: {
        reporter_id: user.id,
        reported_agent_id: reportedUserId,
        reason: reason,
        details: details || null,
        status: 'pending'
      }
    });

    // แจ้งเตือน admin ทั้งหมด
    const admins = await db.users.findMany({
      where: { role_id: 'admin' },
      select: { id: true }
    });

    await Promise.allSettled(
      admins.map(admin =>
        db.notifications.create({
          data: {
            user_id: admin.id,
            title: '🚨 มีรายงานจากห้องแชท',
            content: `ผู้ใช้ ${user.first_name} รายงาน: "${reason}"${details ? ` — ${details}` : ''}`,
            type: 'report',
            is_read: false
          }
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: 'ขอบคุณสำหรับการรายงาน ทีมงานจะทำการตรวจสอบข้อความและผู้ใช้นี้โดยเร็วที่สุด'
    });
  } catch (error) {
    const err = error as Error;
    console.error('Report Error:', err);
    return NextResponse.json({ error: 'ส่งรายงานล้มเหลว: ' + err.message }, { status: 500 });
  }
}
