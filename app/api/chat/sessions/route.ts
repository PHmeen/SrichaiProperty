import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

// GET: ดึงรายการห้องแชททั้งหมดของผู้ใช้ที่ล็อกอินอยู่ (ลูกค้า หรือ นายหน้า)
export async function GET() {
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

    const isAgent = user.role_id === 'agent';
    const MESSAGE_PAGE_SIZE = 30;

    const sessions = await db.chat_sessions.findMany({
      where: isAgent ? { agent_id: user.id } : { customer_id: user.id },
      include: {
        users_chat_sessions_customer_idTousers: {
          select: { id: true, first_name: true, last_name: true, profile_image: true }
        },
        users_chat_sessions_agent_idTousers: {
          select: { id: true, first_name: true, last_name: true, profile_image: true }
        },
        properties: {
          include: {
            property_images: { orderBy: { order_index: 'asc' }, take: 1 }
          }
        },
        // โหลดเฉพาะข้อความล่าสุด N รายการต่อห้อง กันหน้าโหลดช้าเมื่อห้องมีประวัติแชทยาวมาก
        // (ข้อความเก่ากว่านี้โหลดเพิ่มทีหลังผ่าน GET /api/chat/messages?sessionId=...&before=...)
        messages: {
          orderBy: { created_at: 'desc' },
          take: MESSAGE_PAGE_SIZE
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const sessionIds = sessions.map(s => s.id);

    // นับจำนวนข้อความทั้งหมดต่อห้อง (เทียบกับจำนวนที่โหลดมา เพื่อรู้ว่ายังมีข้อความเก่ากว่านี้ให้โหลดเพิ่มไหม)
    const totalCounts = sessionIds.length
      ? await db.messages.groupBy({ by: ['session_id'], where: { session_id: { in: sessionIds } }, _count: { _all: true } })
      : [];
    const totalCountMap = new Map(totalCounts.map(c => [c.session_id, c._count._all]));

    // นับข้อความที่ยังไม่อ่านจากฐานข้อมูลทั้งหมด (ไม่ใช่แค่ใน 30 ข้อความล่าสุดที่โหลดมาแสดง)
    const unreadCounts = sessionIds.length
      ? await db.messages.groupBy({
          by: ['session_id'],
          where: { session_id: { in: sessionIds }, sender_id: { not: user.id }, is_read: false }
        , _count: { _all: true } })
      : [];
    const unreadCountMap = new Map(unreadCounts.map(c => [c.session_id, c._count._all]));

    const formatted = sessions.map(s => {
      // กลับลำดับข้อความที่โหลดมา (desc -> asc) เพื่อแสดงเก่าไปใหม่ตามปกติ
      s.messages.reverse();
      const hasMoreMessages = (totalCountMap.get(s.id) || 0) > s.messages.length;
      const otherUser = isAgent ? s.users_chat_sessions_customer_idTousers : s.users_chat_sessions_agent_idTousers;
      const otherName = otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : (isAgent ? 'ลูกค้า' : 'นายหน้า');
      const avatarUrl = otherUser?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=1d4ed8&color=fff`;
      const propImage = s.properties?.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
      const lastMsg = s.messages[s.messages.length - 1];
      const lastMsgPreview = lastMsg ? (lastMsg.content || (lastMsg.file_url ? '📎 ไฟล์แนบ' : lastMsg.latitude ? '📍 ตำแหน่งที่แชร์' : '')) : 'เริ่มบทสนทนาใหม่';
      const unreadCount = unreadCountMap.get(s.id) || 0;

      return {
        id: s.id,
        name: otherName,
        avatar: avatarUrl,
        lastMessage: lastMsgPreview,
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
        isActive: true,
        unreadCount,
        hasMoreMessages,
        propertyId: s.property_id,
        propertyTitle: s.properties?.title || 'อสังหาฯ ที่สนใจ',
        propertyPrice: s.properties ? '฿' + Number(s.properties.price).toLocaleString() : '',
        propertyImage: propImage,
        messages: s.messages.map(m => ({
          id: m.id,
          sender: m.sender_id === user.id ? 'user' : 'other',
          text: m.content || '',
          fileUrl: m.file_url,
          latitude: m.latitude ? Number(m.latitude) : null,
          longitude: m.longitude ? Number(m.longitude) : null,
          isRead: m.is_read,
          time: new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        }))
      };
    });

    return NextResponse.json({ success: true, sessions: formatted });
  } catch (error) {
    const err = error as Error;
    console.error('Fetch Chat Sessions Error:', err);
    return NextResponse.json({ error: 'ดึงข้อมูลห้องแชทล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// POST: สร้างห้องแชทใหม่ หรือ ดึงห้องแชทเดิมที่มีอยู่
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
    const { propertyId, agentId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสอสังหาริมทรัพย์' }, { status: 400 });
    }

    // ค้นหาอสังหาริมทรัพย์เพื่อเอา agent_id ถ้าไม่ได้ส่งมา
    const property = await db.properties.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json({ error: 'ไม่พบอสังหาริมทรัพย์นี้' }, { status: 404 });
    }

    const targetAgentId = agentId || property.agent_id;
    if (!targetAgentId) {
      return NextResponse.json({ error: 'อสังหาริมทรัพย์นี้ยังไม่มีนายหน้าดูแล' }, { status: 400 });
    }

    // ค้นหาห้องแชทเดิม
    let chatSession = await db.chat_sessions.findFirst({
      where: {
        customer_id: user.id,
        agent_id: targetAgentId,
        property_id: property.id
      }
    });

    // ถ้ายังไม่มีห้อง ให้สร้างขึ้นใหม่
    if (!chatSession) {
      chatSession = await db.chat_sessions.create({
        data: {
          customer_id: user.id,
          agent_id: targetAgentId,
          property_id: property.id
        }
      });
    }

    return NextResponse.json({ success: true, sessionId: chatSession.id });
  } catch (error) {
    const err = error as Error;
    console.error('Create Chat Session Error:', err);
    return NextResponse.json({ error: 'สร้างห้องแชทล้มเหลว: ' + err.message }, { status: 500 });
  }
}

// DELETE: ลบห้องแชทและข้อความทั้งหมดในห้องนั้น
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
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสห้องแชทที่ต้องการลบ' }, { status: 400 });
    }

    const chatSession = await db.chat_sessions.findUnique({
      where: { id: sessionId }
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'ไม่พบห้องแชทนี้' }, { status: 404 });
    }

    if (chatSession.customer_id !== user.id && chatSession.agent_id !== user.id) {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบห้องแชทนี้' }, { status: 403 });
    }

    // ลบข้อความทั้งหมดในห้องแชทก่อน
    await db.messages.deleteMany({
      where: { session_id: sessionId }
    });

    // ลบตัวห้องแชท
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

