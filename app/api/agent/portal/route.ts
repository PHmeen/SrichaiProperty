import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อระบุตัวนายหน้าที่ล็อกอินอยู่
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงข้อมูลของนายหน้าในหน้าพอร์ทัล

/**
 * ==============================================================================
 * ฟังก์ชันผู้ช่วย: getAgent()
 * ==============================================================================
 * หน้าที่: ตรวจสอบและดึงข้อมูลโปรไฟล์ของนายหน้า (Agent) ที่กำลังล็อกอินอยู่ในปัจจุบัน
 * 
 * กระบวนการทำงาน (Step-by-step for Exam/Presentation):
 * 1. ดึง Session จาก NextAuth ด้วย `getServerSession(authOptions)` เพื่อดูว่าผู้ใช้ล็อกอินอยู่หรือไม่
 * 2. หากไม่มี Session หรือไม่มี Email ใน Session จะคืนค่า `null` (แสดงว่าไม่ได้ล็อกอิน)
 * 3. ค้นหาข้อมูลผู้ใช้ในฐานข้อมูล (ตาราง `users`) ผ่าน Prisma ORM โดยใช้ `email` เป็นเงื่อนไข
 * 4. คืนค่าวัตถุข้อมูลผู้ใช้ (User Object) กลับไป
 * ==============================================================================
 */
async function getAgent() {
  // ดึงข้อมูล Session ปัจจุบันของผู้ใช้จาก Server Side
  const session = await getServerSession(authOptions);
  
  // หากไม่ได้เข้าสู่ระบบ หรือ Session ไม่สมบูรณ์ ให้รีเทิร์น null
  if (!session?.user?.email) return null;

  // ค้นหาข้อมูลในตาราง users โดยเทียบ email
  return await db.users.findUnique({
    where: { email: session.user.email }
  });
}

/**
 * ==============================================================================
 * HTTP GET Method: /api/agent/portal
 * ==============================================================================
 * หน้าที่: API รวบรวมข้อมูลหลังบ้านสำหรับระบบ Agent Portal (หน้าแรก และ หน้า Dashboard แผงควบคุม)
 * 
 * Query Parameter ที่รองรับ:
 * - `?type=home`: ดึงข้อมูลสรุปภาพรวม สำหรับหน้าแรกของนายหน้า (Agent Home View)
 * - `?type=dashboard`: ดึงข้อมูลเชิงลึกและรายการอสังหาริมทรัพย์ สำหรับหน้าแผงควบคุม (Agent Dashboard View)
 * ==============================================================================
 */
export async function GET(request: Request) {
  try {
    // --------------------------------------------------------------------------
    // [ส่วนที่ 1: การตรวจสอบสิทธิ์การใช้งาน (Authentication & Authorization Guard)]
    // --------------------------------------------------------------------------
    
    // 1.1 ตรวจสอบว่าผู้ใช้ล็อกอินหรือไม่ และมีสิทธิ์เป็น "นายหน้า" (role_id === 'agent') หรือไม่
    const agent = await getAgent();
    if (!agent || agent.role_id !== 'agent') {
      return NextResponse.json(
        { error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, 
        { status: 401 } // 401 Unauthorized
      );
    }

    // 1.2 ตรวจสอบสถานะบัญชีนายหน้า (ระงับการใช้งาน / แบน)
    if (agent.status === 'banned' || agent.status === 'suspended') {
      return NextResponse.json(
        { error: 'บัญชีนายหน้าของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }, 
        { status: 403 } // 403 Forbidden
      );
    }

    // 1.3 ดึง Query String จาก URL เช่น /api/agent/portal?type=home
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // ==========================================================================
    // [ส่วนที่ 2: โหมดที่ 1 - หน้าแรกของนายหน้า (type === 'home')]
    // ==========================================================================
    if (type === 'home') {
      // 2.1 นับจำนวนอสังหาริมทรัพย์ทั้งหมดที่เป็นของนายหน้ารายนี้
      const propertiesCount = await db.properties.count({
        where: { agent_id: agent.id }
      });

      // 2.2 นับจำนวนนัดหมายชมสถานที่ ที่รอการตอบรับ/อนุมัติ (status = 'pending')
      const pendingAptsCount = await db.appointments.count({
        where: { agent_id: agent.id, status: 'pending' }
      });

      // 2.3 คำนวณผลรวมยอดเข้าชมทั้งหมด (Total Views) ของอสังหาฯ ทุกรายการของนายหน้ารายนี้
      const viewsAgg = await db.properties.aggregate({
        where: { agent_id: agent.id },
        _sum: { views_count: true }
      });
      const totalViews = viewsAgg._sum.views_count || 0;

      // 2.4 คำนวณจำนวนห้องแชทที่ "รอการตอบกลับจากนายหน้า" (Pending Chat Count)
      // หลักการ: ดึงห้องแชทของนายหน้า พร้อมข้อความล่าสุด 1 ข้อความ 
      // หากข้อความล่าสุดผู้ส่งไม่ใช่ตัวนายหน้า (sender_id !== agent.id) แสดงว่าลูกค้าเพิ่งส่งมา จึงนับเป็น 1 แชทรอตอบ
      const chatSessionsForReply = await db.chat_sessions.findMany({
        where: { agent_id: agent.id },
        include: { 
          messages: { 
            orderBy: { created_at: 'desc' }, 
            take: 1 
          } 
        }
      });
      const pendingChatCount = chatSessionsForReply.filter(
        s => s.messages[0] && s.messages[0].sender_id !== agent.id
      ).length;

      // 2.5 ดึงรายการอสังหาฯ ที่ลงทะเบียนใหม่แล้วกำลังรอ Admin อนุมัติ (status = 'pending')
      const pendingProperties = await db.properties.findMany({
        where: { agent_id: agent.id, status: 'pending' },
        select: { id: true, title: true, price: true, created_at: true },
        orderBy: { created_at: 'desc' }
      });

      // 2.6 ดึงรายการนัดหมายชมสถานที่ (Appointments) ล่าสุดไม่เกิน 10 รายการ
      // พร้อมเชื่อมโยงตารางอสังหาริมทรัพย์ (properties) และข้อมูลลูกค้าผู้ขอนัดหมาย (users)
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

      // 2.7 แปลงรูปแบบข้อมูลนัดหมาย (Data Formatting) ให้เหมาะสมสำหรับแสดงผลบน Frontend
      const formattedApts = appointments.map(apt => {
        const customer = apt.users_appointments_customer_idTousers;
        // รวมชื่อ-นามสกุลลูกค้า (ถ้าไม่มีให้แสดงว่า "ลูกค้าทั่วไป")
        const customerName = customer 
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() 
          : 'ลูกค้าทั่วไป';
        const customerPhone = customer?.phone || '-';
        // แปลงวันที่เป็น YYYY-MM-DD
        const aptDateStr = apt.appointment_date ? apt.appointment_date.toISOString().split('T')[0] : '';
        
        return {
          id: apt.id,
          // จัดกลุ่มสถานะ: หากอนุมัติแล้วหรือเสร็จสิ้นแล้วให้ถือว่าเป็น completed
          status: apt.status === 'approved' || apt.status === 'completed' ? 'completed' : 'pending',
          rawStatus: apt.status,
          date: aptDateStr,
          timeSlot: apt.time_slot || 'ไม่ระบุเวลา',
          // แสดงข้อความเวลาแบบอ่านง่าย เช่น ช่วงเช้า 10:00 น., ช่วงบ่าย 14:00 น.
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

      // 2.8 ตรวจสอบสถานะแพ็กเกจสมาชิกแบบ Pro Agent (เช็คว่ายังไม่หมดอายุ)
      const isPro = agent.plan_type === 'pro' && (!agent.plan_expired_at || new Date(agent.plan_expired_at) > new Date());

      // 2.9 ส่งข้อมูลตอบกลับทั้งหมดกลับไปยัง Frontend
      return NextResponse.json({
        propertiesCount,           // จำนวนอสังหาฯ ทั้งหมดของนายหน้า
        pendingAptsCount,          // จำนวนนัดหมายที่รอดำเนินการ
        pendingApprovalCount: pendingProperties.length, // จำนวนประกาศที่รอ Admin อนุมัติ
        totalViews,                // ยอดเข้าชมรวมทั้งหมด
        pendingChatCount,          // จำนวนแชทที่รอตอบ
        planType: agent.plan_type || 'basic', // ประเภทแพ็กเกจปัจจุบัน
        isPro,                     // สถานะสิทธิ์ Pro Agent (true/false)
        planExpiredAt: agent.plan_expired_at, // วันหมดอายุแพ็กเกจ
        pendingApprovalProperties: pendingProperties.map(p => ({
          id: p.id,
          title: p.title,
          price: '฿' + Number(p.price).toLocaleString(),
          createdAt: p.created_at
        })),
        appointments: formattedApts // รายการนัดหมายที่จัดรูปแบบแล้ว
      });
    }

    // ==========================================================================
    // [ส่วนที่ 3: โหมดที่ 2 - หน้าแผงควบคุมหลักของนายหน้า (type === 'dashboard')]
    // ==========================================================================
    if (type === 'dashboard') {
      // 3.1 ดึงรายการอสังหาริมทรัพย์ทั้งหมดของนายหน้า พร้อมข้อมูลที่เกี่ยวข้อง
      const properties = await db.properties.findMany({
        where: { agent_id: agent.id },
        include: {
          property_types: true, // ประเภทอสังหาฯ (เช่น บ้านเดี่ยว, คอนโด)
          property_images: {    // ดึงรูปภาพแรกสุด 1 รูปมาทำเป็นภาพหน้าปก
            orderBy: { order_index: 'asc' },
            take: 1
          },
          _count: {
            select: {
              // นับจำนวนนัดหมาย (ยกเว้นรายการที่ถูกยกเลิก/ปฏิเสธ เพื่อให้ยอดสถิติตรงกับความเป็นจริง)
              appointments: { where: { status: { notIn: ['cancelled', 'rejected'] } } },
              chat_sessions: true,    // จำนวนห้องแชทของทรัพย์นี้
              saved_properties: true  // จำนวนผู้คนที่กดบันทึกเป็นทรัพย์โปรด
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });

      // 3.2 นับจำนวนนัดหมายที่ยังรอดำเนินการ (status = 'pending')
      const pendingAptsCount = await db.appointments.count({
        where: { agent_id: agent.id, status: 'pending' }
      });

      // 3.3 คำนวณมูลค่าพอร์ตโฟลิโอรวม (Total Portfolio Value) เฉพาะทรัพย์ที่ผ่านการอนุมัติแล้ว (approved)
      // และคำนวณยอดเข้าชมรวม (Total Views)
      let totalPortfolioValue = 0;
      let totalViews = 0;
      properties.forEach(p => {
        if (p.status === 'approved') {
          totalPortfolioValue += Number(p.price);
        }
        totalViews += p.views_count;
      });

      // 3.4 ดึงข้อมูลสถิติตามเวลา (Time-series Analytics Data) ของอสังหาฯ ทุกชิ้นพร้อมๆ กัน ด้วย Promise.all
      // ช่วยเพิ่มประสิทธิภาพการดึงข้อมูล โดยไม่ต้องสั่ง Query ซ้ำซ้อนแบบ Waterfall Loop
      const propertyIds = properties.map(p => p.id);

      const [allViews, allAppointments, allChats, allSaves] = await Promise.all([
        // สถิติเวลาเข้าชม (property_views)
        db.property_views.findMany({
          where: { property_id: { in: propertyIds } },
          select: { property_id: true, viewed_at: true }
        }),
        // สถิติเวลานัดหมาย (appointments) ที่ไม่ถูกยกเลิก/ปฏิเสธ
        db.appointments.findMany({
          where: { property_id: { in: propertyIds }, status: { notIn: ['cancelled', 'rejected'] } },
          include: {
            users_appointments_customer_idTousers: {
              select: { first_name: true, last_name: true, phone: true }
            }
          },
          orderBy: { appointment_date: 'asc' }
        }),
        // สถิติเวลาเริ่มแชท (chat_sessions)
        db.chat_sessions.findMany({
          where: { property_id: { in: propertyIds } },
          select: { property_id: true, created_at: true }
        }),
        // สถิติเวลากดบันทึกเป็นทรัพย์โปรด (saved_properties)
        db.saved_properties.findMany({
          where: { property_id: { in: propertyIds } },
          select: { property_id: true, created_at: true }
        })
      ]);

      // 3.5 แปลงและจับคู่ข้อมูลอสังหาริมทรัพย์แต่ละชิ้นกับสถิติเวลาและ Leads ของลูกค้านัดหมาย
      const formattedProperties = properties.map(p => {
        // กรองข้อมูลสถิติเฉพาะทรัพย์นี้
        const propViews = allViews.filter(v => v.property_id === p.id);
        const propApts = allAppointments.filter(a => a.property_id === p.id);
        const propChats = allChats.filter(c => c.property_id === p.id);
        const propSaves = allSaves.filter(s => s.property_id === p.id);

        return {
          id: p.id,
          title: p.title,
          price: '฿' + Number(p.price).toLocaleString(), // ฟอร์แมตราคามีเครื่องหมายจุลภาค เช่น ฿5,000,000
          rawPrice: Number(p.price),
          type: p.property_types?.name || 'บ้านเดี่ยว',
          status: p.status, // สถานะอนุมัติ: approved, pending, rejected
          rejectReason: p.reject_reason || null, // เหตุผลที่โดนปฏิเสธ (ถ้ามี)
          location: p.location,
          bedrooms: p.bedrooms || 0,
          bathrooms: p.bathrooms || 0,
          area_sqm: p.area_sqm ? Number(p.area_sqm) : 0,
          image: p.property_images[0]?.image_url || '/property-placeholder.svg', // ภาพปก
          views: p.views_count,
          appointments: p._count.appointments,
          chatsCount: p._count.chat_sessions,
          savesCount: p._count.saved_properties,
          createdAt: p.created_at,
          // ส่ง Array ของ Timestamp เพื่อนำไปวาดกราฟสถิติบน Frontend
          rawViews: propViews.map(v => v.viewed_at.toISOString()),
          rawAppointments: propApts.map(a => a.created_at.toISOString()),
          rawChats: propChats.map(c => c.created_at.toISOString()),
          rawSaves: propSaves.map(s => s.created_at.toISOString()),
          // รายชื่อลูกค้านัดหมาย (Leads) ของอสังหาฯ หลังนี้โดยเฉพาะ
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

      // 3.6 ดึงรายการนัดหมายล่าสุด 5 รายการ (ที่ไม่โดนยกเลิกหรือปฏิเสธ) เพื่อนำไปโชว์ใน Quick View
      const recentAppointments = await db.appointments.findMany({
        where: { agent_id: agent.id, status: { notIn: ['cancelled', 'rejected'] } },
        include: {
          properties: true,
          users_appointments_customer_idTousers: {
            select: { first_name: true, last_name: true, phone: true }
          }
        },
        orderBy: { appointment_date: 'asc' },
        take: 5
      });

      // 3.7 นับจำนวนห้องแชทที่รอนายหน้าตอบกลับ
      const chatSessionsForReply = await db.chat_sessions.findMany({
        where: { agent_id: agent.id },
        include: { messages: { orderBy: { created_at: 'desc' }, take: 1 } }
      });
      const pendingChatCount = chatSessionsForReply.filter(
        s => s.messages[0] && s.messages[0].sender_id !== agent.id
      ).length;

      // 3.8 แปลงรูปแบบข้อมูลรายการนัดหมายล่าสุด
      const formattedAppointments = recentAppointments.map(apt => {
        const customer = apt.users_appointments_customer_idTousers;
        const customerName = customer
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'ลูกค้าทั่วไป'
          : 'ลูกค้าทั่วไป';
        return {
          id: apt.id,
          status: apt.status,
          date: apt.appointment_date,
          timeSlot: apt.time_slot === 'morning' ? '10:00 - 12:00 น. (ช่วงเช้า)'
            : apt.time_slot === 'afternoon' ? '14:00 - 16:00 น. (ช่วงบ่าย)'
            : (apt.time_slot || 'ไม่ระบุเวลา'),
          propertyTitle: apt.properties?.title || 'อสังหาริมทรัพย์',
          customerName,
          customerPhone: customer?.phone || '-'
        };
      });

      // 3.9 ตรวจสอบสถานะแพ็กเกจสมาชิก Pro Agent
      const isPro = agent.plan_type === 'pro' && (!agent.plan_expired_at || new Date(agent.plan_expired_at) > new Date());

      // 3.10 คัดกรองอสังหาริมทรัพย์ที่ยังรอ Admin อนุมัติ (status = 'pending')
      const pendingProperties = formattedProperties.filter(p => p.status === 'pending');

      // 3.11 ส่งผลลัพธ์ข้อมูล Dashboard ทั้งหมดกลับไปยัง Frontend
      return NextResponse.json({
        properties: formattedProperties,       // รายชื่อและข้อมูลสถิติทรัพย์ทั้งหมด
        pendingApprovalCount: pendingProperties.length, // จำนวนทรัพย์ที่รออนุมัติ
        pendingApprovalProperties: pendingProperties,   // รายการทรัพย์ที่รออนุมัติ
        totalPortfolioValue: (totalPortfolioValue / 1000000).toFixed(1) + ' ลบ.', // มูลค่าพอร์ทรวม (หน่วยล้านบาท)
        pendingAptsCount,                      // จำนวนนัดหมายที่รอดำเนินการ
        totalViews,                            // รวมจำนวนการเข้าชมทั้งหมด
        totalCount: properties.length,         // จำนวนประกาศทั้งหมด
        planType: agent.plan_type || 'basic',  // ประเภทแพ็กเกจ (basic / pro)
        isPro,                                 // สถานะสมาชิก Pro Agent
        planExpiredAt: agent.plan_expired_at,  // วันหมดอายุแพ็กเกจ
        recentAppointments: formattedAppointments, // รายการนัดหมายล่าสุด 5 รายการ
        pendingChatCount                       // จำนวนแชทที่รอนายหน้าตอบกลับ
      });
    }

    // --------------------------------------------------------------------------
    // หมายเหตุสถาปัตยกรรม (Architecture Note):
    // ระบบห้องแชท (type=chat) ถูกย้ายไปรวมศูนย์ที่ /api/chat/sessions และ /api/chat/messages
    // เพื่อให้ทั้งฝั่งลูกค้าและฝั่งนายหน้าใช้ API เดียวกัน ป้องกันโค้ดซ้ำซ้อน
    // --------------------------------------------------------------------------

    // หาก Parameter type ไม่ตรงกับ 'home' หรือ 'dashboard' ให้คืนค่า Error 400 Bad Request
    return NextResponse.json({ error: 'ไม่พบประเภทคำขอดังกล่าว' }, { status: 400 });

  } catch (error) {
    // --------------------------------------------------------------------------
    // [ส่วนที่ 4: การจัดการข้อผิดพลาด (Error Handling)]
    // --------------------------------------------------------------------------
    const err = error as Error;
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูลระบบนายหน้าได้: ' + err.message }, 
      { status: 500 } // 500 Internal Server Error
    );
  }
}

