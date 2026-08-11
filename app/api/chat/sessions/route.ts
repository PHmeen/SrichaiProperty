import { NextResponse } from 'next/server'; // ใช้สร้าง JSON Response ส่งกลับ Frontend พร้อม HTTP Status Code
import { getServerSession } from 'next-auth/next'; // ดึง Session ผู้ใช้ที่เข้าสู่ระบบฝั่ง Server
import { authOptions } from '@/lib/authOptions'; // ค่า Config สำหรับ NextAuth (Provider, Secret, ฯลฯ)
import { db } from '@/lib/db'; // Prisma Client ตัวแทนใช้ติดต่อและสั่งงานฐานข้อมูล

/**
 * ==============================================================================
 * API ROUTE: /api/chat/sessions
 * ==============================================================================
 * จัดการระบบห้องแชทซื้อขายอสังหาริมทรัพย์ระหว่าง ลูกค้า (Customer) และ นายหน้า (Agent)
 * ประกอบด้วย 3 HTTP Methods:
 * 1. GET    - ดึงรายการห้องแชททั้งหมดของผู้ใช้ที่ล็อกอินอยู่
 * 2. POST   - เปิด/สร้างห้องแชทใหม่ หรือ ดึงห้องแชทเดิมที่มีอยู่ (Find or Create)
 * 3. DELETE - ลบห้องแชทและข้อความทั้งหมดในห้องนั้น ( Cascading Delete )
 * ==============================================================================
 */

// ==============================================================================
// 1. GET: ดึงรายการห้องแชททั้งหมดของผู้ใช้ปัจจุบัน
// ==============================================================================
export async function GET() {
  try {
    // --------------------------------------------------------------------------
    // [1] ตรวจสอบการเข้าสู่ระบบ (Authentication Check)
    // --------------------------------------------------------------------------
    const session = await getServerSession(authOptions);
    // ถ้าผู้ใช้ไม่ได้ล็อกอิน (ไม่มี email ใน session) สั่งเบรกและคืนค่า HTTP 401 Unauthorized
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
    }

    // --------------------------------------------------------------------------
    // [2] ดึงข้อมูลผู้ใช้งานจากฐานข้อมูลตาราง users ด้วย Email
    // --------------------------------------------------------------------------
    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    // ถ้าไม่พบข้อมูลผู้ใช้ในตาราง users ส่ง HTTP 404 Not Found
    if (!user) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
    }

    // เช็คว่าผู้ใช้ปัจจุบันมีบทบาทเป็น นายหน้า (agent) หรือไม่
    const isAgent = user.role_id === 'agent';
    // กำหนดจำนวนข้อความสูงสุดที่จะดึงในตอนแรกต่อ 1 ห้อง (เพื่อไม่ให้แอปโหลดช้า)
    const MESSAGE_PAGE_SIZE = 30;

    // --------------------------------------------------------------------------
    // [3] ค้นหาห้องแชททั้งหมดที่เกี่ยวข้องกับผู้ใช้ (Prisma Relations & Include)
    // --------------------------------------------------------------------------
    const sessions = await db.chat_sessions.findMany({
      // เงื่อนไข: ถ้าเป็น Agent ดึงห้องที่ agent_id ตรงกัน ถ้าเป็น Customer ดึงห้องที่ customer_id ตรงกัน
      where: isAgent ? { agent_id: user.id } : { customer_id: user.id },
      include: {
        // ดึงข้อมูลผู้ใช้ฝั่ง ลูกค้า (Customer)
        users_chat_sessions_customer_idTousers: {
          select: { id: true, first_name: true, last_name: true, profile_image: true }
        },
        // ดึงข้อมูลผู้ใช้ฝั่ง นายหน้า (Agent)
        users_chat_sessions_agent_idTousers: {
          select: { id: true, first_name: true, last_name: true, profile_image: true }
        },
        // ดึงข้อมูลอสังหาริมทรัพย์ พร้อมรูปภาพแรก ( order_index น้อยที่สุด )
        properties: {
          include: {
            property_images: { orderBy: { order_index: 'asc' }, take: 1 }
          }
        },
        // ดึงข้อความในห้องแชทล่าสุด 30 ข้อความ เรียงจากใหม่ไปเก่า (desc)
        messages: {
          orderBy: { created_at: 'desc' },
          take: MESSAGE_PAGE_SIZE
        }
      },
      // เรียงลำดับรายการห้องแชทจากใหม่ไปเก่าตามเวลาสร้าง
      orderBy: { created_at: 'desc' }
    });

    // ดึงเอาเฉพาะ ID ของห้องแชททั้งหมดมารวบรวมเป็น Array string[]
    const sessionIds = sessions.map(s => s.id);

    // --------------------------------------------------------------------------
    // [4] คำนวณจำนวนข้อความทั้งหมดในแต่ละห้อง (Prisma groupBy)
    // --------------------------------------------------------------------------
    // เอาไว้วัดว่าข้อความใน DB มีเกิน 30 ข้อความหรือไม่ (ถ้ามี hasMoreMessages = true)
    const totalCounts = sessionIds.length
      ? await db.messages.groupBy({
          by: ['session_id'],
          where: { session_id: { in: sessionIds } },
          _count: { _all: true }
        })
      : [];
    // แปลงผลลัพธ์เป็น Map<sessionId, totalCount> เพื่อให้ค้นหาค่าได้รวดเร็ว (O(1))
    const totalCountMap = new Map(totalCounts.map(c => [c.session_id, c._count._all]));

    // --------------------------------------------------------------------------
    // [5] คำนวณจำนวนข้อความที่ยังไม่ได้อ่าน (Unread Messages Count)
    // --------------------------------------------------------------------------
    // กรองเฉพาะข้อความที่ sender_id ไม่ใช่ตัวเราเอง และ is_read เป็น false
    const unreadCounts = sessionIds.length
      ? await db.messages.groupBy({
          by: ['session_id'],
          where: {
            session_id: { in: sessionIds },
            sender_id: { not: user.id }, // ผู้ส่งต้องไม่ใช่ตัวผู้ใช้ปัจจุบัน
            is_read: false               // สถานะต้องยังไม่ได้อ่าน
          },
          _count: { _all: true }
        })
      : [];
    // แปลงผลลัพธ์เป็น Map<sessionId, unreadCount>
    const unreadCountMap = new Map(unreadCounts.map(c => [c.session_id, c._count._all]));

    // --------------------------------------------------------------------------
    // [6] แปลงโครงสร้างข้อมูล (Data Mapping) ส่งให้ Frontend
    // --------------------------------------------------------------------------
    const formatted = sessions.map(s => {
      // กลับลำดับข้อความจาก (ใหม่->เก่า) เป็น (เก่า->ใหม่) เพื่อแสดงเรียงตามเวลาจริง
      s.messages.reverse();

      // เช็คว่ามีข้อความเก่าใน DB มากกว่า 30 ข้อความที่ดึงมาหรือไม่
      const hasMoreMessages = (totalCountMap.get(s.id) || 0) > s.messages.length;
      
      // ระบุคู่สนทนา (ถ้าเราเป็น Agent ดึงข้อมูล Customer / ถ้าเราเป็น Customer ดึงข้อมูล Agent)
      const otherUser = isAgent ? s.users_chat_sessions_customer_idTousers : s.users_chat_sessions_agent_idTousers;
      const otherName = otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : (isAgent ? 'ลูกค้า' : 'นายหน้า');
      
      // รูปโปรไฟล์คู่สนทนา (ถ้าไม่มีรูปใน DB ให้ใช้อวตารชั่วคราวจาก UI-Avatars)
      const avatarUrl = otherUser?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=1d4ed8&color=fff`;
      // รูปอสังหาริมทรัพย์ (ถ้าไม่มีรูปใน DB ให้ใช้รูปภาพตั้งต้นจาก Unsplash)
      const propImage = s.properties?.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
      
      // ดึงข้อความล่าสุดมาทำ Text Preview (พรีวิวข้อความ, 📎 ไฟล์แนบ, หรือ 📍 ตำแหน่งที่แชร์)
      const lastMsg = s.messages[s.messages.length - 1];
      const lastMsgPreview = lastMsg 
        ? (lastMsg.content || (lastMsg.file_url ? '📎 ไฟล์แนบ' : lastMsg.latitude ? '📍 ตำแหน่งที่แชร์' : ''))
        : 'เริ่มบทสนทนาใหม่';

      // ดึงจำนวนข้อความยังไม่ได้อ่านของห้องนี้
      const unreadCount = unreadCountMap.get(s.id) || 0;

      return {
        id: s.id,
        name: otherName,
        avatar: avatarUrl,
        lastMessage: lastMsgPreview,
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount,
        hasMoreMessages,
        propertyId: s.property_id,
        propertyTitle: s.properties?.title || 'อสังหาฯ ที่สนใจ',
        propertyPrice: s.properties ? '฿' + Number(s.properties.price).toLocaleString() : '',
        propertyImage: propImage,
        // แปลงโครงสร้างรายการข้อความย่อยแต่ละข้อความในห้อง
        messages: s.messages.map(m => ({
          id: m.id,
          sender: m.sender_id === user.id ? 'user' : 'other', // แยกผู้ส่งว่าเป็นตัวเรา ('user') หรืออีกฝ่าย ('other')
          text: m.content || '',
          fileUrl: m.file_url,
          latitude: m.latitude ? Number(m.latitude) : null,
          longitude: m.longitude ? Number(m.longitude) : null,
          isRead: m.is_read,
          time: new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        }))
      };
    });

    // ส่งข้อมูลรายการห้องแชททั้งหมดกลับไปให้ Frontend ( HTTP 200 OK )
    return NextResponse.json({ success: true, sessions: formatted });

  } catch (error) {
    const err = error as Error;
    console.error('Fetch Chat Sessions Error:', err);
    // หากเกิด Error ฝั่ง Server สั่งคืนค่า HTTP 500 Internal Server Error
    return NextResponse.json({ error: 'ดึงข้อมูลห้องแชทล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// ==============================================================================
// 2. POST: สร้างห้องแชทใหม่ หรือ ดึงห้องแชทเดิมที่มีอยู่ (Find or Create Pattern)
// ==============================================================================
export async function POST(request: Request) {
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
    // [2] รับและตรวจสอบ Request Body (JSON)
    // --------------------------------------------------------------------------
    const body = await request.json();
    const { propertyId, agentId } = body;

    // ถ้าไม่มีการส่ง propertyId มา ให้ส่ง HTTP 400 Bad Request
    if (!propertyId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสอสังหาริมทรัพย์' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [3] ค้นหาอสังหาริมทรัพย์เพื่อเช็คว่ามีจริง และระบุนายหน้าผู้ดูแล
    // --------------------------------------------------------------------------
    const property = await db.properties.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json({ error: 'ไม่พบอสังหาริมทรัพย์นี้' }, { status: 404 });
    }

    // หาก agentId ไม่ได้ถูกส่งมาจาก Body ให้ดึง agent_id ของบ้านหลังนั้นโดยตรง
    const targetAgentId = agentId || property.agent_id;
    if (!targetAgentId) {
      return NextResponse.json({ error: 'อสังหาริมทรัพย์นี้ยังไม่มีนายหน้าดูแล' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [4] ค้นหาห้องแชทเดิมที่มีอยู่แล้ว (Find)
    // --------------------------------------------------------------------------
    let chatSession = await db.chat_sessions.findFirst({
      where: {
        customer_id: user.id,
        agent_id: targetAgentId,
        property_id: property.id
      }
    });

    // --------------------------------------------------------------------------
    // [5] ถ้ายังไม่มีห้องแชทเดิม ให้สร้างใหม่ในตาราง chat_sessions (Create)
    // --------------------------------------------------------------------------
    if (!chatSession) {
      chatSession = await db.chat_sessions.create({
        data: {
          customer_id: user.id,
          agent_id: targetAgentId,
          property_id: property.id
        }
      });
    }

    // ส่งคืน sessionId ให้ Frontend นำไปเปลี่ยนหน้าแชท ( HTTP 200 OK )
    return NextResponse.json({ success: true, sessionId: chatSession.id });

  } catch (error) {
    const err = error as Error;
    console.error('Create Chat Session Error:', err);
    return NextResponse.json({ error: 'สร้างห้องแชทล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// ==============================================================================
// 3. DELETE: ลบห้องแชทและข้อความทั้งหมดในห้องนั้น (Cascading Delete)
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
    // [2] ดึง Query Parameter "sessionId" จาก URL (เช่น /api/chat/sessions?sessionId=xxx)
    // --------------------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทที่ต้องการลบ' }, { status: 400 });
    }

    // --------------------------------------------------------------------------
    // [3] ค้นหาห้องแชทใน DB เพื่อตรวจสอบว่ามีอยู่จริงหรือไม่
    // --------------------------------------------------------------------------
    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชทนี้' }, { status: 404 });
    }

    // --------------------------------------------------------------------------
    // [4] ตรวจสอบสิทธิ์การลบ (Authorization): ต้องเป็น Customer หรือ Agent ของห้องนี้เท่านั้น
    // --------------------------------------------------------------------------
    if (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id) {
      // หากไม่ใช่คู่สนทนาในห้องแชท สั่งบล็อกด้วย HTTP 403 Forbidden
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบห้องแชทนี้' }, { status: 403 });
    }

    // --------------------------------------------------------------------------
    // [5] ลบข้อความแชทข้างในก่อน แล้วค่อยลบตัวห้องแชท ( Cascading Delete Logic )
    // --------------------------------------------------------------------------
    // ลบข้อความทั้งหมดในห้องแชทก่อน เพื่อป้องกัน Foreign Key Error ในฐานข้อมูล
    await db.messages.deleteMany({
      where: { session_id: sessionId }
    });

    // ลบตัวห้องแชทออกจากตาราง chat_sessions
    await db.chat_sessions.delete({
      where: { id: sessionId }
    });

    return NextResponse.json({ success: true, message: 'ลบห้องแชทเรียบร้อยแล้ว' });

  } catch (error) {
    const err = error as Error;
    console.error('Delete Chat Session Error:', err);
    return NextResponse.json({ error: 'ลบห้องแชทล้มเหลว: ' + err.message }, { status: 500 });
  }
}


