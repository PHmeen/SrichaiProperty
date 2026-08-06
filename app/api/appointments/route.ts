import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

const toDateKey = (d: Date) => d.toISOString().split("T")[0];

// Helper เช็คความปลอดภัย ดึง User จาก Session
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return db.users.findUnique({ where: { email: session.user.email } });
}

// 📌 GET: ดึงรายการนัดหมาย (ของลูกค้า หรือ ของนายหน้า ?view=agent)
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const isAgent = new URL(request.url).searchParams.get("view") === "agent" && user.role_id === "agent";

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
      orderBy: { appointment_date: "asc" }
    });

    interface AppointmentData {
      id: string;
      property_id: string | null;
      appointment_date: Date;
      time_slot: string | null;
      status: string | null;
      note: string | null;
      cancel_reason?: string | null;
      created_at: Date;
      properties?: {
        title?: string;
        price?: number | string;
        location?: string;
        property_images?: { image_url: string }[];
        users?: { first_name?: string; last_name?: string; phone?: string };
      } | null;
      users_appointments_customer_idTousers?: {
        first_name?: string;
        last_name?: string;
        phone?: string;
        email?: string;
        profile_image?: string;
      } | null;
    }

    const formatted = (appointments as unknown as AppointmentData[]).map((apt) => {
      const p = apt.properties;
      const cust = apt.users_appointments_customer_idTousers;
      const agentUser = p?.users;

      const customerName = cust ? `${cust.first_name || ""} ${cust.last_name || ""}`.trim() : "ลูกค้าทั่วไป";
      const agentName = agentUser ? `${agentUser.first_name || ""} ${agentUser.last_name || ""}`.trim() : "นายหน้า";
      const timeSlotText = apt.time_slot === "morning" ? "10:00 - 12:00 น. (ช่วงเช้า)" : apt.time_slot === "afternoon" ? "14:00 - 16:00 น. (ช่วงบ่าย)" : apt.time_slot || "ไม่ระบุเวลา";

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
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "ดึงข้อมูลนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}

// 📌 POST: บันทึกข้อมูลการนัดหมายใหม่ลงฐานข้อมูล
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

    const dbTimeSlot = timeSlot.includes("13:") || timeSlot.includes("15:") || timeSlot.includes("บ่าย") || timeSlot.toLowerCase().includes("afternoon") ? "afternoon" : "morning";

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

    await db.property_viewing_slots.updateMany({
      where: { property_id: property.id, available_date: new Date(date), time_slot: dbTimeSlot },
      data: { is_booked: true }
    });

    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ลูกค้า";
    const timeLabel = dbTimeSlot === "morning" ? "ช่วงเช้า (10:00 - 12:00 น.)" : "ช่วงบ่าย (14:00 - 16:00 น.)";

    if (property.agent_id) {
      await db.notifications.create({
        data: {
          user_id: property.agent_id,
          title: "🏠 มีคำขอนัดหมายดูบ้านใหม่",
          content: `${customerName} ได้ส่งคำขอนัดหมายดู "${property.title}" วันที่ ${date} (${timeLabel})`,
          type: "appointment"
        }
      }).catch(() => {});
    }

    await db.notifications.create({
      data: {
        user_id: user.id,
        title: "✅ ส่งคำขอนัดหมายเรียบร้อยแล้ว",
        content: `ส่งคำขอนัดชม "${property.title}" สำหรับวันที่ ${date} เรียบร้อยแล้ว ระบบกำลังส่งต่อให้นายหน้ายืนยัน`,
        type: "appointment"
      }
    }).catch(() => {});

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}

// 📌 PATCH: ปรับปรุงสถานะ/วันเวลานัดหมาย (ฝั่งนายหน้าตอบรับ/ปฏิเสธ หรือ ลูกค้าแก้วัน)
export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { id, action, date, timeSlot } = await request.json();
    if (!id) return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย" }, { status: 400 });

    const appointment = await db.appointments.findUnique({ where: { id } });
    if (!appointment) return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });

    // (ก) ฝั่งนายหน้า: ยืนยันรับคิว / ปฏิเสธ / ปิดงานเสร็จสิ้น
    if (action === "confirm" || action === "reject" || action === "complete") {
      if (user.role_id !== "agent" || appointment.agent_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }

      if (action === "complete") {
        if (appointment.status !== "approved") {
          return NextResponse.json({ error: "ปิดงานได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        }
        const updated = await db.appointments.update({ where: { id }, data: { status: "completed" } });

        if (appointment.customer_id) {
          const prop = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
          await db.notifications.create({
            data: {
              user_id: appointment.customer_id,
              title: "✨ การนัดชมบ้านเสร็จสิ้นแล้ว",
              content: `การเข้าชมบ้าน "${prop?.title || "อสังหาฯ"}" เสร็จสิ้นเรียบร้อยแล้ว อย่าลืมให้คะแนนรีวิวการบริการของนายหน้านะครับ`,
              type: "review"
            }
          }).catch(() => {});
        }
        return NextResponse.json({ success: true, data: updated });
      }

      if (appointment.status !== "pending") {
        return NextResponse.json({ error: "นัดหมายนี้ถูกดำเนินการไปแล้ว" }, { status: 400 });
      }

      const newStatus = action === "confirm" ? "approved" : "rejected";
      const updated = await db.appointments.update({ where: { id }, data: { status: newStatus } });

      if (action === "reject" && appointment.property_id) {
        await db.property_viewing_slots.updateMany({
          where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
          data: { is_booked: false }
        });
      }

      const property = appointment.property_id ? await db.properties.findUnique({ where: { id: appointment.property_id }, select: { title: true } }) : null;
      const propertyTitle = property?.title || "อสังหาริมทรัพย์";

      if (appointment.customer_id) {
        const notiTitle = action === "confirm" ? "🎉 นายหน้ายืนยันการนัดชมบ้านแล้ว" : "❌ คำขอนัดหมายดูบ้านถูกปฏิเสธ";
        const notiContent = action === "confirm" ? `นัดหมายชมบ้าน "${propertyTitle}" ได้รับการยืนยันเรียบร้อยแล้ว กรุณาไปตามวันและเวลาที่นัดหมาย` : `คำขอนัดชมบ้าน "${propertyTitle}" ถูกปฏิเสธ คุณสามารถเลือกลองนัดหมายวันเวลาอื่นใหม่ได้`;

        await db.notifications.create({
          data: { user_id: appointment.customer_id, title: notiTitle, content: notiContent, type: "appointment" }
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // (ข) ฝั่งลูกค้า: แก้วันเวลานัดหมาย
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
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: "อัปเดตนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}

// 📌 DELETE: ยกเลิกนัดหมาย (บันทึกสถานะ cancelled และเหตุผล cancel_reason ลง PostgreSQL DB จริง)
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

    // 1) ปลดล็อกวันว่างคืน
    if (appointment.property_id && appointment.appointment_date) {
      await db.property_viewing_slots.updateMany({
        where: { property_id: appointment.property_id, available_date: appointment.appointment_date, time_slot: appointment.time_slot ?? undefined },
        data: { is_booked: false }
      });
    }

    // 2) อัปเดตสถานะเป็น 'cancelled' และบันทึกเหตุผล cancel_reason ลงในฐานข้อมูล PostgreSQL จริง
    const updateData: Record<string, unknown> = { status: 'cancelled' };
    if (reason) {
      updateData.cancel_reason = reason;
    }

    const updated = await db.appointments.update({
      where: { id },
      data: updateData as unknown as { status: string }
    });

    // 3) ส่งแจ้งเตือนหานายหน้าหรือลูกค้าฝั่งตรงข้าม
    const propertyTitle = appointment.properties?.title || "อสังหาริมทรัพย์";
    const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ผู้ใช้";
    const dateStr = toDateKey(appointment.appointment_date);
    const reasonText = reason ? ` (เหตุผล: ${reason})` : "";

    if (isCustomer && appointment.agent_id) {
      await db.notifications.create({
        data: {
          user_id: appointment.agent_id,
          title: "🚨 ลูกค้ายกเลิกนัดหมายดูบ้าน",
          content: `ลูกค้า (${customerName}) ได้ยกเลิกคิวนัดชมบ้าน "${propertyTitle}" วันที่ ${dateStr}${reasonText}`,
          type: "appointment"
        }
      }).catch(() => {});
    } else if (isAgent && appointment.customer_id) {
      await db.notifications.create({
        data: {
          user_id: appointment.customer_id,
          title: "🚨 นายหน้าระบุยกเลิกนัดหมายดูบ้าน",
          content: `นายหน้าได้ยกเลิกคิวนัดชมบ้าน "${propertyTitle}" วันที่ ${dateStr}${reasonText}`,
          type: "appointment"
        }
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "ยกเลิกนัดหมายสำเร็จ", data: updated });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("DELETE appointment error details:", err);
    return NextResponse.json({ error: "ยกเลิกนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}