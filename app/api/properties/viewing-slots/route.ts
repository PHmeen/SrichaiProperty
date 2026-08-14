// 🔑 KEYWORD: ตารางลงวันว่างนายหน้าของบ้านแต่ละหลัง
// === API วันเวลาที่เปิดให้ลูกค้าจองเข้าชม "บ้านแต่ละหลัง" (ผูกกับ property_id) ===
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อยืนยันว่าเป็นนายหน้าเจ้าของบ้าน
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับจัดการรอบวันว่างให้เข้าชม
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/services/viewingSlotService"; // สถานะนัดหมายที่ยังถือว่า "จองอยู่จริง"

interface AgentSession {
  user?: {
    id?: string;
    role?: string;
  };
}

// แปลง Date เป็นข้อความ "YYYY-MM-DD" (อ่านค่าแบบ UTC เพราะคอลัมน์ available_date เป็นชนิด Date ล้วน ไม่มีเวลา)
const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

// 🔑 KEYWORD: ดึงวันว่างของบ้านหลังเดียว
// GET: ดึงวันว่างของบ้านหลังหนึ่งๆ — สาธารณะ (ลูกค้าและนายหน้าใช้ร่วมกันได้)
// ใช้: /api/properties/viewing-slots?propertyId=xxxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    // 🔑 KEYWORD: ดึงรอบที่นายหน้าติดนัดกับบ้านหลังอื่นแล้ว
    // โหมดพิเศษ: /api/properties/viewing-slots?agentBusy=1[&excludePropertyId=xxx]
    // ใช้ตอนนายหน้าเปิดหน้า "ลงประกาศ" หรือ "แก้ไขประกาศ" เพื่อรู้ล่วงหน้าว่าตัวเองมีนัดชนกับบ้านหลังอื่นวันไหนแล้ว
    // เดิมดึงจาก "วันว่างที่เปิดไว้" (property_viewing_slots) แต่ตอนนี้เปิดวันว่างซ้อนกันได้ตามปกติแล้ว
    // เปลี่ยนมาดึงจาก "นัดหมายที่มีคนจองจริง" (appointments) แทน เพราะนั่นคือจุดล็อกจริงของระบบ
    if (searchParams.get("agentBusy")) {
      const session = (await getServerSession(authOptions)) as AgentSession | null;
      if (!session?.user?.id || session.user.role !== "agent") {
        return NextResponse.json(
          { error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" },
          { status: 401 }
        );
      }

      // ไม่นับบ้านหลังที่กำลังแก้ไขอยู่ (ไม่งั้นนัดของบ้านหลังนี้เองจะขึ้นว่า "ชนกับตัวเอง")
      const excludePropertyId = searchParams.get("excludePropertyId");

      const busyAppointments = await db.appointments.findMany({
        where: {
          agent_id: session.user.id, // เฉพาะนัดของนายหน้าคนที่ล็อกอินอยู่
          status: { in: ACTIVE_APPOINTMENT_STATUSES },
          ...(excludePropertyId ? { property_id: { not: excludePropertyId } } : {})
        },
        select: {
          appointment_date: true,
          time_slot: true,
          properties: { select: { title: true } } // เอาชื่อบ้านมาบอกด้วยว่าไปชนกับหลังไหน
        },
        orderBy: [{ appointment_date: "asc" }, { time_slot: "asc" }]
      });

      const formatted = busyAppointments
        .filter((a) => a.time_slot)
        .map((a) => ({
          date: toDateKey(a.appointment_date),
          timeSlot: a.time_slot as string,
          propertyTitle: a.properties?.title || "บ้านหลังอื่นของคุณ"
        }));

      return NextResponse.json({ success: true, busySlots: formatted });
    }

    if (!propertyId) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอสังหาริมทรัพย์ (propertyId)" },
        { status: 400 }
      );
    }

    // ดึงวันว่างเฉพาะบ้านหลังนี้เท่านั้น (property_viewing_slots)
    // หมายเหตุ: เดิมโค้ดตรงนี้เคยดึง "วันว่างส่วนตัวของนายหน้า" จากตาราง agent_availabilities
    // มาผสมด้วย โดยจับคู่กันแค่ วันที่+ช่วงเวลา (ไม่ผูกกับ property_id)
    // ทำให้วันว่าง/สถานะจองของบ้านหลังหนึ่ง "หลุด" ไปติดกับบ้านอีกหลังของนายหน้าคนเดียวกัน
    // (บ้านที่เพิ่งสร้างใหม่ ไม่เคยมีใครจอง กลับขึ้นว่า "ถูกจองแล้ว" เพราะบ้านหลังอื่นของนายหน้าคนเดิมถูกจอง)
    // ตามแผนเดิมที่ตกลงไว้ว่าจะเลิกใช้ระบบ agent_availabilities ทั้งหมด จึงตัดส่วนนี้ออก
    // เหลือใช้แค่ property_viewing_slots ซึ่งผูกกับ property_id ตรงตัวเท่านั้น
    const propertySlots = await db.property_viewing_slots.findMany({
      where: { property_id: propertyId },
      orderBy: [{ available_date: "asc" }, { time_slot: "asc" }]
    });

    const formatted = propertySlots
      .filter((s) => s.time_slot)
      .map((s) => ({
        id: s.id,
        date: toDateKey(s.available_date),
        timeSlot: s.time_slot as string,
        isBooked: Boolean(s.is_booked)
      }));

    return NextResponse.json({ success: true, slots: formatted });
  } catch (error) {
    const err = error as Error;
    console.error("Fetch Property Viewing Slots Error:", err);
    return NextResponse.json(
      { error: "ดึงข้อมูลวันว่างของบ้านหลังนี้ล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

// 🔑 KEYWORD: เปิดวันว่างให้บ้าน กันชนวันว่าง
// POST: นายหน้าเปิดวันว่างเพิ่มให้บ้านหลังที่ลงประกาศไปแล้ว (ใช้ตอนแก้ไขทีหลัง)
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AgentSession | null;
    if (!session?.user?.id || session.user.role !== "agent") {
      return NextResponse.json(
        { error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { propertyId, date, timeSlot } = body;

    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสบ้าน วันที่ และช่วงเวลา" },
        { status: 400 }
      );
    }

    // ตรวจสิทธิ์ว่าบ้านหลังนี้เป็นของนายหน้าคนที่ล็อกอินอยู่จริง
    const property = await db.properties.findUnique({ where: { id: propertyId } });
    if (!property || property.agent_id !== session.user.id) {
      return NextResponse.json(
        { error: "ไม่พบบ้านหลังนี้ หรือคุณไม่มีสิทธิ์แก้ไข" },
        { status: 403 }
      );
    }

    // ไม่กันชนกับบ้านหลังอื่นตรงนี้แล้ว — เปิดวันว่างซ้อนกันหลายบ้านได้ตามปกติ
    // จุดกันชนจริงย้ายไปเช็คตอนลูกค้ากดจอง (ดู hasAgentBookingConflict ใน api/appointments)
    const slot = await db.property_viewing_slots.upsert({
      where: {
        property_id_available_date_time_slot: {
          property_id: propertyId,
          available_date: new Date(date),
          time_slot: timeSlot
        }
      },
      update: {},
      create: {
        property_id: propertyId,
        available_date: new Date(date),
        time_slot: timeSlot,
        is_booked: false
      }
    });

    return NextResponse.json({ success: true, data: slot });
  } catch (error) {
    const err = error as Error;
    console.error("Create Property Viewing Slot Error:", err);
    return NextResponse.json(
      { error: "เปิดวันว่างล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

// 🔑 KEYWORD: ปิดวันว่างบ้าน ลบวันว่าง
// DELETE: นายหน้าปิดวันว่างของบ้านหลังนี้ (ทำไม่ได้ถ้าลูกค้าจองไปแล้ว)
export async function DELETE(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AgentSession | null;
    if (!session?.user?.id || session.user.role !== "agent") {
      return NextResponse.json(
        { error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { propertyId, date, timeSlot } = body;

    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสบ้าน วันที่ และช่วงเวลา" },
        { status: 400 }
      );
    }

    const property = await db.properties.findUnique({ where: { id: propertyId } });
    if (!property || property.agent_id !== session.user.id) {
      return NextResponse.json(
        { error: "ไม่พบบ้านหลังนี้ หรือคุณไม่มีสิทธิ์แก้ไข" },
        { status: 403 }
      );
    }

    const result = await db.property_viewing_slots.deleteMany({
      where: {
        property_id: propertyId,
        available_date: new Date(date),
        time_slot: timeSlot,
        is_booked: false
      }
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "ไม่พบวันว่างนี้ หรือมีลูกค้าจองไปแล้วจึงลบไม่ได้" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("Delete Property Viewing Slot Error:", err);
    return NextResponse.json(
      { error: "ปิดวันว่างล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}