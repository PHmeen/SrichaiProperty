import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อระบุตัวผู้ใช้ (ลูกค้าหรือนายหน้า)
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับจัดการนัดหมายและสล็อตวันว่าง
import { notifyUser } from "@/lib/notify"; // ส่งการแจ้งเตือนเมื่อมีการนัด/ยืนยัน/ยกเลิกนัดหมาย
import { hasAgentBookingConflict } from "@/lib/services/viewingSlotService"; // เช็คว่านายหน้ามีนัดจริงกับบ้านหลังอื่นชนเวลานี้อยู่แล้วหรือไม่
import { autoCompleteOverdueAppointments, autoCancelExpiredRescheduleOffers, appointmentNeedsResult, isCustomerBlockedByNoShow } from "@/lib/services/noShowService"; // auto-complete/auto-cancel + เช็คนัดรอผล + เช็คลูกค้าถูกบล็อก
import { NO_SHOW_LIMIT, APPOINTMENT_STATUS } from "@/lib/constants"; // โควตาเบี้ยวนัด + ค่าคงที่สถานะนัดหมาย

/**
 * ==============================================================================
 * API Route: /api/appointments (ระบบจัดการการนัดหมายเข้าชมบ้านแบบครบวงจร)
 * ==============================================================================
 * วัตถุประสงค์และหน้าที่หลัก:
 * 1. GET    - ดึงข้อมูลรายการนัดหมาย (แยกระหว่างมุมมอง "ลูกค้า" ดูนัดตนเอง และมุมมอง "นายหน้า" ดูคิวงาน ?view=agent)
 * 2. POST   - บันทึกคำขอนัดหมายใหม่จากลูกค้า + ตรวจสอบนัดซ้ำ + ล็อกสล็อตวันว่างใน DB + ส่งแจ้งเตือนหานายหน้า
 * 3. PATCH  - นายหน้ากดรับนัด (confirm), ปฏิเสธ (reject), ปิดงาน (complete) หรือ ลูกค้าขอเปลี่ยนวันเวลานัด
 * 4. DELETE - ยกเลิกนัดหมาย + ปลดล็อกรอบวันว่างคืนให้ระบบ (is_booked = false) + บันทึกเหตุผลการยกเลิก
 * ==============================================================================
 */

// Helper 1: ฟังก์ชันแปลงวัตถุ Date ให้เป็นข้อความวันที่รูปแบบ "YYYY-MM-DD" สำหรับเปรียบเทียบในระบบ
const toDateKey = (d: Date) => d.toISOString().split("T")[0];

// Helper 2: ดึงข้อมูลผู้ใช้งานที่กำลังเข้าสู่ระบบผ่าน NextAuth Session จากอีเมล
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null; // ถ้าไม่มีเซสชัน แปลว่ายังไม่ได้ล็อกอิน
  return db.users.findUnique({ where: { email: session.user.email } });
}

// Helper 3: ฟังก์ชันส่งการแจ้งเตือน (Notifications) ไปยังฐานข้อมูลแบบไม่ขัดจังหวะกระบวนการหลัก
// (ใช้ .catch() ดักจับความผิดพลาดไว้เพื่อไม่ให้กระทบกับการทำธุรกรรมหลักข้างบน)
const sendNotification = (userId: string, title: string, content: string, type = "appointment", linkUrl?: string | null) =>
  notifyUser({ userId, title, content, type, linkUrl }).catch(() => {});

// ==============================================================================
// 1. GET: ดึงรายการนัดหมาย (รองรับมุมมองลูกค้า และ มุมมองนายหน้า)
// ==============================================================================
export async function GET(request: Request) {
  try {
    // 1.1 ตรวจสอบว่าผู้ใช้งานเข้าสู่ระบบแล้วหรือยัง
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    // 1.2 ตรวจสอบจาก URL Query Parameters ว่าผู้ใช้ต้องการดูในมุมมองนายหน้า (?view=agent) หรือไม่
    const isAgent = new URL(request.url).searchParams.get("view") === "agent" && user.role_id === "agent";

    // เดิมนัดที่ผ่านวันไปแล้วจะถูก auto-complete ทันที (ระบบเดาเองว่าสำเร็จเสมอ) ทำให้
    // สถิติ "นัดสำเร็จ" ไม่ตรงความจริง และปุ่ม "ปิดงาน" ของนายหน้าแทบไม่มีโอกาสได้ใช้
    // ตอนนี้เปลี่ยนเป็น: รอนายหน้ายืนยันผลจริงก่อน (ดูปุ่มยืนยันในหน้า agent/appointments)
    // ถ้าเลยกำหนด VISIT_CONFIRM_GRACE_DAYS แล้วนายหน้ายังไม่ยืนยัน ค่อย auto-complete ให้เอง
    // (กันนัดค้างสถานะ "รอผล" ตลอดไปถ้านายหน้าลืมกด — ดู lib/services/noShowService.ts)
    await autoCompleteOverdueAppointments();
    // ยกเลิกนัดที่นายหน้าขอเลื่อนไว้แต่ลูกค้าไม่เคยกดรับ จนวันที่เสนอผ่านไปแล้ว (คืนรอบว่างให้ด้วย)
    await autoCancelExpiredRescheduleOffers();

    // 1.4 ดึงข้อมูลนัดหมายจากฐานข้อมูล PostgreSQL ผ่าน Prisma ORM
    // - ถ้าเป็นนายหน้า: ค้นหาแถวที่ agent_id === user.id
    // - ถ้าเป็นลูกค้า: ค้นหาแถวที่ customer_id === user.id
    const appointments = await db.appointments.findMany({
      where: isAgent ? { agent_id: user.id } : { customer_id: user.id },
      include: {
        properties: {
          include: {
            property_images: { orderBy: { order_index: "asc" }, take: 1 }, // ดึงรูปภาพแรกของบ้านมาแสดง
            users: { select: { first_name: true, last_name: true, phone: true } } // ดึงชื่อและเบอร์โทรนายหน้า
          }
        },
        users_appointments_customer_idTousers: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true, profile_image: true } // ดึงข้อมูลลูกค้า
        },
        // ดึงข้อมูลรีวิวของนัดหมายนี้ (ถ้าเคยรีวิวแล้ว) เพื่อให้ฝั่งลูกค้าและนายหน้ารู้สถานะรีวิว
        reviews: {
          select: { id: true, rating: true, comment: true }
        }
      },
      orderBy: { appointment_date: "asc" } // เรียงลำดับตามวันที่นัดหมายจากใกล้ไปไกล
    });

    // 1.4 จัดฟอร์แมตออบเจกต์ข้อมูล (Response Mapping) เพื่อส่งให้ React Component หน้าบ้านนำไปใช้ได้ทันที
    const formatted = appointments.map((apt) => {
      const p = apt.properties;
      const cust = apt.users_appointments_customer_idTousers;
      const agentUser = p?.users;

      const customerName = cust ? `${cust.first_name || ""} ${cust.last_name || ""}`.trim() : "ลูกค้าทั่วไป";
      const agentName = agentUser ? `${agentUser.first_name || ""} ${agentUser.last_name || ""}`.trim() : "นายหน้า";
      
      // แปลงคีย์รอบเวลาให้เป็นข้อความภาษาไทยสำหรับแสดงผล
      const timeSlotText = apt.time_slot === "morning"
        ? "10:00 - 12:00 น. (ช่วงเช้า)"
        : apt.time_slot === "afternoon"
          ? "14:00 - 16:00 น. (ช่วงบ่าย)"
          : apt.time_slot || "ไม่ระบุเวลา";

      return {
        id: apt.id,
        propertyId: apt.property_id,
        propertyName: p?.title || "อสังหาริมทรัพย์",
        propertyTitle: p?.title || "อสังหาริมทรัพย์",
        propertyPrice: p ? "฿" + Number(p.price).toLocaleString() : "",
        price: p ? "฿" + Number(p.price).toLocaleString() : "",
        propertyImage: p?.property_images?.[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
        location: p?.location || "",
        latitude: p?.latitude ? Number(p.latitude) : null,
        longitude: p?.longitude ? Number(p.longitude) : null,
        date: toDateKey(apt.appointment_date),
        timeSlot: apt.time_slot,
        timeSlotText,
        status: apt.status,
        note: apt.note || "",
        cancelReason: apt.cancel_reason || "",
        noShowNote: apt.no_show_note || "",
        
        // true = นัดนี้ยืนยันแล้ว(approved) และวันนัดผ่านไปแล้ว แต่นายหน้ายังไม่กดยืนยันผล
        // หน้า agent/appointments ใช้ธงนี้เพื่อแยกเป็นแท็บ "รอยืนยันผล" ต่างหาก
        needsResult: appointmentNeedsResult({ status: apt.status, appointment_date: apt.appointment_date }),
        // ข้อมูลรีวิวที่ลูกค้าเคยให้คะแนนไว้ (ถ้ายังไม่เคยรีวิว จะเป็น null)
        review: apt.reviews ? {
          id: apt.reviews.id,
          rating: apt.reviews.rating,
          comment: apt.reviews.comment || ""
        } : null,
        
        // หน้าคิวนัดหมายฝั่งนายหน้ามีโค้ดโชว์ "วันเดิมขีดฆ่า + ป้าย (แก้ไขใหม่)" รออยู่แล้ว
        // แต่เดิม API ไม่เคยส่ง 3 ฟิลด์นี้กลับไป ส่วนนั้นเลยไม่เคยทำงาน
        originalDate: apt.original_date ? toDateKey(apt.original_date) : null,
        originalTimeSlot: apt.original_time_slot,
        wasEdited: apt.original_date !== null,
        customerName,
        customerPhone: cust?.phone || "-",
        customerEmail: cust?.email || "-",
        customerAvatar: cust?.profile_image,
        agentName,
        agentPhone: agentUser?.phone || "-",
        createdAt: apt.created_at
      };
    });

    return NextResponse.json({ success: true, appointments: formatted });
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ==============================================================================
// 2. POST: สร้างคำขอนัดหมายดูบ้านใหม่จากลูกค้า
// ==============================================================================
export async function POST(request: Request) {
  try {
    // 2.1 ตรวจสอบผู้ใช้งานที่ล็อกอิน
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    // 2.2 อ่านและตรวจสอบข้อมูลสำคัญที่ส่งมาจาก Request Body
    const { propertyId, date, timeSlot, note } = await request.json();
    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" }, { status: 400 });
    }

    // 2.3 ค้นหาข้อมูลบ้านหลังนี้ในฐานข้อมูล
    const property = await db.properties.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์นี้" }, { status: 404 });

    // 2.4 ตรวจสอบกฎธุรกิจ: ลูกค้า 1 คน จองค้างไว้ได้ทีละ 1 นัดต่อบ้าน 1 หลัง ( status: pending หรือ approved )
    const existing = await db.appointments.findFirst({
      where: { customer_id: user.id, property_id: property.id, status: { in: ["pending", "approved"] } }
    });
    if (existing) {
      return NextResponse.json({ error: "คุณมีนัดหมายค้างอยู่สำหรับบ้านหลังนี้แล้ว กรุณารอผลหรือยกเลิกนัดเดิมก่อนจองใหม่" }, { status: 400 });
    }

    // 2.4.1 ลูกค้าที่ไม่มาตามนัด (no_show) สะสมครบ NO_SHOW_LIMIT ครั้ง จองนัดใหม่ไม่ได้
    // กันนายหน้าเสียเวลาเปิดวันว่างรอลูกค้าที่มีประวัติไม่มาซ้ำๆ
    if (await isCustomerBlockedByNoShow(user.id)) {
      return NextResponse.json(
        { error: `บัญชีของคุณมีประวัติไม่มาตามนัดครบ ${NO_SHOW_LIMIT} ครั้ง จึงถูกจำกัดการจองนัดใหม่ชั่วคราว กรุณาติดต่อทีมงานหากต้องการความช่วยเหลือ` },
        { status: 400 }
      );
    }

    // 2.5 แปลงข้อความรอบเวลาให้อยู่ในคีย์มาตรฐาน DB ('morning' หรือ 'afternoon')
    const dbTimeSlot = timeSlot.includes("13:") || timeSlot.includes("15:") || timeSlot.includes("บ่าย") || timeSlot.toLowerCase().includes("afternoon") ? "afternoon" : "morning";

    // 2.6 เช็คว่านายหน้าคนนี้มีนัดจริงกับ "บ้านหลังอื่น" ชนวัน+เวลานี้อยู่แล้วหรือไม่
    if (property.agent_id && await hasAgentBookingConflict(property.agent_id, property.id, new Date(date), dbTimeSlot)) {
      return NextResponse.json({ error: "นายหน้าติดนัดชมบ้านหลังอื่นในช่วงเวลานี้แล้ว กรุณาเลือกวันหรือเวลาอื่น" }, { status: 400 });
    }

    // ⚡ 2.7 ดำเนินการตรวจสอบและจองคิวแบบ Database Transaction (ACID)
    // ป้องกันการเกิด Race Condition / Double Booking ในเสี้ยววินาทีเดียวกัน 100%
    const newAppointment = await db.$transaction(async (tx) => {
      // (1) ค้นหารอบเข้าชมในฐานข้อมูลและตรวจสอบว่ายังว่างอยู่หรือไม่
      const targetSlot = await tx.property_viewing_slots.findUnique({
        where: {
          property_id_available_date_time_slot: {
            property_id: property.id,
            available_date: new Date(date),
            time_slot: dbTimeSlot
          }
        }
      });
      if (!targetSlot) {
        throw new Error("NOT_FOUND_SLOT");
      }
      if (targetSlot.is_booked) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }

      // (2) ตรวจสอบนัดหมายค้างของลูกค้าอีกครั้งภายใน Transaction
      const doubleCheckExisting = await tx.appointments.findFirst({
        where: { customer_id: user.id, property_id: property.id, status: { in: ["pending", "approved"] } }
      });
      if (doubleCheckExisting) {
        throw new Error("ALREADY_HAVE_PENDING_APPOINTMENT");
      }

      // (3) ล็อกรอบเวลานี้ในตาราง property_viewing_slots ด้วย Atomic Condition (where is_booked: false)
      const slotLock = await tx.property_viewing_slots.updateMany({
        where: {
          property_id: property.id,
          available_date: new Date(date),
          time_slot: dbTimeSlot,
          is_booked: false // ล็อกเฉพาะเมื่อรอบเวลานี้ยังเป็น false จริง ณ เสี้ยววินาทีนั้น
        },
        data: { is_booked: true }
      });

      // หากมีผู้ใช้อื่นจองตัดหน้าในเสี้ยววินาทีเดียวกัน slotLock.count จะเป็น 0 ทันที
      if (slotLock.count === 0) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }

      // (4) สร้างคำขอนัดหมายใหม่ลงในตาราง appointments
      const created = await tx.appointments.create({
        data: {
          customer_id: user.id,
          agent_id: property.agent_id,
          property_id: property.id,
          appointment_date: new Date(date),
          time_slot: dbTimeSlot,
          status: "pending",
          note: note || ""
        }
      });

      return created;
    });

    // 2.8 ส่งการแจ้งเตือนไปยังนายหน้าผู้ดูแลและลูกค้าที่ทำรายการ
    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ลูกค้า";
    const timeLabel = dbTimeSlot === "morning" ? "ช่วงเช้า (10:00 - 12:00 น.)" : "ช่วงบ่าย (14:00 - 16:00 น.)";

    if (property.agent_id) {
      sendNotification(
        property.agent_id,
        "คำขอนัดหมายเข้าชมโครงการ",
        `คุณ ${customerName} ได้ยื่นคำขอนัดหมายเข้าชม "${property.title}" สำหรับวันที่ ${date} (${timeLabel})`,
        "appointment",
        "/agent/appointments"
      );
    }
    sendNotification(
      user.id,
      "บันทึกคำขอนัดหมายเข้าชมโครงการ",
      `ยื่นคำขอนัดหมายเข้าชม "${property.title}" ประจำวันที่ ${date} เรียบร้อยแล้ว ระบบอยู่ระหว่างส่งเรื่องให้นายหน้าพิจารณา`,
      "appointment",
      "/appointments"
    );

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "SLOT_ALREADY_BOOKED") {
      return NextResponse.json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกรอบเวลาอื่น" }, { status: 409 });
    }
    if (msg === "NOT_FOUND_SLOT") {
      return NextResponse.json({ error: "ไม่พบรอบเข้าชมนี้ กรุณาเลือกวันและช่วงเวลาที่นายหน้าเปิดไว้" }, { status: 400 });
    }
    if (msg === "ALREADY_HAVE_PENDING_APPOINTMENT") {
      return NextResponse.json({ error: "คุณมีนัดหมายค้างอยู่สำหรับบ้านหลังนี้แล้ว กรุณารอผลหรือยกเลิกนัดเดิมก่อนจองใหม่" }, { status: 400 });
    }
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + msg }, { status: 500 });
  }
}

// ==============================================================================
// 3. PATCH: การอัปเดตนัดหมาย (ฝั่งนายหน้าตอบรับ/ปฏิเสธ/ปิดงาน หรือ ฝั่งลูกค้าขอเปลี่ยนวัน)
// ==============================================================================
export async function PATCH(request: Request) {
  try {
    // 3.1 ตรวจสอบสิทธิ์ผู้ใช้งาน
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { id, action, date, timeSlot, reason } = await request.json();
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย" }, { status: 400 });

    // 3.2 ค้นหาข้อมูลนัดหมายที่จะแก้ไข
    const appointment = await db.appointments.findUnique({ where: { id } });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    // --------------------------------------------------------------------------
    // (ก) กรณีฝั่งนายหน้าจัดการ: ยืนยัน (confirm), ปฏิเสธ (reject), หรือ ปิดงาน (complete)
    // --------------------------------------------------------------------------
    if (["confirm", "reject", "complete", "no_show", "agent_reschedule"].includes(action)) {
      // ตรวจสอบสิทธิ์: ต้องเป็นนายหน้าเจ้าของคิวงานนี้เท่านั้น
      if (user.role_id !== "agent" || appointment.agent_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }

      // นายหน้ากดปิดงานเมื่อพาลูกค้าชมสถานที่จริงเรียบร้อยแล้ว (status -> completed)
      // 🔑 KEYWORD: นายหน้าขอเลื่อนวันนัด
      // เดิมพอยืนยันนัดไปแล้ว (approved) นายหน้าทำอะไรกับนัดนั้นไม่ได้เลย ถ้าติดธุระไปไม่ได้จริง
      // เหลือทางเลือกแค่โกหกว่า "ลูกค้ามาแล้ว" หรือใส่ร้ายว่า "ลูกค้าไม่มา" (ซึ่งไปนับโควตาแบนลูกค้า)
      // ให้เลื่อนวันได้แทน แล้วส่งให้ลูกค้าเป็นคนตัดสินว่ารับวันใหม่ไหม (awaiting_customer)
      if (action === "agent_reschedule") {
        if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.APPROVED].includes(appointment.status as never)) {
          return NextResponse.json({ error: "เลื่อนได้เฉพาะนัดที่ยังไม่ปิดงานเท่านั้น" }, { status: 400 });
        }
        if (!date || !timeSlot) {
          return NextResponse.json({ error: "กรุณาระบุวันและรอบเวลาใหม่" }, { status: 400 });
        }
        if (!appointment.property_id) {
          return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์ของนัดนี้" }, { status: 400 });
        }

        // เช็คว่าวันใหม่ที่จะเลื่อนไป ตัวนายหน้าเองไม่ได้ติดนัดบ้านหลังอื่นอยู่แล้ว
        // (กฎเดียวกับตอนลูกค้าจอง/ลูกค้าเลื่อน — นายหน้าไปนำชมได้ทีละที่)
        if (await hasAgentBookingConflict(user.id, appointment.property_id, new Date(date), timeSlot)) {
          return NextResponse.json({ error: "คุณติดนัดชมบ้านหลังอื่นในช่วงเวลานี้แล้ว กรุณาเลือกวันหรือเวลาอื่น" }, { status: 400 });
        }

        // เก็บวัน+รอบ "ครั้งแรกสุด" ไว้โชว์ขีดฆ่า เขียนครั้งเดียวไม่ทับของเดิม (กฎเดียวกับตอนลูกค้าเลื่อนเอง)
        const shouldKeepOriginal = appointment.original_date === null;

        const updated = await db.appointments.update({
          where: { id },
          data: {
            appointment_date: new Date(date),
            time_slot: timeSlot,
            status: APPOINTMENT_STATUS.AWAITING_CUSTOMER,
            ...(shouldKeepOriginal
              ? { original_date: appointment.appointment_date, original_time_slot: appointment.time_slot }
              : {})
          }
        });

        // ปลดล็อกรอบเดิมคืนระบบ ให้ลูกค้าคนอื่นจองแทนได้
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
          data: { is_booked: false }
        });

        // 🔑 KEYWORD: เปิดรอบวันว่างอัตโนมัติตอนนายหน้าเลื่อนนัด
        // นายหน้าเป็นเจ้าของบ้าน มีสิทธิ์เปิดรอบอยู่แล้ว — ถ้าวันใหม่ยังไม่เคยเปิดไว้ก็สร้างให้เลย
        // ไม่งั้นต้องไปเปิดรอบที่หน้าแก้ไขประกาศก่อนแล้วค่อยกลับมาเลื่อน (2 ขั้นตอน เสียเวลา)
        await db.property_viewing_slots.upsert({
          where: {
            property_id_available_date_time_slot: {
              property_id: appointment.property_id,
              available_date: new Date(date),
              time_slot: timeSlot
            }
          },
          create: {
            property_id: appointment.property_id,
            available_date: new Date(date),
            time_slot: timeSlot,
            is_booked: true
          },
          update: { is_booked: true }
        });

        // แจ้งลูกค้าทันทีว่านายหน้าขอเลื่อน พร้อมบอกวันเก่า -> วันใหม่ ให้เห็นชัดว่าเปลี่ยนไปเป็นอะไร
        if (appointment.customer_id) {
          const prop = await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } });
          const oldLabel = `${toDateKey(appointment.appointment_date)} (${appointment.time_slot === "afternoon" ? "ช่วงบ่าย" : "ช่วงเช้า"})`;
          const newLabel = `${date} (${timeSlot === "afternoon" ? "ช่วงบ่าย" : "ช่วงเช้า"})`;
          sendNotification(
            appointment.customer_id,
            "นายหน้าขอเลื่อนวันนัดหมาย",
            `นายหน้าขอเลื่อนนัดเข้าชม "${prop?.title || "อสังหาริมทรัพย์"}" จากวันที่ ${oldLabel} เป็นวันที่ ${newLabel} กรุณาเข้าไปกดยืนยันวันใหม่ หรือยกเลิกนัดหากไม่สะดวก`,
            "appointment",
            "/appointments"
          );
        }

        return NextResponse.json({ success: true, data: updated });
      }

      if (action === "complete") {
        if (appointment.status !== "approved") return NextResponse.json({ error: "ปิดงานได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        
        // หลังยืนยันรับคิว ทั้งที่ลูกค้ายังไม่ได้ไปดูบ้านจริง ทำให้ระบบ No-show ไร้ความหมาย
        if (!appointmentNeedsResult(appointment)) {
          return NextResponse.json({ error: "ยังไม่ถึงวันนัด ยืนยันผลได้หลังจากถึงวันนัดแล้วเท่านั้น" }, { status: 400 });
        }
        // บันทึก visit_confirmed_at ด้วย เพื่อให้รู้ว่านายหน้ายืนยันผลจริง (ต่างจาก
        // auto-complete ที่ไม่มีใครยืนยัน — ดู autoCompleteOverdueAppointments())
        const updated = await db.appointments.update({ where: { id }, data: { status: "completed", visit_confirmed_at: new Date() } });
        if (appointment.customer_id) {
          const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
          sendNotification(
            appointment.customer_id,
            "การนำชมโครงการเสร็จสิ้น",
            `การเข้าชมโครงการ "${prop?.title || "อสังหาริมทรัพย์"}" เสร็จสมบูรณ์แล้ว ขอเชิญท่านร่วมบันทึกประเมินความพึงพอใจในการให้บริการ`,
            "review",
            "/appointments"
          );
        }
        return NextResponse.json({ success: true, data: updated });
      }

      // ต้องระบุเหตุผลเสมอเหมือนปฏิเสธนัด — เก็บลง no_show_note คนละคอลัมน์กับ cancel_reason
      if (action === "no_show") {
        if (appointment.status !== "approved") {
          return NextResponse.json({ error: "ยืนยันผลได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        }
        
        if (!appointmentNeedsResult(appointment)) {
          return NextResponse.json({ error: "ยังไม่ถึงวันนัด ยืนยันผลได้หลังจากถึงวันนัดแล้วเท่านั้น" }, { status: 400 });
        }
        const noShowNote = typeof reason === "string" ? reason.trim() : "";
        if (!noShowNote) {
          return NextResponse.json({ error: "กรุณาระบุเหตุผลที่ลูกค้าไม่มาตามนัด" }, { status: 400 });
        }
        const updated = await db.appointments.update({
          where: { id },
          data: { status: "no_show", no_show_note: noShowNote, visit_confirmed_at: new Date() }
        });
        if (appointment.customer_id) {
          const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
          sendNotification(
            appointment.customer_id,
            "นัดหมายถูกบันทึกว่าไม่มาตามนัด",
            `นายหน้าบันทึกว่าคุณไม่ได้เข้าชม "${prop?.title || "อสังหาริมทรัพย์"}" ตามนัดหมาย (เหตุผล: ${noShowNote}) หากมีนัดที่ไม่มาตามนัดสะสมครบ ${NO_SHOW_LIMIT} ครั้ง ระบบจะจำกัดการจองนัดใหม่ชั่วคราว`,
            "appointment",
            "/appointments"
          );
        }
        return NextResponse.json({ success: true, data: updated });
      }

      if (appointment.status !== "pending") return NextResponse.json({ error: "นัดหมายนี้ถูกดำเนินการไปแล้ว" }, { status: 400 });

      // ปฏิเสธต้องระบุเหตุผลเสมอ เพื่อให้ลูกค้ารู้ว่าทำไมถึงไม่ได้ และตัดสินใจจองรอบใหม่ได้ถูก
      const rejectReason = typeof reason === "string" ? reason.trim() : "";
      if (action === "reject" && !rejectReason) {
        return NextResponse.json({ error: "กรุณาระบุเหตุผลในการปฏิเสธนัดหมาย" }, { status: 400 });
      }

      // นายหน้าอนุมัติ (approved) หรือ ปฏิเสธ (rejected)
      const newStatus = action === "confirm" ? "approved" : "rejected";
      const updated = await db.appointments.update({
        where: { id },
        data: {
          status: newStatus,
          ...(action === "reject" ? { cancel_reason: rejectReason } : {})
        }
      });

      // กรณีปฏิเสธ -> ปลดล็อกรอบเวลานัดหมายให้ผู้ใช้อื่นจองได้ต่อไป (is_booked = false)
      // หมายเหตุ: การกันนายหน้ารับนัดชนข้ามบ้าน (hasAgentBookingConflict) ผูกกับ "สถานะนัด"
      // พอสถานะเปลี่ยนเป็น rejected แล้ว รอบนี้จะหลุดจากการกันชนเองอัตโนมัติ ไม่ต้องปลดเพิ่ม
      if (action === "reject" && appointment.property_id) {
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
          data: { is_booked: false }
        });
      }

      // ส่งแจ้งเตือนผลการตอบรับไปยังลูกค้า
      const property = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
      const propertyTitle = property?.title || "อสังหาริมทรัพย์";

      if (appointment.customer_id) {
        const notiTitle = action === "confirm" ? "ยืนยันคำขอนัดหมายเข้าชมโครงการ" : "แจ้งเปลี่ยนแปลงคำขอนัดหมาย";
        const notiContent = action === "confirm"
          ? `รายการนัดหมายเข้าชม "${propertyTitle}" ได้รับการยืนยันจากนายหน้าเรียบร้อยแล้ว`
          : `รายการนัดหมายเข้าชม "${propertyTitle}" ถูกปฏิเสธโดยนายหน้า (เหตุผล: ${rejectReason}) รอบเวลานี้เปิดให้จองใหม่แล้ว หรือเลือกช่วงเวลาอื่นได้`;
        sendNotification(appointment.customer_id, notiTitle, notiContent, "appointment", "/appointments");
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // 🔑 KEYWORD: ลูกค้ายืนยันวันใหม่ที่นายหน้าขอเลื่อน
    // คู่กับ agent_reschedule — ลูกค้าเป็นคนตัดสินใจเอง ไม่ใช่นายหน้ายืนยันข้อเสนอตัวเอง
    // (ถ้าไม่สะดวกก็กดยกเลิกนัดได้ตามปกติ ใช้ปุ่มยกเลิกเดิม)
    if (action === "customer_accept") {
      if (appointment.customer_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }
      if (appointment.status !== APPOINTMENT_STATUS.AWAITING_CUSTOMER) {
        return NextResponse.json({ error: "นัดหมายนี้ไม่ได้อยู่ระหว่างรอยืนยันวันใหม่" }, { status: 400 });
      }

      const updated = await db.appointments.update({
        where: { id },
        data: { status: APPOINTMENT_STATUS.APPROVED }
      });

      if (appointment.agent_id) {
        const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
        const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ลูกค้า";
        sendNotification(
          appointment.agent_id,
          "ลูกค้ายืนยันวันนัดใหม่แล้ว",
          `คุณ ${customerName} ยืนยันวันนัดใหม่สำหรับ "${prop?.title || "อสังหาริมทรัพย์"}" วันที่ ${toDateKey(appointment.appointment_date)} เรียบร้อยแล้ว`,
          "appointment",
          "/agent/appointments"
        );
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // --------------------------------------------------------------------------
    // (ข) กรณีฝั่งลูกค้าจัดการ: ขอเปลี่ยนวันและเวลานัดหมายใหม่
    // --------------------------------------------------------------------------
    if (date && timeSlot) {
      if (appointment.customer_id !== user.id || appointment.status !== "pending") {
        return NextResponse.json({ error: "แก้ไขได้เฉพาะนัดหมายของคุณที่ยังไม่ถูกยืนยันเท่านั้น" }, { status: 400 });
      }
      if (!appointment.property_id) return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์" }, { status: 400 });

      const isSameSlot = toDateKey(appointment.appointment_date) === date && appointment.time_slot === timeSlot;
      if (!isSameSlot) {
        const targetSlot = await db.property_viewing_slots.findUnique({
          where: { property_id_available_date_time_slot: { property_id: appointment.property_id, available_date: new Date(date), time_slot: timeSlot } }
        });
        if (!targetSlot) return NextResponse.json({ error: "ไม่พบวันว่างนี้ในระบบ" }, { status: 400 });
        if (targetSlot.is_booked) return NextResponse.json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว" }, { status: 400 });

        // เช็คนัดชนบ้านหลังอื่นของนายหน้าคนเดียวกันด้วย เหมือนตอนจองครั้งแรก
        if (appointment.agent_id && await hasAgentBookingConflict(appointment.agent_id, appointment.property_id, new Date(date), timeSlot)) {
          return NextResponse.json({ error: "นายหน้าติดนัดชมบ้านหลังอื่นในช่วงเวลานี้แล้ว กรุณาเลือกวันหรือเวลาอื่น" }, { status: 400 });
        }
      }

      // ⚡ สลับการล็อกรอบเวลาแบบ Transaction ป้องกันการแย่งจองรอบใหม่ในเสี้ยววินาทีเดียวกัน
      const shouldKeepOriginal = !isSameSlot && appointment.original_date === null;

      const updated = await db.$transaction(async (tx) => {
        if (!isSameSlot) {
          // ล็อกรอบใหม่ด้วย Atomic Condition
          const lockNew = await tx.property_viewing_slots.updateMany({
            where: {
              property_id: appointment.property_id!,
              available_date: new Date(date),
              time_slot: timeSlot,
              is_booked: false
            },
            data: { is_booked: true }
          });
          if (lockNew.count === 0) {
            throw new Error("SLOT_ALREADY_BOOKED");
          }

          // ปลดล็อกรอบเดิมคืนระบบ
          await tx.property_viewing_slots.updateMany({
            where: {
              property_id: appointment.property_id!,
              available_date: appointment.appointment_date,
              time_slot: appointment.time_slot ?? undefined
            },
            data: { is_booked: false }
          });
        }

        return tx.appointments.update({
          where: { id },
          data: {
            appointment_date: new Date(date),
            time_slot: timeSlot,
            ...(shouldKeepOriginal
              ? { original_date: appointment.appointment_date, original_time_slot: appointment.time_slot }
              : {})
          }
        });
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "SLOT_ALREADY_BOOKED") {
      return NextResponse.json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกรอบเวลาอื่น" }, { status: 409 });
    }
    return NextResponse.json({ error: "อัปเดตนัดหมายล้มเหลว: " + msg }, { status: 500 });
  }
}

// ==============================================================================
// 4. DELETE: ยกเลิกคำขอนัดหมาย (คืนวันว่าง + บันทึกเหตุผลลงฐานข้อมูล)
// ==============================================================================
export async function DELETE(request: Request) {
  try {
    // 4.1 ตรวจสอบผู้ใช้งานที่ล็อกอิน
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    // 4.2 ดึงรหัสนัดหมาย (id) และเหตุผลในการยกเลิก (reason) จาก URL Parameters
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const reason = url.searchParams.get("reason") || "";
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย (id)" }, { status: 400 });

    // 4.3 ค้นหาข้อมูลนัดหมายที่จะยกเลิก
    const appointment = await db.appointments.findUnique({
      where: { id },
      include: { properties: true }
    });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    // 4.4 ตรวจสอบสิทธิ์: ต้องเป็นลูกค้าเจ้าของนัด หรือ นายหน้าผู้ดูแลนัดนี้เท่านั้น
    const isCustomer = appointment.customer_id === user.id;
    const isAgent = appointment.agent_id === user.id;
    if (!isCustomer && !isAgent) return NextResponse.json({ error: "คุณไม่มีสิทธิ์ยกเลิกนัดหมายนี้" }, { status: 403 });

    // 4.5 ป้องกันการยกเลิกซ้ำในนัดที่ปิดงานไปแล้ว (completed, cancelled, rejected)
    if (["completed", "cancelled", "rejected"].includes(appointment.status || "")) {
      return NextResponse.json({ error: "นัดหมายนี้ถูกปิดไปแล้ว ไม่สามารถยกเลิกซ้ำได้" }, { status: 400 });
    }

    // 4.6 ปลดล็อกรอบเวลาว่างคืนให้ระบบ (ตั้งค่า is_booked = false)
    if (appointment.property_id && appointment.appointment_date) {
      await db.property_viewing_slots.updateMany({
        where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
        data: { is_booked: false }
      });
    }

    // 4.7 อัปเดตสถานะเป็น 'cancelled' และบันทึกเหตุผล cancel_reason ลงตาราง appointments ในฐานข้อมูลจริง
    const updated = await db.appointments.update({
      where: { id },
      data: { status: "cancelled", cancel_reason: reason || null }
    });

    // 4.8 ส่งการแจ้งเตือนการยกเลิกพร้อมเหตุผลไปยังคู่สัญญาอีกฝ่าย
    const propertyTitle = appointment.properties?.title || "อสังหาริมทรัพย์";
    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ผู้ใช้";
    const dateStr = toDateKey(appointment.appointment_date);
    const reasonText = reason ? ` (เหตุผล: ${reason})` : "";

    if (isCustomer && appointment.agent_id) {
      sendNotification(
        appointment.agent_id,
        "แจ้งยกเลิกรายการนัดหมาย",
        `ผู้ใช้ (${customerName}) ได้ยกเลิกรายการนัดหมายเข้าชม "${propertyTitle}" ประจำวันที่ ${dateStr}${reasonText}`,
        "appointment",
        "/agent/appointments"
      );
    } else if (isAgent && appointment.customer_id) {
      sendNotification(
        appointment.customer_id,
        "แจ้งยกเลิกรายการนัดหมาย",
        `นายหน้าผู้ดูแลโครงการได้ยกเลิกรายการนัดหมายเข้าชม "${propertyTitle}" ประจำวันที่ ${dateStr}${reasonText}`,
        "appointment",
        "/appointments"
      );
    }

    return NextResponse.json({ success: true, message: "ยกเลิกนัดหมายสำเร็จ", data: updated });
  } catch (error) {
    return NextResponse.json({ error: "ยกเลิกนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}