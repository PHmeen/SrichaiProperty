import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { pusherServer, chatChannelName } from '@/lib/pusher';

const MESSAGE_PAGE_SIZE = 30;

// GET: โหลดข้อความเก่ากว่านี้ในห้องแชท (แบบ cursor pagination) สำหรับปุ่ม "โหลดข้อความเก่ากว่านี้"
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const beforeMessageId = searchParams.get('before');

    if (!sessionId || !beforeMessageId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและ before' }, { status: 400 });
    }

    const chatSession = await db.chat_sessions.findUnique({ where: { id: sessionId } });
    if (!chatSession || (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' }, { status: 403 });
    }

    const older = await db.messages.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' },
      cursor: { id: beforeMessageId },
      skip: 1,
      take: MESSAGE_PAGE_SIZE
    });
    older.reverse();

    const hasMore = older.length === MESSAGE_PAGE_SIZE
      ? (await db.messages.count({ where: { session_id: sessionId, created_at: { lt: older[0].created_at } } })) > 0
      : false;

    return NextResponse.json({
      success: true,
      hasMore,
      messages: older.map(m => ({
        id: m.id,
        sender: m.sender_id === user.id ? 'user' : 'other',
        text: m.content || '',
        fileUrl: m.file_url,
        latitude: m.latitude ? Number(m.latitude) : null,
        longitude: m.longitude ? Number(m.longitude) : null,
        isRead: m.is_read,
        time: new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }))
    });
  } catch (error) {
    const err = error as Error;
    console.error('Load Older Messages Error:', err);
    return NextResponse.json({ error: 'โหลดข้อความเก่าล้มเหลว: ' + err.message }, { status: 500 });
  }
}

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
    const { sessionId, content, fileUrl, latitude, longitude } = body;

    const hasText = typeof content === 'string' && content.trim().length > 0;
    const hasAttachment = typeof fileUrl === 'string' && fileUrl.length > 0;
    const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

    if (!sessionId || (!hasText && !hasAttachment && !hasLocation)) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและข้อความ ไฟล์แนบ หรือพิกัดตำแหน่ง' }, { status: 400 });
    }

    // ต้องเป็นไฟล์ที่อัปโหลดผ่านระบบเราเองเท่านั้น (path ภายใน /uploads) กันแนบ URL ภายนอกที่อันตราย
    if (hasAttachment && !fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'ไฟล์แนบไม่ถูกต้อง กรุณาอัปโหลดผ่านระบบเท่านั้น' }, { status: 400 });
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
        content: hasText ? content.trim() : null,
        file_url: hasAttachment ? fileUrl : null,
        latitude: hasLocation ? latitude : null,
        longitude: hasLocation ? longitude : null
      }
    });

    // กระจายข้อความใหม่ผ่าน Pusher ให้อีกฝ่ายในห้องเห็นทันที (ไม่ให้ Pusher ล่มแล้วทำให้ส่งข้อความล้มเหลวไปด้วย)
    // ฝั่ง client แค่ใช้เป็นสัญญาณให้ refetch ข้อมูลห้องแชทใหม่ ไม่ได้พึ่งพา payload นี้โดยตรง
    // เพราะ field "sender" ที่คำนวณด้านล่างเป็นมุมมองของผู้ส่งเท่านั้น ผู้รับต้องดึงข้อมูลใหม่เพื่อมุมมองที่ถูกต้อง
    await pusherServer.trigger(chatChannelName(sessionId), 'new-message', { messageId: message.id })
      .catch(err => console.error('Pusher trigger error:', err));

    // แจ้งเตือนอีกฝ่ายในห้องแชท (ไม่ให้การแจ้งเตือนล้มเหลวทำให้การส่งข้อความล้มเหลวไปด้วย)
    const recipientId = chatSession.customer_id === user.id ? chatSession.agent_id : chatSession.customer_id;
    if (recipientId) {
      const preview = hasText ? content.trim() : hasAttachment ? '📎 ส่งไฟล์แนบ' : '📍 แชร์ตำแหน่ง';
      // ผู้รับเป็นนายหน้าของห้องนี้ -> ลิงก์ไปหน้าแชทฝั่งนายหน้า, ถ้าเป็นลูกค้า -> ลิงก์ไปหน้าแชทฝั่งลูกค้า
      const recipientChatPath = recipientId === chatSession.agent_id ? '/agent/chat' : '/chat';
      await db.notifications.create({
        data: {
          user_id: recipientId,
          title: `💬 ข้อความใหม่จาก ${user.first_name}`,
          content: preview.length > 100 ? preview.slice(0, 100) + '…' : preview,
          type: 'chat',
          link_url: `${recipientChatPath}?sessionId=${sessionId}`
        }
      }).catch(err => console.error('Error creating chat notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        sender: 'user',
        text: message.content || '',
        fileUrl: message.file_url,
        latitude: message.latitude ? Number(message.latitude) : null,
        longitude: message.longitude ? Number(message.longitude) : null,
        isRead: message.is_read,
        time: new Date(message.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    });
  } catch (error) {
    const err = error as Error;
    console.error('Send Message Error:', err);
    return NextResponse.json({ error: 'ส่งข้อความล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// PATCH: ทำเครื่องหมายว่าอ่านข้อความทั้งหมดในห้องแชทแล้ว (เรียกตอนเปิดห้องสนทนา)
export async function PATCH(request: Request) {
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
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชท' }, { status: 400 });
    }

    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession || (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' }, { status: 403 });
    }

    // ทำเครื่องหมายอ่านแล้วเฉพาะข้อความที่ "อีกฝ่าย" ส่งมา (ไม่ใช่ข้อความของตัวเอง)
    await db.messages.updateMany({
      where: { session_id: sessionId, sender_id: { not: user.id }, is_read: false },
      data: { is_read: true }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('Mark Read Error:', err);
    return NextResponse.json({ error: 'อัปเดตสถานะอ่านล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// DELETE: ลบข้อความแชทรายรายการ
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสข้อความที่ต้องการลบ' }, { status: 400 });
    }

    const message = await db.messages.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'ไม่พบข้อความนี้' }, { status: 404 });
    }

    // อนุญาตให้ลบได้เฉพาะข้อความที่ตัวเองเป็นผู้ส่งเท่านั้น (กันไม่ให้อีกฝ่ายในห้องแชทลบข้อความของเราได้)
    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบข้อความนี้ (ลบได้เฉพาะข้อความของตัวเอง)' }, { status: 403 });
    }

    await db.messages.delete({
      where: { id: messageId }
    });

    return NextResponse.json({ success: true, message: 'ลบข้อความเรียบร้อยแล้ว' });
  } catch (error) {
    const err = error as Error;
    console.error('Delete Message Error:', err);
    return NextResponse.json({ error: 'ลบข้อความล้มเหลว: ' + err.message }, { status: 500 });
  }
}
