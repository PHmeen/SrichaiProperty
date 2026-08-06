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

    console.log(`[CHAT REPORT] User ID: ${user.id} reported Session ID: ${sessionId} for Reason: ${reason}. Details: ${details || 'None'}`);

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
