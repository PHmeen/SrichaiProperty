import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';

// ฟังก์ชันดึงประวัตินายหน้าจาก Session
async function getAgent() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  return await db.users.findUnique({
    where: { email: session.user.email }
  });
}

// GET: บริการข้อมูลพอร์ทัลนายหน้าสำหรับหน้าแรก หน้าแผงควบคุม และหน้าแชท
export async function GET(request: Request) {
  try {
    const agent = await getAgent();
    if (!agent || agent.role_id !== 'agent') {
      return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // 1. หน้าแรกของนายหน้า (Home View)
    if (type === 'home') {
      const propertiesCount = await db.properties.count({
        where: { agent_id: agent.id }
      });

      const pendingAptsCount = await db.appointments.count({
        where: { agent_id: agent.id, status: 'pending' }
      });

      const appointments = await db.appointments.findMany({
        where: { agent_id: agent.id },
        include: {
          properties: true,
          users_appointments_customer_idTousers: {
            select: { first_name: true, last_name: true }
          }
        },
        orderBy: { appointment_date: 'asc' },
        take: 10
      });

      const formattedApts = appointments.map(apt => {
        const customer = apt.users_appointments_customer_idTousers;
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'ลูกค้าทั่วไป';
        return {
          id: apt.id,
          status: apt.status === 'approved' ? 'completed' : 'pending',
          time: apt.time_slot === 'morning' ? '10:00 น.' : '14:00 น.',
          title: apt.status === 'approved' ? '📞 โทรติดตามลูกค้า (Follow-up)' : '🏠 พาลูกค้าดูสถานที่จริง (Site Visit)',
          detail: `${customerName} - สนใจ ${apt.properties?.title || 'อสังหาฯ'}`,
          note: apt.note ? `บันทึก: ${apt.note}` : 'ยังไม่มีบันทึกนัดหมายเพิ่มเติม',
          propertyTitle: apt.properties?.title || 'อสังหาฯ',
          propertyCode: apt.property_id ? apt.property_id.substring(0, 7).toUpperCase() : 'PR-XXXX',
          customerName
        };
      });

      return NextResponse.json({
        propertiesCount,
        pendingAptsCount,
        appointments: formattedApts
      });
    }

    // 2. หน้าแผงควบคุม (Dashboard View)
    if (type === 'dashboard') {
      const properties = await db.properties.findMany({
        where: { agent_id: agent.id },
        include: {
          property_types: true,
          property_images: {
            orderBy: { order_index: 'asc' },
            take: 1
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const pendingAptsCount = await db.appointments.count({
        where: { agent_id: agent.id, status: 'pending' }
      });

      // คำนวณราคารวมพอร์ตโฟลิโอ
      let totalPortfolioValue = 0;
      properties.forEach(p => {
        if (p.status === 'approved') {
          totalPortfolioValue += Number(p.price);
        }
      });

      const formattedProperties = properties.map(p => ({
        id: p.id,
        title: p.title,
        price: '฿' + Number(p.price).toLocaleString(),
        type: p.property_types?.name || 'บ้านเดี่ยว',
        status: p.status === 'approved' ? 'approved' : 'pending',
        image: p.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
        views: Math.floor(Math.random() * 800) + 150, // จำลองยอดวิวแบบสุ่มเป็นตัวเลขสถิติประกอบ
        appointments: Math.floor(Math.random() * 3)
      }));

      return NextResponse.json({
        properties: formattedProperties,
        totalPortfolioValue: (totalPortfolioValue / 1000000).toFixed(1) + ' ลบ.',
        pendingAptsCount,
        totalCount: properties.length
      });
    }

    // 3. หน้าระบบห้องแชท (Chat View)
    if (type === 'chat') {
      const sessions = await db.chat_sessions.findMany({
        where: { agent_id: agent.id },
        include: {
          users_chat_sessions_customer_idTousers: {
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
        }
      });

      const formattedContacts = sessions.map(session => {
        const customer = session.users_chat_sessions_customer_idTousers;
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'ลูกค้าในระบบ';
        const lastMsg = session.messages[session.messages.length - 1];
        const propImage = session.properties?.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=120&q=80';

        return {
          id: session.id,
          name: customerName,
          avatarLetter: customerName.charAt(0),
          avatarUrl: customer?.profile_image || undefined,
          status: 'online',
          lastMessageSnippet: lastMsg?.content || 'เริ่มห้องสนทนาใหม่',
          lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '00:00',
          propertyCode: session.property_id ? session.property_id.substring(0, 7).toUpperCase() : 'SC-XXX',
          propertyName: session.properties?.title || 'อสังหาฯ ที่ลูกค้าสนใจ',
          propertyPrice: '฿' + Number(session.properties?.price || 0).toLocaleString(),
          propertyImage: propImage,
          unreadCount: 0,
          hasAppointment: false,
          messages: session.messages.map(m => ({
            id: m.id,
            sender: m.sender_id === agent.id ? 'agent' : 'client',
            content: m.content || '',
            time: new Date(m.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
            isRead: true
          }))
        };
      });

      return NextResponse.json(formattedContacts);
    }

    return NextResponse.json({ error: 'ไม่พบประเภทคำขอดังกล่าว' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลระบบนายหน้าได้: ' + err.message }, { status: 500 });
  }
}

// POST: บันทึกข้อความแชทใหม่ลงฐานข้อมูล
export async function POST(request: Request) {
  try {
    const agent = await getAgent();
    if (!agent || agent.role_id !== 'agent') {
      return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, content } = body;

    if (!sessionId || !content) {
      return NextResponse.json({ error: 'กรุณากรอกข้อมูลห้องสนทนาและข้อความให้ครบถ้วน' }, { status: 400 });
    }

    const newMessage = await db.messages.create({
      data: {
        session_id: sessionId,
        sender_id: agent.id,
        content: content
      }
    });

    return NextResponse.json({
      id: newMessage.id,
      sender: 'agent',
      content: newMessage.content,
      time: new Date(newMessage.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase(),
      isRead: true
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'บันทึกข้อความลงฐานข้อมูลล้มเหลว: ' + err.message }, { status: 500 });
  }
}
