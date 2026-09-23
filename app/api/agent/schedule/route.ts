// 🔑 API ศูนย์จัดการวันว่างและตารางงานนายหน้า (Agent Schedule API)
// โค้ดเขียนแบบกระชับ อ่านง่าย เข้าใจการทำงานได้ทีละขั้นตอน
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';
import { LOW_SLOT_THRESHOLD, SLOT_LOOKAHEAD_DAYS } from '@/lib/services/slotAvailabilityService';

// ฟังก์ชันแปลง Date เป็น 'YYYY-MM-DD' (อิงเวลา UTC เพื่อความแม่นยำตรงกับฐานข้อมูล)
const toDateStr = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

// =========================================================================
// 1. GET: ดึงข้อมูลสรุปวันว่าง + นัดหมายทั้งหมดของนายหน้าคนนี้
// =========================================================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'agent') {
      return NextResponse.json({ success: false, error: 'อนุญาตเฉพาะนายหน้าเท่านั้น' }, { status: 403 });
    }

    const agentId = session.user.id;
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    const horizon = new Date(today.getTime() + SLOT_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

    // 1.1 ดึงประกาศทั้งหมดของนายหน้า
    const properties = await db.properties.findMany({
      where: { agent_id: agentId, status: 'approved' },
      select: {
        id: true,
        title: true,
        listing_type: true,
        price: true,
        location: true,
        property_images: { take: 1, orderBy: { order_index: 'asc' }, select: { image_url: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const propIds = properties.map((p) => p.id);
    if (propIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { properties: [], slots: [], stats: { totalProperties: 0, lowSlotCount: 0, availableCount: 0, bookedCount: 0 } }
      });
    }

    // 1.2 ดึงรอบวันว่าง (ย้อนหลัง 30 วัน ถึงล่วงหน้า 90 วัน)
    const minDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [rawSlots, rawApts] = await Promise.all([
      db.property_viewing_slots.findMany({
        where: { property_id: { in: propIds }, available_date: { gte: minDate, lte: maxDate } },
        include: { properties: { select: { title: true } } },
        orderBy: [{ available_date: 'asc' }, { time_slot: 'asc' }]
      }),
      db.appointments.findMany({
        where: { agent_id: agentId, status: { in: ['pending', 'approved', 'completed', 'no_show'] } },
        select: {
          id: true,
          property_id: true,
          appointment_date: true,
          time_slot: true,
          status: true,
          users_appointments_customer_idTousers: { select: { first_name: true, last_name: true, phone: true } }
        }
      })
    ]);

    // จับคู่ Appointment เข้ากับรอบวันว่าง
    const aptMap = new Map<string, typeof rawApts[0]>();
    for (const a of rawApts) {
      if (a.property_id && a.time_slot) {
        aptMap.set(`${a.property_id}_${toDateStr(a.appointment_date)}_${a.time_slot}`, a);
      }
    }

    // 1.3 จัดรูปแบบรอบวันว่างสำหรับปฏิทิน
    const slots = rawSlots.map((s) => {
      const dateStr = toDateStr(s.available_date);
      const apt = aptMap.get(`${s.property_id}_${dateStr}_${s.time_slot}`);
      const cust = apt?.users_appointments_customer_idTousers;
      return {
        propertyId: s.property_id,
        propertyTitle: s.properties.title,
        date: dateStr,
        timeSlot: s.time_slot,
        isBooked: s.is_booked,
        isPast: s.available_date < today,
        customerName: cust ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || 'ลูกค้า' : null,
        customerPhone: cust?.phone || null
      };
    });

    // 1.4 สรุปสถิติรายบ้าน (สำหรับตาราง)
    const propertyList = properties.map((p) => {
      const pSlots = rawSlots.filter((s) => s.property_id === p.id);
      const upcomingAvail = pSlots.filter((s) => !s.is_booked && s.available_date >= today && s.available_date <= horizon);
      const bookedCount = pSlots.filter((s) => s.is_booked && s.available_date >= today).length;
      const last = upcomingAvail[upcomingAvail.length - 1];

      return {
        id: p.id,
        title: p.title,
        listingType: p.listing_type,
        price: Number(p.price),
        location: p.location,
        imageUrl: p.property_images[0]?.image_url || '/placeholder.png',
        totalSlots: pSlots.length,
        remainingSlots: upcomingAvail.length,
        bookedCount,
        lastAvailableDate: last ? toDateStr(last.available_date) : null,
        isLow: upcomingAvail.length < LOW_SLOT_THRESHOLD
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        properties: propertyList,
        slots,
        stats: {
          totalProperties: properties.length,
          lowSlotCount: propertyList.filter((p) => p.isLow).length,
          availableCount: propertyList.reduce((sum, p) => sum + p.remainingSlots, 0),
          bookedCount: propertyList.reduce((sum, p) => sum + p.bookedCount, 0),
          // ส่งเกณฑ์ที่ใช้ตัดสินมาด้วย ให้หน้าเว็บเอาไปเขียนคำอธิบายได้ตรงกับที่คำนวณจริง
          // (หน้านั้นเป็น client component จะ import จาก slotAvailabilityService ตรงๆ ไม่ได้
          //  เพราะไฟล์นั้นดึง Prisma เข้ามาด้วย จะหลุดไปอยู่ในบันเดิลฝั่งเบราว์เซอร์)
          lowSlotThreshold: LOW_SLOT_THRESHOLD,
          lookaheadDays: SLOT_LOOKAHEAD_DAYS
        }
      }
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// =========================================================================
// 2. POST: เปิดวันว่าง (รองรับทั้งเปิดรอบเดี่ยว 'single' และเปิดแบบชุด 'batch')
// =========================================================================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'agent') {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const agentId = session.user.id;
    const body = await req.json();

    // 2.1 เปิดรอบเดี่ยว (Single Slot)
    if (body.action === 'single') {
      const { propertyId, date, timeSlot } = body;
      const prop = await db.properties.findFirst({ where: { id: propertyId, agent_id: agentId } });
      if (!prop) return NextResponse.json({ success: false, error: 'ไม่พบประกาศนี้' }, { status: 404 });

      await db.property_viewing_slots.upsert({
        where: {
          property_id_available_date_time_slot: {
            property_id: propertyId,
            available_date: new Date(`${date}T00:00:00.000Z`),
            time_slot: timeSlot
          }
        },
        update: {},
        create: { property_id: propertyId, available_date: new Date(`${date}T00:00:00.000Z`), time_slot: timeSlot }
      });
      return NextResponse.json({ success: true });
    }

    // 2.2 เปิดวันว่างเป็นชุด (Batch Generator)
    if (body.action === 'batch') {
      const { propertyId, startDate, endDate, daysOfWeek, timeSlots } = body;
      const targetProps = propertyId === 'all'
        ? await db.properties.findMany({ where: { agent_id: agentId, status: 'approved' }, select: { id: true } })
        : [{ id: propertyId }];

      const newSlots: Array<{ property_id: string; available_date: Date; time_slot: string }> = [];
      const curr = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T00:00:00.000Z`);

      // วนลูปสร้างรอบตามวันที่และวันในสัปดาห์ที่เลือก
      while (curr <= end) {
        if (daysOfWeek.includes(curr.getUTCDay())) {
          for (const p of targetProps) {
            for (const slot of timeSlots) {
              newSlots.push({ property_id: p.id, available_date: new Date(curr), time_slot: slot });
            }
          }
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }

      if (newSlots.length === 0) {
        return NextResponse.json({ success: false, error: 'ไม่มีวันที่ตรงกับเงื่อนไขที่เลือก' }, { status: 400 });
      }

      const res = await db.property_viewing_slots.createMany({ data: newSlots, skipDuplicates: true });
      return NextResponse.json({ success: true, count: res.count });
    }

    return NextResponse.json({ success: false, error: 'action ไม่ถูกต้อง' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

// =========================================================================
// 3. DELETE: ปิด/ลบรอบวันว่าง (ลบได้เฉพาะรอบที่ยังไม่มีลูกค้าจอง)
// =========================================================================
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'agent') {
      return NextResponse.json({ success: false, error: 'ไม่มีสิทธิ์เข้าถึง' }, { status: 403 });
    }

    const { propertyId, date, timeSlot } = await req.json();
    const result = await db.property_viewing_slots.deleteMany({
      where: {
        property_id: propertyId,
        available_date: new Date(`${date}T00:00:00.000Z`),
        time_slot: timeSlot,
        is_booked: false // ป้องกันการลบรอบที่มีลูกค้าจองแล้ว
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ success: false, error: 'ไม่พบรอบว่างนี้ หรือมีลูกค้าจองไปแล้ว' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
