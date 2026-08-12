import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อระบุตัวผู้ใช้ที่ส่ง/ดึงข้อความ
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับบันทึก/ดึงข้อความแชท
import { getPusher } from '@/lib/pusher'; // ยิงอีเวนต์แชทแบบเรียลไทม์ผ่าน Pusher
import { chatChannelName } from '@/lib/chatChannel'; // สร้างชื่อ channel ของ Pusher ให้ตรงกับห้องแชท
import { checkRateLimit } from '@/lib/rateLimit'; // จำกัดความถี่การส่งข้อความเพื่อกันสแปม
import { notifyUser } from '@/lib/notify'; // สร้างการแจ้งเตือนในระบบให้ผู้รับข้อความ

/**
 * ==============================================================================
 * API ROUTE: /api/chat/messages
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * ระบบจัดการข้อความแชทรายรายการ (Chat Messages API) รองรับการแชทแบบเรียลไทม์ (Real-time WebSockets)
 * ประกอบด้วย 4 HTTP Methods หลัก:
 * 
 * 1. GET    - ดึงข้อความเก่าในห้องแชทแบบ Cursor-based Pagination (หน้าแรกดึง 30 ข้อความล่าสุด ปุ่มกดดึงข้อความเก่ากว่านี้จะส่ง `before=messageId` มาดึงเพิ่ม)
 * 2. POST   - ส่งข้อความใหม่ (ข้อความตัวหนังสือ, ไฟล์แนบเอกสาร/รูปภาพ, พิกัดสถานที่ GPS)
 *             พร้อมระบบ Rate Limiting ป้องกันสแปม, แจ้งเตือนผ่าน Pusher WebSocket และสร้าง In-App Notification
 * 3. PATCH  - อัปเดตสถานะอ่านแล้ว (Mark as Read) เฉพาะข้อความที่อีกฝ่ายส่งมาเมื่อเปิดดูห้องแชท พร้อมยิง Pusher แจ้งอีกฝ่าย
 * 4. DELETE - ลบข้อความแชทรายรายการ (ตรวจสอบความปลอดภัย: ลบได้เฉพาะข้อความที่ตัวเองเป็นผู้ส่งเท่านั้น)
 * ==============================================================================
 */

// ขนาดของข้อความที่จะโหลดในแต่ละรอบ (30 ข้อความ/หน้า) เพื่อลดภาระเซิร์ฟเวอร์และลด Data Transfer
const MESSAGE_PAGE_SIZE = 30;

// ==============================================================================
// 1. GET: โหลดข้อความเก่ากว่านี้ในห้องแชท (Cursor-based Pagination)
// ==============================================================================
// ตัวอย่าง Request: GET /api/chat/messages?sessionId=xxx&before=msg_123
export async function GET(request: Request) {
  try {
    // --------------------------------------------------------------------------
    // [1] ตรวจสอบการเข้าสู่ระบบ (Authentication)
    // --------------------------------------------------------------------------
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    // --------------------------------------------------------------------------
    // [2] ค้นหาผู้ใช้จากตาราง users ด้วย Email จาก Session
    // --------------------------------------------------------------------------
    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    // --------------------------------------------------------------------------
    // [3] อ่านค่า Query Parameters (sessionId และ before) จาก URL
    // --------------------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const beforeMessageId = searchParams.get('before'); // ID ของข้อความเก่าที่สุดบนหน้าจอขณะนั้น

    if (!sessionId || !beforeMessageId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและ before' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [4] ตรวจสอบสิทธิ์การเข้าถึงห้องแชท (Authorization)
    // --------------------------------------------------------------------------
    const chatSession = await db.chat_sessions.findUnique({ where: { id: sessionId } });
    if (!chatSession || (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // [5] ดึงข้อความที่เก่ากว่า beforeMessageId ด้วย Prisma Cursor Pagination
    // --------------------------------------------------------------------------
    const older = await db.messages.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' }, // ดึงจากข้อความที่สร้างล่าสุดย้อนกลับไป
      cursor: { id: beforeMessageId },  // เริ่มตั้งหลักที่ข้อความ beforeMessageId
      skip: 1,                          // ข้ามข้อความที่เป็น cursor ตัวเอง (ไม่ให้ดึงซ้ำ)
      take: MESSAGE_PAGE_SIZE           // ดึงย้อนหลัง 30 รายการ
    });

    // กลับลำดับรายการจาก (ใหม่ -> เก่า) เป็น (เก่า -> ใหม่) เพื่อให้ Frontend วางเรียงบนลงล่างถูกต้อง
    older.reverse();

    // --------------------------------------------------------------------------
    // [6] ตรวจสอบว่ายังมีข้อความเก่ากว่านี้ใน DB เหลืออยู่อีกหรือไม่ (hasMore Flag)
    // --------------------------------------------------------------------------
    const hasMore = older.length === MESSAGE_PAGE_SIZE
      ? (await db.messages.count({
          where: {
            session_id: sessionId,
            created_at: { lt: older[0].created_at } // เช็คข้อความที่มีเวลาสร้างน้อยกว่า (เก่ากว่า) ข้อความแรกในชุดนี้
          }
        })) > 0
      : false;

    // --------------------------------------------------------------------------
    // [7] รูปแบบข้อมูลข้อความ (Data Formatting) และส่งกลับ HTTP 200 OK
    // --------------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      hasMore,
      messages: older.map(m => ({
        id: m.id,
        sender: m.sender_id === user.id ? 'user' : 'other', // ระบุผู้ส่งตามมุมมองของคนเรียก API
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

// ==============================================================================
// 2. POST: ส่งข้อความแชทใหม่เข้าห้องสนทนา และบันทึกลง Database
// ==============================================================================
export async function POST(request: Request) {
  try {
    // --------------------------------------------------------------------------
    // [1] ตรวจสอบการเข้าสู่ระบบ (Authentication)
    // --------------------------------------------------------------------------
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

    // --------------------------------------------------------------------------
    // [2] จำกัดอัตราการส่งข้อความเพื่อป้องกันสแปม (Rate Limiting Security)
    // --------------------------------------------------------------------------
    // อนุญาตสูงสุด 60 ข้อความ ต่อ 1 นาที (60,000 ms) ต่อผู้ใช้ 1 คน
    if (!checkRateLimit(`chat-message:${user.id}`, 60, 60 * 1000)) {
      return NextResponse.json({ error: 'คุณส่งข้อความบ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' }, { status: 429 });
    }

    // --------------------------------------------------------------------------
    // [3] อ่านข้อมูลและตรวจสอบชนิดข้อความ (Payload Input Validation)
    // --------------------------------------------------------------------------
    const body = await request.json();
    const { sessionId, content, fileUrl, latitude, longitude } = body;

    const hasText = typeof content === 'string' && content.trim().length > 0;
    const hasAttachment = typeof fileUrl === 'string' && fileUrl.length > 0;
    const hasLocation = typeof latitude === 'number' && typeof longitude === 'number';

    // ต้องมีอย่างน้อย 1 อย่าง: ข้อความตัวหนังสือ, ไฟล์แนบ, หรือพิกัดสถานที่
    if (!sessionId || (!hasText && !hasAttachment && !hasLocation)) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทและข้อความ ไฟล์แนบ หรือพิกัดตำแหน่ง' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [4] ตรวจสอบความปลอดภัยไฟล์แนบ (Security Check)
    // --------------------------------------------------------------------------
    // อนุญาตเฉพาะไฟล์ที่อัปโหลดผ่านระบบ `/uploads/` เท่านั้น (ป้องกันการใส่ URL สคริปต์ภายนอกที่เป็นอันตราย)
    if (hasAttachment && !fileUrl.startsWith('/uploads/')) {
      return NextResponse.json({ error: 'ไฟล์แนบไม่ถูกต้อง กรุณาอัปโหลดผ่านระบบเท่านั้น' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [5] ตรวจสอบความมีอยู่ของห้องแชทและสิทธิ์ของผู้ส่ง (Authorization)
    // --------------------------------------------------------------------------
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชทนี้' }, { status: 404 });
    }

    if (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ส่งข้อความในห้องนี้' }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // [6] บันทึกข้อความลงในตาราง messages ของฐานข้อมูล PostgreSQL
    // --------------------------------------------------------------------------
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

    // --------------------------------------------------------------------------
    // [7] กระจายสัญญาณข้อความใหม่ผ่าน Pusher WebSockets แบบ Realtime
    // --------------------------------------------------------------------------
    // สั่งยิง event `new-message` เข้า channel ของห้องแชทนี้
    // ใช้ try/catch (.catch) หุ้มไว้ เพื่อไม่ให้กรณีเซิร์ฟเวอร์ Pusher ขัดข้องส่งผลกระทบต่อการส่งข้อความใน DB
    await getPusher().trigger(chatChannelName(sessionId), 'new-message', { messageId: message.id })
      .catch(err => console.error('Pusher trigger error:', err));

    // --------------------------------------------------------------------------
    // [8] สร้างการแจ้งเตือนระบบ (In-App Notification) ส่งไปยังอีกฝ่าย
    // --------------------------------------------------------------------------
    const recipientId = chatSession.customer_id === user.id ? chatSession.agent_id : chatSession.customer_id;
    if (recipientId) {
      const senderName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'ผู้สอบถาม';
      const preview = hasText ? content.trim() : hasAttachment ? 'ส่งไฟล์แนบ' : 'แชร์ตำแหน่งสถานที่';
      // ระบุลิงก์ปลายทาง: ถ้ารับเป็นนายหน้าพาไป `/agent/chat`, ถ้าเป็นลูกค้าพาไป `/chat`
      const recipientChatPath = recipientId === chatSession.agent_id ? '/agent/chat' : '/chat';
      
      await notifyUser({
        userId: recipientId,
        title: `ข้อความใหม่จาก คุณ${senderName}`,
        content: preview.length > 100 ? preview.slice(0, 100) + '…' : preview,
        type: 'chat',
        linkUrl: `${recipientChatPath}?sessionId=${sessionId}`
      }).catch(err => console.error('Error creating chat notification:', err));
    }

    // --------------------------------------------------------------------------
    // [9] ส่งตอบกลับข้อมูลข้อความที่สร้างเสร็จให้ Frontend (HTTP 200 OK)
    // --------------------------------------------------------------------------
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

// ==============================================================================
// 3. PATCH: อัปเดตสถานะอ่านแล้ว (Mark as Read) เฉพาะข้อความที่อีกฝ่ายส่งมา
// ==============================================================================
export async function PATCH(request: Request) {
  try {
    // --------------------------------------------------------------------------
    // [1] ตรวจสอบการเข้าสู่ระบบผู้ใช้งาน
    // --------------------------------------------------------------------------
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

    // --------------------------------------------------------------------------
    // [2] รับค่า sessionId จาก Request Body
    // --------------------------------------------------------------------------
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชท' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [3] ตรวจสอบสิทธิ์การเข้าถึงห้องแชท
    // --------------------------------------------------------------------------
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession || (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id)) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงห้องแชทนี้' }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // [4] อัปเดตสถานะ `is_read = true` เฉพาะข้อความที่ "อีกฝ่ายส่งมา" (sender_id != user.id)
    // --------------------------------------------------------------------------
    const { count } = await db.messages.updateMany({
      where: { session_id: sessionId, sender_id: { not: user.id }, is_read: false },
      data: { is_read: true }
    });

    // --------------------------------------------------------------------------
    // [5] ส่งสัญญาณ Pusher `messages-read` แจ้งอีกฝ่ายให้เปลี่ยนสถานะเป็น "อ่านแล้ว" ทันที
    // --------------------------------------------------------------------------
    if (count > 0) {
      await getPusher().trigger(chatChannelName(sessionId), 'messages-read', {})
        .catch(err => console.error('Pusher trigger error:', err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error('Mark Read Error:', err);
    return NextResponse.json({ error: 'อัปเดตสถานะอ่านล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// ==============================================================================
// 4. DELETE: ลบข้อความแชทรายรายการ (Single Message Deletion)
// ==============================================================================
export async function DELETE(request: Request) {
  try {
    // --------------------------------------------------------------------------
    // [1] ตรวจสอบการเข้าสู่ระบบผู้ใช้งาน
    // --------------------------------------------------------------------------
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

    // --------------------------------------------------------------------------
    // [2] ดึง Query Parameter `messageId` จาก URL (เช่น /api/chat/messages?messageId=xxx)
    // --------------------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสข้อความที่ต้องการลบ' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [3] ค้นหาข้อความใน DB
    // --------------------------------------------------------------------------
    const message = await db.messages.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'ไม่พบข้อความนี้' }, { status: 404 });
    }

    // --------------------------------------------------------------------------
    // [4] ตรวจสอบความปลอดภัย (Authorization): ลบได้เฉพาะข้อความที่ตัวเองเป็นผู้ส่งเท่านั้น
    // --------------------------------------------------------------------------
    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบข้อความนี้ (ลบได้เฉพาะข้อความของตัวเอง)' }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // [5] ลบข้อความจากตาราง messages และคืนค่าผลลัพธ์ (HTTP 200 OK)
    // --------------------------------------------------------------------------
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

