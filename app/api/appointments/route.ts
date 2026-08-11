import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

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

    // 1.3 ดึงข้อมูลนัดหมายจากฐานข้อมูล PostgreSQL ผ่าน Prisma ORM
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
        date: toDateKey(apt.appointment_date),
        timeSlot: apt.time_slot,
        timeSlotText,
        status: apt.status,
        note: apt.note || "",
        cancelReason: apt.cancel_reason || "",
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

    // 2.5 แปลงข้อความรอบเวลาให้อยู่ในคีย์มาตรฐาน DB ('morning' หรือ 'afternoon')
    const dbTimeSlot = timeSlot.includes("13:") || timeSlot.includes("15:") || timeSlot.includes("บ่าย") || timeSlot.toLowerCase().includes("afternoon") ? "afternoon" : "morning";

    // 2.6 ตรวจสอบว่ารอบเวลานี้เปิดว่างจริงในตาราง property_viewing_slots และยังไม่มีคนจองคิวไปก่อน
    const targetSlot = await db.property_viewing_slots.findUnique({
      where: {
        property_id_available_date_time_slot: {
          property_id: property.id,
          available_date: new Date(date),
          time_slot: dbTimeSlot
        }
      }
    });
    if (!targetSlot) return NextResponse.json({ error: "ไม่พบรอบเข้าชมนี้ กรุณาเลือกวันและช่วงเวลาที่นายหน้าเปิดไว้" }, { status: 400 });
    if (targetSlot.is_booked) return NextResponse.json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว" }, { status: 400 });

    // 2.7 สร้างคำขอนัดหมายใหม่ลงในตาราง appointments (สถานะเริ่มต้นเป็น 'pending')
    const newAppointment = await db.appointments.create({
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

    // 2.8 ล็อกรอบเวลานี้ในตาราง property_viewing_slots ทันทีเพื่อป้องกันไม่ให้ผู้อื่นจองซ้ำ (is_booked = true)
    await db.property_viewing_slots.updateMany({
      where: { property_id: property.id, available_date: new Date(date), time_slot: dbTimeSlot },
      data: { is_booked: true }
    });

    // 2.9 ส่งการแจ้งเตือนไปยังนายหน้าผู้ดูแลและลูกค้าที่ทำรายการ
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
      "/customer/appointments"
    );

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error) {
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
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

    const { id, action, date, timeSlot } = await request.json();
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย" }, { status: 400 });

    // 3.2 ค้นหาข้อมูลนัดหมายที่จะแก้ไข
    const appointment = await db.appointments.findUnique({ where: { id } });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    // --------------------------------------------------------------------------
    // (ก) กรณีฝั่งนายหน้าจัดการ: ยืนยัน (confirm), ปฏิเสธ (reject), หรือ ปิดงาน (complete)
    // --------------------------------------------------------------------------
    if (["confirm", "reject", "complete"].includes(action)) {
      // ตรวจสอบสิทธิ์: ต้องเป็นนายหน้าเจ้าของคิวงานนี้เท่านั้น
      if (user.role_id !== "agent" || appointment.agent_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }

      // นายหน้ากดปิดงานเมื่อพาลูกค้าชมสถานที่จริงเรียบร้อยแล้ว (status -> completed)
      if (action === "complete") {
        if (appointment.status !== "approved") return NextResponse.json({ error: "ปิดงานได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        const updated = await db.appointments.update({ where: { id }, data: { status: "completed" } });
        if (appointment.customer_id) {
          const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
          sendNotification(
            appointment.customer_id,
            "การนำชมโครงการเสร็จสิ้น",
            `การเข้าชมโครงการ "${prop?.title || "อสังหาริมทรัพย์"}" เสร็จสมบูรณ์แล้ว ขอเชิญท่านร่วมบันทึกประเมินความพึงพอใจในการให้บริการ`,
            "review",
            "/customer/appointments"
          );
        }
        return NextResponse.json({ success: true, data: updated });
      }

      if (appointment.status !== "pending") return NextResponse.json({ error: "นัดหมายนี้ถูกดำเนินการไปแล้ว" }, { status: 400 });

      // นายหน้าอนุมัติ (approved) หรือ ปฏิเสธ (rejected)
      const newStatus = action === "confirm" ? "approved" : "rejected";
      const updated = await db.appointments.update({ where: { id }, data: { status: newStatus } });

      // กรณีปฏิเสธ -> ปลดล็อกรอบเวลานัดหมายให้ผู้ใช้อื่นจองได้ต่อไป (is_booked = false)
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
          : `รายการนัดหมายเข้าชม "${propertyTitle}" ไม่สามารถดำเนินการได้ในวันดังกล่าว กรุณาเลือกช่วงเวลาอื่น`;
        sendNotification(appointment.customer_id, notiTitle, notiContent, "appointment", "/customer/appointments");
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
      }

      const updated = await db.appointments.update({
        where: { id },
        data: { appointment_date: new Date(date), time_slot: timeSlot }
      });

      // สลับการล็อกรอบเวลา: ปลดล็อกรอบเดิมคืนระบบ และ ไปล็อกรอบใหม่
      if (!isSameSlot) {
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
          data: { is_booked: false }
        });
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: new Date(date), time_slot: timeSlot },
          data: { is_booked: true }
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "อัปเดตนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
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
        "/customer/appointments"
      );
    }

    return NextResponse.json({ success: true, message: "ยกเลิกนัดหมายสำเร็จ", data: updated });
  } catch (error) {
    return NextResponse.json({ error: "ยกเลิกนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}