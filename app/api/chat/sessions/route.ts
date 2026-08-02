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
        messages: {
          orderBy: { created_at: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = sessions.map(s => {
      const otherUser = isAgent ? s.users_chat_sessions_customer_idTousers : s.users_chat_sessions_agent_idTousers;
      const otherName = otherUser ? `${otherUser.first_name} ${otherUser.last_name}`.trim() : (isAgent ? 'ลูกค้า' : 'นายหน้า');
      const avatarUrl = otherUser?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherName)}&background=1d4ed8&color=fff`;
      const propImage = s.properties?.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80';
      const lastMsg = s.messages[s.messages.length - 1];

      return {
        id: s.id,
        name: otherName,
        avatar: avatarUrl,
        lastMessage: lastMsg?.content || 'เริ่มบทสนทนาใหม่',
        time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '',
        isActive: true,
        propertyId: s.property_id,
        propertyTitle: s.properties?.title || 'อสังหาฯ ที่สนใจ',
        propertyPrice: s.properties ? '฿' + Number(s.properties.price).toLocaleString() : '',
        propertyImage: propImage,
        messages: s.messages.map(m => ({
          id: m.id,
          sender: m.sender_id === user.id ? 'user' : 'other',
          text: m.content || '',
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
