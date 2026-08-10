import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
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
    // ตรวจสอบว่าบัญชีนายหน้าไม่ได้ถูกแบนหรือถูกระงับ
    if (agent.status === 'banned' || agent.status === 'suspended') {
      return NextResponse.json({ error: 'บัญชีนายหน้าของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, { status: 403 });
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

      const viewsAgg = await db.properties.aggregate({
        where: { agent_id: agent.id },
        _sum: { views_count: true }
      });
      const totalViews = viewsAgg._sum.views_count || 0;

      // ห้องแชทที่ข้อความล่าสุดมาจากลูกค้า (ยังไม่มีการตอบกลับจากนายหน้า) ถือว่า "รอตอบ"
      const chatSessionsForReply = await db.chat_sessions.findMany({
        where: { agent_id: agent.id },
        include: { messages: { orderBy: { created_at: 'desc' }, take: 1 } }
      });
      const pendingChatCount = chatSessionsForReply.filter(
        s => s.messages[0] && s.messages[0].sender_id !== agent.id
      ).length;

      const pendingProperties = await db.properties.findMany({
        where: { agent_id: agent.id, status: 'pending' },
        select: { id: true, title: true, price: true, created_at: true },
        orderBy: { created_at: 'desc' }
      });

      const appointments = await db.appointments.findMany({
        where: { agent_id: agent.id },
        include: {
          properties: true,
          users_appointments_customer_idTousers: {
            select: { first_name: true, last_name: true, phone: true }
          }
        },
        orderBy: { appointment_date: 'asc' },
        take: 10
      });

      const formattedApts = appointments.map(apt => {
        const customer = apt.users_appointments_customer_idTousers;
        const customerName = customer 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() 
          : 'ลูกค้าทั่วไป';
        const customerPhone = customer?.phone || '-';
        const aptDateStr = apt.appointment_date ? apt.appointment_date.toISOString().split('T')[0] : '';
        return {
          id: apt.id,
          status: apt.status === 'approved' || apt.status === 'completed' ? 'completed' : 'pending',
          rawStatus: apt.status,
          date: aptDateStr,
          timeSlot: apt.time_slot || 'ไม่ระบุเวลา',
          time: apt.time_slot === 'morning' ? '10:00 น.' : apt.time_slot === 'afternoon' ? '14:00 น.' : (apt.time_slot || 'ไม่ระบุเวลา'),
          title: apt.status === 'approved' || apt.status === 'completed' ? '✓ นัดหมายสำเร็จแล้ว' : '🏠 นัดชมสถานที่จริง (Site Visit)',
          detail: `${customerName} (📞 ${customerPhone}) - สนใจ ${apt.properties?.title || 'อสังหาฯ'}`,
          note: apt.note ? `บันทึก: ${apt.note}` : 'ยังไม่มีบันทึกนัดหมายเพิ่มเติม',
          propertyTitle: apt.properties?.title || 'อสังหาฯ',
          propertyCode: apt.property_id ? apt.property_id.substring(0, 7).toUpperCase() : 'PR-XXXX',
          customerName,
          customerPhone
        };
      });

      const isPro = agent.plan_type === 'pro' && (!agent.plan_expired_at || new Date(agent.plan_expired_at) > new Date());

      return NextResponse.json({
        propertiesCount,
        pendingAptsCount,
        pendingApprovalCount: pendingProperties.length,
        totalViews,
        pendingChatCount,
        planType: agent.plan_type || 'basic',
        isPro,
        planExpiredAt: agent.plan_expired_at,
        pendingApprovalProperties: pendingProperties.map(p => ({
          id: p.id,
          title: p.title,
          price: '฿' + Number(p.price).toLocaleString(),
          createdAt: p.created_at
        })),
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
          },
          _count: { 
            select: { 
              appointments: true,
              chat_sessions: true,
              saved_properties: true
            } 
          }
        },
        orderBy: { created_at: 'desc' }
      });

      const pendingAptsCount = await db.appointments.count({
        where: { agent_id: agent.id, status: 'pending' }
      });

      // คำนวณราคารวมพอร์ตโฟลิโอ และยอดเข้าชมรวมของทุกประกาศ
      let totalPortfolioValue = 0;
      let totalViews = 0;
      properties.forEach(p => {
        if (p.status === 'approved') {
          totalPortfolioValue += Number(p.price);
        }
        totalViews += p.views_count;
      });

      // ดึงสถิติตามช่วงเวลา (Appointments, Chats, Saves) ของแต่ละทรัพย์
      const propertyIds = properties.map(p => p.id);
      
      const [allAppointments, allChats, allSaves] = await Promise.all([
        db.appointments.findMany({
          where: { property_id: { in: propertyIds } },
          include: {
            users_appointments_customer_idTousers: {
              select: { first_name: true, last_name: true, phone: true }
            }
          },
          orderBy: { appointment_date: 'asc' }
        }),
        db.chat_sessions.findMany({
          where: { property_id: { in: propertyIds } },
          select: { property_id: true, created_at: true }
        }),
        db.saved_properties.findMany({
          where: { property_id: { in: propertyIds } },
          select: { property_id: true, created_at: true }
        })
      ]);

      const formattedProperties = properties.map(p => {
        const propApts = allAppointments.filter(a => a.property_id === p.id);
        const propChats = allChats.filter(c => c.property_id === p.id);
        const propSaves = allSaves.filter(s => s.property_id === p.id);

        return {
          id: p.id,
          title: p.title,
          price: '฿' + Number(p.price).toLocaleString(),
          rawPrice: Number(p.price),
          type: p.property_types?.name || 'บ้านเดี่ยว',
          status: p.status,
          rejectReason: p.reject_reason || null,
          location: p.location,
          bedrooms: p.bedrooms || 0,
          bathrooms: p.bathrooms || 0,
          area_sqm: p.area_sqm ? Number(p.area_sqm) : 0,
          image: p.property_images[0]?.image_url || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
          views: p.views_count,
          appointments: p._count.appointments,
          chatsCount: p._count.chat_sessions,
          savesCount: p._count.saved_properties,
          createdAt: p.created_at,
          rawAppointments: propApts.map(a => a.created_at.toISOString()),
          rawChats: propChats.map(c => c.created_at.toISOString()),
          rawSaves: propSaves.map(s => s.created_at.toISOString()),
          // รายชื่อลูกค้านัดหมายเข้าชมบ้านหลังนี้โดยเฉพาะ
          appointmentLeads: propApts.map(a => ({
            id: a.id,
            date: a.appointment_date ? a.appointment_date.toISOString().split('T')[0] : '',
            timeSlot: a.time_slot || 'ไม่ระบุเวลา',
            status: a.status || 'pending',
            customerName: a.users_appointments_customer_idTousers 
              ? `${a.users_appointments_customer_idTousers.first_name || ''} ${a.users_appointments_customer_idTousers.last_name || ''}`.trim() 
              : 'ลูกค้าทั่วไป',
            customerPhone: a.users_appointments_customer_idTousers?.phone || '-'
          }))
        };
      });

      // ดึงนัดหมายล่าสุด 5 รายการ
      const recentAppointments = await db.appointments.findMany({
        where: { agent_id: agent.id },
        include: {
          properties: true,
          users_appointments_customer_idTousers: {
            select: { first_name: true, last_name: true, phone: true }
          }
        },
        orderBy: { appointment_date: 'asc' },
        take: 5
      });

      // ดึงแชทที่รอนายหน้าตอบกลับ
      const chatSessionsForReply = await db.chat_sessions.findMany({
        where: { agent_id: agent.id },
        include: { messages: { orderBy: { created_at: 'desc' }, take: 1 } }
      });
      const pendingChatCount = chatSessionsForReply.filter(
        s => s.messages[0] && s.messages[0].sender_id !== agent.id
      ).length;

      const formattedAppointments = recentAppointments.map(apt => {
        const customer = apt.users_appointments_customer_idTousers;
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : 'ลูกค้าทั่วไป';
        return {
          id: apt.id,
          status: apt.status,
          date: apt.appointment_date,
          timeSlot: apt.time_slot === 'morning' ? '10:00 - 12:00 น. (ช่วงเช้า)' : '14:00 - 16:00 น. (ช่วงบ่าย)',
          propertyTitle: apt.properties?.title || 'อสังหาริมทรัพย์',
          customerName,
          customerPhone: customer?.phone || '-'
        };
      });

      const isPro = agent.plan_type === 'pro' && (!agent.plan_expired_at || new Date(agent.plan_expired_at) > new Date());

      const pendingProperties = formattedProperties.filter(p => p.status === 'pending');

      return NextResponse.json({
        properties: formattedProperties,
        pendingApprovalCount: pendingProperties.length,
        pendingApprovalProperties: pendingProperties,
        totalPortfolioValue: (totalPortfolioValue / 1000000).toFixed(1) + ' ลบ.',
        pendingAptsCount,
        totalViews,
        totalCount: properties.length,
        planType: agent.plan_type || 'basic',
        isPro,
        planExpiredAt: agent.plan_expired_at,
        recentAppointments: formattedAppointments,
        pendingChatCount
      });
    }

    // หมายเหตุ: ห้องแชท (type=chat) ถูกย้ายไปรวมศูนย์ที่ /api/chat/sessions และ /api/chat/messages
    // แล้ว (ใช้ร่วมกับฝั่งลูกค้า) เพื่อลดโค้ดซ้ำซ้อน — ดูหน้า app/agent/chat/page.tsx

    return NextResponse.json({ error: 'ไม่พบประเภทคำขอดังกล่าว' }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลระบบนายหน้าได้: ' + err.message }, { status: 500 });
  }
}
