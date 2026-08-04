import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";

// แปลง Date -> "YYYY-MM-DD"
function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// GET: ดึงรายการนัดหมาย
// - ค่าเริ่มต้น (ไม่ใส่ query ?view) : ของลูกค้าที่ล็อกอินอยู่ (พฤติกรรมเดิม ใช้โดย AppContext)
// - ?view=agent : ของนายหน้าที่ล็อกอินอยู่ (ใช้โดยหน้า Appointments Manager)
export async function GET(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    // ค้นหาผู้ใช้จากอีเมล
    const user = await db.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");

    // ========== มุมมองนายหน้า (Appointments Manager) ==========
    if (view === "agent") {
      if (user.role_id !== "agent") {
        return NextResponse.json({ error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" }, { status: 403 });
      }

      const appointments = await db.appointments.findMany({
        where: { agent_id: user.id },
        include: {
          properties: {
            include: {
              property_images: { orderBy: { order_index: "asc" }, take: 1 }
            }
          },
          users_appointments_customer_idTousers: {
            select: { first_name: true, last_name: true, phone: true }
          }
        },
        orderBy: { appointment_date: "asc" }
      });

      const formatted = appointments.map((apt) => {
        const customer = apt.users_appointments_customer_idTousers;
        const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "ลูกค้าทั่วไป";
        const prop = apt.properties;
        const propImage = prop?.property_images?.[0]?.image_url
          || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";

        return {
          id: apt.id,
          status: apt.status || "pending", // pending | approved | rejected | completed
          date: toDateKey(apt.appointment_date),
          timeSlot: apt.time_slot || "morning", // 'morning' | 'afternoon'
          note: apt.note || "",
          customerName,
          customerPhone: customer?.phone || null,
          propertyId: apt.property_id || "",
          propertyTitle: prop?.title || "ไม่พบข้อมูลอสังหาฯ",
          propertyImage: propImage,
          originalDate: apt.original_date ? toDateKey(apt.original_date) : null,
          originalTimeSlot: apt.original_time_slot || null,
          wasEdited: Boolean(apt.original_date)
        };
      });

      return NextResponse.json(formatted);
    }

    // ========== มุมมองลูกค้า (พฤติกรรมเดิม ห้ามแก้) ==========
    const appointments = await db.appointments.findMany({
      where: {
        customer_id: user.id
      },
      include: {
        properties: {
          include: {
            property_images: {
              orderBy: { order_index: "asc" },
              take: 1
            },
            property_types: true,
            users: { // นายหน้าที่ดูแลทรัพย์
              select: {
                first_name: true,
                last_name: true,
                profile_image: true
              }
            }
          }
        }
      },
      orderBy: {
        appointment_date: "asc"
      }
    });

    // แปลงโครงสร้างข้อมูลให้เข้ากับอินเตอร์เฟซ Appointment ของหน้าบ้าน
    const formattedAppointments = appointments.map((apt) => {
      const prop = apt.properties;
      const agentName = prop?.users ? `${prop.users.first_name} ${prop.users.last_name}` : "ไม่ระบุตัวแทน";
      const agentImage = prop?.users?.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=1e40af&color=fff`;
      const propImage = prop?.property_images?.[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";

      // แมปสถานะจาก DB ไปยังหน้าบ้าน
      let mappedStatus: 'upcoming' | 'past' | 'cancelled' | 'pending' = 'pending';
      if (apt.status === 'approved') mappedStatus = 'upcoming';
      else if (apt.status === 'completed' || apt.status === 'no-show') mappedStatus = 'past';
      else if (apt.status === 'rejected' || apt.status === 'cancelled') mappedStatus = 'cancelled';
      else mappedStatus = 'pending';

      // แมปช่วงเวลา
      const timeSlotLabel = apt.time_slot === 'morning' ? 'ช่วงเช้า (09:00 - 12:00 น.)' : 'ช่วงบ่าย (13:00 - 16:00 น.)';

      const d = new Date(apt.appointment_date);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

      return {
        id: apt.id,
        propertyId: apt.property_id || "",
        date: dateStr,
        timeSlot: timeSlotLabel,
        note: apt.note || "",
        status: mappedStatus,
        propertyName: prop?.title || "ไม่พบข้อมูลอสังหาฯ",
        propertyPrice: prop ? "฿" + Number(prop.price).toLocaleString() : "฿0",
        propertyImage: propImage,
        propertyType: prop?.property_types?.name || "บ้านเดี่ยว",
        agentName,
        agentImage,
        // ข้อมูลเสริมสำหรับปุ่ม "แก้ไขวัน/รอบ" ฝั่งลูกค้า (ค่า raw ของ time_slot เอาไว้ส่งกลับตอน PATCH)
        rawTimeSlot: apt.time_slot || "morning"
      };
    });

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    const err = error as Error;
    console.error("Fetch Appointments Error:", err);
    return NextResponse.json({ error: "ดึงข้อมูลนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}

// POST: บันทึกข้อมูลการนัดหมายใหม่ลงฐานข้อมูล
export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await request.json();
    const { propertyId, date, timeSlot, note } = body;

    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" }, { status: 400 });
    }

    // ดึงข้อมูลทรัพย์เพื่อค้นหาไอดีนายหน้าผู้รับผิดชอบ
    const property = await db.properties.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์นี้" }, { status: 404 });
    }

    // ห้ามลูกค้าคนเดียวกันจองบ้านหลังเดียวกันซ้ำ ถ้ายังมีนัดหมายเดิมที่ยัง "รอยืนยัน" หรือ "ยืนยันแล้ว" ค้างอยู่
    // ต้องรอให้นายหน้ากด "ทำเครื่องหมายเสร็จสิ้น" (เข้าชมบ้านเสร็จแล้ว) หรือถูกปฏิเสธ/ยกเลิกไปก่อน ถึงจะจองใหม่ได้
    const existingActiveAppointment = await db.appointments.findFirst({
      where: {
        customer_id: user.id,
        property_id: propertyId,
        status: { in: ["pending", "approved"] }
      }
    });

    if (existingActiveAppointment) {
      const statusLabel = existingActiveAppointment.status === "approved" ? "ยืนยันแล้ว รอเข้าชม" : "รอนายหน้ายืนยัน";
      return NextResponse.json(
        {
          error: `คุณมีนัดหมายเข้าชมอสังหาริมทรัพย์นี้ค้างอยู่แล้ว (สถานะ: ${statusLabel}) กรุณารอให้การนัดหมายเดิมเสร็จสิ้น หรือยกเลิกนัดหมายเดิมก่อน จึงจะจองใหม่ได้`
        },
        { status: 409 }
      );
    }

    // แปลงข้อความ timeSlot ของหน้าบ้านกลับไปเป็นค่า 'morning' หรือ 'afternoon' ตามเงื่อนไข DB
    let dbTimeSlot = 'morning';
    if (timeSlot.includes("13:") || timeSlot.includes("15:") || timeSlot.includes("บ่าย") || timeSlot.toLowerCase().includes("afternoon")) {
      dbTimeSlot = 'afternoon';
    }

    const newAppointment = await db.appointments.create({
      data: {
        customer_id: user.id,
        agent_id: property.agent_id,
        property_id: property.id,
        appointment_date: new Date(date),
        time_slot: dbTimeSlot,
        status: "pending", // รอยืนยันนัดหมายจากแผงควบคุมนายหน้า
        note: note || ""
      }
    });

    // ปิดวันว่างของบ้านหลังนี้ (mark ว่าถูกจองแล้ว)
    // หมายเหตุ: เดิมโค้ดตรงนี้เคยอัปเดตตาราง agent_availabilities (วันว่างส่วนตัวของนายหน้า) ด้วย
    // แต่ agent_availabilities ผูกกับ agent_id เท่านั้น ไม่ผูกกับ property_id ทำให้การจองบ้านหลังหนึ่ง
    // ไปทำให้บ้านอีกหลังของนายหน้าคนเดียวกันโดนมาร์กว่า "ถูกจองแล้ว" ไปด้วยทั้งที่ไม่เกี่ยวกัน
    // ตามแผนที่เลิกใช้ระบบ agent_availabilities แล้ว จึงตัดส่วนนี้ออก เหลือแค่ property_viewing_slots
    await db.property_viewing_slots.updateMany({
      where: {
        property_id: property.id,
        available_date: new Date(date),
        time_slot: dbTimeSlot
      },
      data: { is_booked: true }
    });

    if (property.agent_id) {
      // ส่งการแจ้งเตือนถึงนายหน้าเจ้าของทรัพย์
      const customerName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "ลูกค้า";
      const timeLabel = dbTimeSlot === "morning" ? "ช่วงเช้า" : "ช่วงบ่าย";
      await db.notifications.create({
        data: {
          user_id: property.agent_id,
          title: "🏠 มีคำขอนัดหมายดูบ้านใหม่",
          content: `${customerName} ได้ส่งคำขอนัดหมายดู "${property.title}" วันที่ ${date} (${timeLabel})`,
          type: "appointment",
          is_read: false
        }
      }).catch(err => console.error("Notification trigger error:", err));
    }

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error) {
    const err = error as Error;
    console.error("Create Appointment Error:", err);
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}

// PATCH: ปรับปรุงสถานะ/วันเวลานัดหมาย
// (ก) นายหน้ายืนยัน / ปฏิเสธ / ปิดงานเสร็จสิ้น : body { id, action: 'confirm' | 'reject' | 'complete' }
// (ข) ลูกค้าแก้วัน/รอบที่จอง (ทำได้เฉพาะตอนสถานะยัง pending) : body { id, date, timeSlot }
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await request.json();
    const { id, action, date, timeSlot } = body;

    if (!id) {
      return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมาย" }, { status: 400 });
    }

    const appointment = await db.appointments.findUnique({ where: { id } });

    if (!appointment) {
      return NextResponse.json({ error: "ไม่พบนัดหมายนี้ในระบบ" }, { status: 404 });
    }

    // -----------------------------------------------------------------
    // (ก) ฝั่งนายหน้า: ยืนยันรับคิว / ปฏิเสธ / ปิดงานเสร็จสิ้น
    // -----------------------------------------------------------------
    if (action === "confirm" || action === "reject" || action === "complete") {
      if (user.role_id !== "agent" || appointment.agent_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์จัดการนัดหมายนี้" }, { status: 403 });
      }

      if (action === "complete") {
        if (appointment.status !== "approved") {
          return NextResponse.json({ error: "ปิดงานได้เฉพาะนัดหมายที่ยืนยันแล้วเท่านั้น" }, { status: 400 });
        }
        const updated = await db.appointments.update({
          where: { id },
          data: { status: "completed" }
        });
        return NextResponse.json({ success: true, data: updated });
      }

      if (appointment.status !== "pending") {
        return NextResponse.json({ error: "นัดหมายนี้ถูกดำเนินการไปแล้ว" }, { status: 400 });
      }

      const newStatus = action === "confirm" ? "approved" : "rejected";
      const updated = await db.appointments.update({
        where: { id },
        data: { status: newStatus }
      });

      // ถ้าปฏิเสธ: ปลดล็อกวันว่างเดิมคืน เผื่อมีลูกค้าคนอื่นมาจองแทน
      if (action === "reject" && appointment.property_id) {
        await db.property_viewing_slots.updateMany({
          where: {
            property_id: appointment.property_id,
            available_date: appointment.appointment_date,
            time_slot: appointment.time_slot ?? undefined
          },
          data: { is_booked: false }
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // -----------------------------------------------------------------
    // (ค) ฝั่งลูกค้า: ยกเลิกนัดหมายของตัวเอง
    // หมายเหตุ: เดิมปุ่ม "ยกเลิกนัด" ฝั่งลูกค้าแก้แค่ React state ในเบราว์เซอร์เฉยๆ
    // ไม่เคยเรียก API เลย ทำให้ (1) วันว่างของบ้านหลังนั้นไม่เคยถูกปลดล็อกคืน
    // และ (2) พอรีเฟรชหน้าเว็บ ระบบไปดึงสถานะจริงจาก DB มา (ซึ่งยังไม่เคยเปลี่ยน)
    // นัดหมายที่ยกเลิกไปแล้วเลยโผล่กลับมาเหมือนเดิม จึงเพิ่ม action นี้ให้บันทึกลง DB จริง
    // -----------------------------------------------------------------
    if (action === "cancel") {
      if (appointment.customer_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์ยกเลิกนัดหมายนี้" }, { status: 403 });
      }

      if (appointment.status !== "pending" && appointment.status !== "approved") {
        return NextResponse.json({ error: "นัดหมายนี้ไม่สามารถยกเลิกได้แล้ว" }, { status: 400 });
      }

      const updated = await db.appointments.update({
        where: { id },
        data: { status: "cancelled" }
      });

      // ปลดล็อกวันว่างเดิมคืน เผื่อมีลูกค้าคนอื่นมาจองแทน
      if (appointment.property_id) {
        await db.property_viewing_slots.updateMany({
          where: {
            property_id: appointment.property_id,
            available_date: appointment.appointment_date,
            time_slot: appointment.time_slot ?? undefined
          },
          data: { is_booked: false }
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    // -----------------------------------------------------------------
    // (ข) ฝั่งลูกค้า: แก้วัน/รอบที่จอง (ทำได้เฉพาะตอนยัง pending)
    // -----------------------------------------------------------------
    if (date && timeSlot) {
      if (appointment.customer_id !== user.id) {
        return NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขนัดหมายนี้" }, { status: 403 });
      }

      if (appointment.status !== "pending") {
        return NextResponse.json({ error: "แก้ไขได้เฉพาะนัดหมายที่ยังไม่ถูกยืนยันเท่านั้น" }, { status: 400 });
      }

      if (!appointment.property_id) {
        return NextResponse.json({ error: "ไม่พบข้อมูลอสังหาริมทรัพย์ของนัดหมายนี้" }, { status: 400 });
      }

      const isSameSlot =
        toDateKey(appointment.appointment_date) === date &&
        appointment.time_slot === timeSlot;

      // ถ้าเปลี่ยนวัน/รอบจริง ต้องเช็คว่ารอบใหม่ว่างและยังไม่มีคนจอง
      if (!isSameSlot) {
        const targetSlot = await db.property_viewing_slots.findUnique({
          where: {
            property_id_available_date_time_slot: {
              property_id: appointment.property_id,
              available_date: new Date(date),
              time_slot: timeSlot
            }
          }
        });

        if (!targetSlot) {
          return NextResponse.json({ error: "ไม่พบวันว่างนี้ในระบบ" }, { status: 400 });
        }
        if (targetSlot.is_booked) {
          return NextResponse.json({ error: "ช่วงเวลานี้ถูกจองไปแล้ว กรุณาเลือกรอบอื่น" }, { status: 400 });
        }
      }

      // เก็บวันที่ลูกค้าจองไว้ครั้งแรกไว้แสดงขีดฆ่า (บันทึกแค่ครั้งแรกที่แก้เท่านั้น)
      const updateData: {
        appointment_date: Date;
        time_slot: string;
        original_date?: Date;
        original_time_slot?: string;
      } = {
        appointment_date: new Date(date),
        time_slot: timeSlot
      };

      if (!appointment.original_date) {
        updateData.original_date = appointment.appointment_date;
        updateData.original_time_slot = appointment.time_slot || "morning";
      }

      const updated = await db.appointments.update({
        where: { id },
        data: updateData
      });

      if (!isSameSlot) {
        // ปลดล็อกวันเก่า
        await db.property_viewing_slots.updateMany({
          where: {
            property_id: appointment.property_id,
            available_date: appointment.appointment_date,
            time_slot: appointment.time_slot ?? undefined
          },
          data: { is_booked: false }
        });
        // ล็อกวันใหม่
        await db.property_viewing_slots.updateMany({
          where: {
            property_id: appointment.property_id,
            available_date: new Date(date),
            time_slot: timeSlot
          },
          data: { is_booked: true }
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "คำขอไม่ถูกต้อง กรุณาระบุ action หรือ date/timeSlot" }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    console.error("Update Appointment Error:", err);
    return NextResponse.json({ error: "อัปเดตนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}