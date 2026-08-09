import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

/**
 * ==============================================================================
 * API Route: /api/appointments (ระบบจัดการการนัดหมายเข้าชมบ้าน)
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET    - ดึงรายการนัดหมาย (แยกสิทธิ์: ลูกค้าดูของตัวเอง / นายหน้าดูคิวงาน ?view=agent)
 * 2. POST   - บันทึกคำขอนัดหมายใหม่จากลูกค้า + ล็อกรอบเวลาใน DB + ส่งแจ้งเตือนหานายหน้า
 * 3. PATCH  - นายหน้ากดรับ/ปฏิเสธ/ปิดงาน หรือ ลูกค้าขอเปลี่ยนวันเวลานัดหมาย
 * 4. DELETE - ยกเลิกการนัดหมาย + คืนสิทธิ์รอบเวลาว่างกลับเข้าคิว + บันทึกเหตุผลการยกเลิก
 * ==============================================================================
 */

// Helper 1: ฟังก์ชันแปลงวัตถุ Date ให้เป็นข้อความวันที่รูปแบบ "YYYY-MM-DD"
const toDateKey = (d: Date) => d.toISOString().split("T")[0];

// Helper 2: ดึงข้อมูลผู้ใช้จาก NextAuth Session ที่กำลังเข้าสู่ระบบอยู่
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return db.users.findUnique({ where: { email: session.user.email } });
}

// Helper 3: ฟังก์ชันส่งการแจ้งเตือน (Notifications) ไปยังฐานข้อมูลแบบไม่ขัดจังหวะกระบวนการหลัก
const sendNotification = (userId: string, title: string, content: string, type = "appointment") =>
  db.notifications.create({ data: { user_id: userId, title, content, type, is_read: false } }).catch(() => {});

// ==============================================================================
// 1. GET: ดึงรายการนัดหมาย (รองรับมุมมองลูกค้า และ มุมมองนายหน้า)
// ==============================================================================
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    // เช็คว่าขอข้อมูลมุมมองนายหน้า (?view=agent) หรือไม่
    const isAgent = new URL(request.url).searchParams.get("view") === "agent" && user.role_id === "agent";

    // ดึงข้อมูลนัดหมายจากฐานข้อมูล PostgreSQL ผ่าน Prisma
    const appointments = await db.appointments.findMany({
      where: isAgent ? { agent_id: user.id } : { customer_id: user.id },
      include: {
        properties: {
          include: {
            property_images: { orderBy: { order_index: "asc" }, take: 1 },
            users: { select: { first_name: true, last_name: true, phone: true } }
          }
        },
        users_appointments_customer_idTousers: {
          select: { id: true, first_name: true, last_name: true, phone: true, email: true, profile_image: true }
        }
      },
      orderBy: { appointment_date: "asc" } // เรียงลำดับตามวันที่นัดหมายจากใกล้ไปไกล
    });

    // จัดฟอร์แมตโครงสร้างข้อมูลให้ง่ายต่อการนำไปแสดงผลบนหน้าบ้าน (React Components)
    const formatted = appointments.map((apt) => {
      const p = apt.properties;
      const cust = apt.users_appointments_customer_idTousers;
      const agentUser = p?.users;

      const customerName = cust ? `${cust.first_name || ""} ${cust.last_name || ""}`.trim() : "ลูกค้าทั่วไป";
      const agentName = agentUser ? `${agentUser.first_name || ""} ${agentUser.last_name || ""}`.trim() : "นายหน้า";
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
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { propertyId, date, timeSlot, note } = await request.json();
    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" }, { status: 400 });
    }

    const property = await db.properties.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์นี้" }, { status: 404 });

    // กฎธุรกิจ: 1 ลูกค้า จองค้างไว้ได้ทีละ 1 นัดต่อบ้าน 1 หลัง (ต้องรอผลก่อนถึงจะจองซ้ำได้)
    const existing = await db.appointments.findFirst({
      where: { customer_id: user.id, property_id: property.id, status: { in: ["pending", "approved"] } }
    });
    if (existing) {
      return NextResponse.json({ error: "คุณมีนัดหมายค้างอยู่สำหรับบ้านหลังนี้แล้ว กรุณารอผลหรือยกเลิกนัดเดิมก่อนจองใหม่" }, { status: 400 });
    }

    // แปลงข้อความรอบเวลาให้อยู่ในรูปแบบคีย์ 'morning' หรือ 'afternoon'
    const dbTimeSlot = timeSlot.includes("13:") || timeSlot.includes("15:") || timeSlot.includes("บ่าย") || timeSlot.toLowerCase().includes("afternoon") ? "afternoon" : "morning";

    // ตรวจสอบว่ารอบเวลานี้เปิดว่างจริงในตาราง property_viewing_slots และยังไม่มีคนจอง
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

    // 2.1 สร้างแถวข้อมูลนัดหมายใหม่ (สถานะเริ่มต้นเป็น 'pending')
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

    // 2.2 ล็อกรอบเวลานี้ในฐานข้อมูลเพื่อป้องกันไม่ให้ผู้อื่นจองซ้ำ (is_booked = true)
    await db.property_viewing_slots.updateMany({
      where: { property_id: property.id, available_date: new Date(date), time_slot: dbTimeSlot },
      data: { is_booked: true }
    });

    // 2.3 ส่งการแจ้งเตือนหานายหน้าและลูกค้า
    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ลูกค้า";
    const timeLabel = dbTimeSlot === "morning" ? "ช่วงเช้า (10:00 - 12:00 น.)" : "ช่วงบ่าย (14:00 - 16:00 น.)";

    if (property.agent_id) {
      sendNotification(property.agent_id, "🏠 มีคำขอนัดหมายดูบ้านใหม่", `${customerName} ได้ส่งคำขอนัดหมายดู "${property.title}" วันที่ ${date} (${timeLabel})`);
    }
    sendNotification(user.id, "✅ ส่งคำขอนัดหมายเรียบร้อยแล้ว", `ส่งคำขอนัดชม "${property.title}" สำหรับวันที่ ${date} เรียบร้อยแล้ว ระบบกำลังส่งต่อให้นายหน้ายืนยัน`);

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error) {
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ==============================================================================
// 3. PATCH: การอัปเดตนัดหมาย (ฝั่งนายหน้าตอบรับ/ปฏิเสธ หรือ ฝั่งลูกค้าเลื่อนวัน)
// ==============================================================================
export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { id, action, date, timeSlot } = await request.json();
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย" }, { status: 400 });

    const appointment = await db.appointments.findUnique({ where: { id } });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    // --------------------------------------------------------------------------
    // (ก) กรณีฝั่งนายหน้าจัดการ: ยืนยัน (confirm), ปฏิเสธ (reject), หรือ ปิดงาน (complete)
    // --------------------------------------------------------------------------
    if (["confirm", "reject", "complete"].includes(action)) {
      if (user.role_id !== "agent" || appointment.agent_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }

      // นายหน้ากดปิดงานเมื่อพาลูกค้าชมสถานที่จริงเรียบร้อยแล้ว (status -> completed)
      if (action === "complete") {
        if (appointment.status !== "approved") return NextResponse.json({ error: "ปิดงานได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        const updated = await db.appointments.update({ where: { id }, data: { status: "completed" } });
        if (appointment.customer_id) {
          const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
          sendNotification(appointment.customer_id, "✨ การนัดชมบ้านเสร็จสิ้นแล้ว", `การเข้าชมบ้าน "${prop?.title || "อสังหาฯ"}" เสร็จสิ้นเรียบร้อยแล้ว`, "review");
        }
        return NextResponse.json({ success: true, data: updated });
      }

      if (appointment.status !== "pending") return NextResponse.json({ error: "นัดหมายนี้ถูกดำเนินการไปแล้ว" }, { status: 400 });

      // เปลี่ยนสถานะเป็น approved หรือ rejected
      const newStatus = action === "confirm" ? "approved" : "rejected";
      const updated = await db.appointments.update({ where: { id }, data: { status: newStatus } });

      // กรณีนายหน้าปฏิเสธ -> ปลดล็อกรอบเวลานัดหมายให้คนอื่นจองต่อได้ (is_booked = false)
      if (action === "reject" && appointment.property_id) {
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
          data: { is_booked: false }
        });
      }

      // ส่งแจ้งเตือนผลการอนุมัติ/ปฏิเสธไปยังลูกค้า
      const property = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
      const propertyTitle = property?.title || "อสังหาริมทรัพย์";

      if (appointment.customer_id) {
        const notiTitle = action === "confirm" ? "🎉 นายหน้ายืนยันการนัดชมบ้านแล้ว" : "❌ คำขอนัดหมายดูบ้านถูกปฏิเสธ";
        const notiContent = action === "confirm" ? `นัดหมายชมบ้าน "${propertyTitle}" ได้รับการยืนยันเรียบร้อยแล้ว` : `คำขอนัดชมบ้าน "${propertyTitle}" ถูกปฏิเสธ`;
        sendNotification(appointment.customer_id, notiTitle, notiContent);
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // --------------------------------------------------------------------------
    // (ข) กรณีฝั่งลูกค้าจัดการ: ขอเลื่อนเปลี่ยนวันเวลานัดหมายใหม่
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

      // สลับการล็อกรอบเวลา: ปลดล็อกรอบเดิมคืน และไปล็อกรอบใหม่
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
// 4. DELETE: ยกเลิกคำขอนัดหมาย (คืนวันว่าง + บันทึกเหตุผลลง DB)
// ==============================================================================
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const reason = url.searchParams.get("reason") || "";
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย (id)" }, { status: 400 });

    const appointment = await db.appointments.findUnique({
      where: { id },
      include: { properties: true }
    });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    const isCustomer = appointment.customer_id === user.id;
    const isAgent = appointment.agent_id === user.id;
    if (!isCustomer && !isAgent) return NextResponse.json({ error: "คุณไม่มีสิทธิ์ยกเลิกนัดหมายนี้" }, { status: 403 });

    // ป้องกันการยกเลิกซ้ำในนัดที่จบหรือถูกยกเลิกไปแล้ว
    if (["completed", "cancelled", "rejected"].includes(appointment.status || "")) {
      return NextResponse.json({ error: "นัดหมายนี้ถูกปิดไปแล้ว ไม่สามารถยกเลิกซ้ำได้" }, { status: 400 });
    }

    // 4.1 ปลดล็อกรอบเวลาว่างคืนให้ระบบ (is_booked = false)
    if (appointment.property_id && appointment.appointment_date) {
      await db.property_viewing_slots.updateMany({
        where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
        data: { is_booked: false }
      });
    }

    // 4.2 เปลี่ยนสถานะเป็น 'cancelled' และบันทึกเหตุผล cancel_reason ลง DB
    const updated = await db.appointments.update({
      where: { id },
      data: { status: "cancelled", cancel_reason: reason || null }
    });

    // 4.3 ส่งการแจ้งเตือนยกเลิกไปยังอีกฝ่าย
    const propertyTitle = appointment.properties?.title || "อสังหาริมทรัพย์";
    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ผู้ใช้";
    const dateStr = toDateKey(appointment.appointment_date);
    const reasonText = reason ? ` (เหตุผล: ${reason})` : "";

    if (isCustomer && appointment.agent_id) {
      sendNotification(appointment.agent_id, "🚨 ลูกค้ายกเลิกนัดหมายดูบ้าน", `ลูกค้า (${customerName}) ได้ยกเลิกคิวนัดชมบ้าน "${propertyTitle}" วันที่ ${dateStr}${reasonText}`);
    } else if (isAgent && appointment.customer_id) {
      sendNotification(appointment.customer_id, "🚨 นายหน้าระบุยกเลิกนัดหมายดูบ้าน", `นายหน้าได้ยกเลิกคิวนัดชมบ้าน "${propertyTitle}" วันที่ ${dateStr}${reasonText}`);
    }

    return NextResponse.json({ success: true, message: "ยกเลิกนัดหมายสำเร็จ", data: updated });
  } catch (error) {
    return NextResponse.json({ error: "ยกเลิกนัดหมายล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}