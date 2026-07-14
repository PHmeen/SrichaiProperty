import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";

// GET: ดึงรายการนัดหมายทั้งหมดของผู้ใช้ที่ล็อกอินอยู่
export async function GET() {
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

    // ดึงการนัดหมายทั้งหมดของลูกค้าคนนี้
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
      else if (apt.status === 'rejected') mappedStatus = 'cancelled';
      else mappedStatus = 'pending';

      // แมปช่วงเวลา
      const timeSlotLabel = apt.time_slot === 'morning' ? 'ช่วงเช้า (09:00 - 12:00 น.)' : 'ช่วงบ่าย (13:00 - 16:00 น.)';

      return {
        id: apt.id,
        propertyId: apt.property_id || "",
        date: apt.appointment_date.toISOString().split('T')[0],
        timeSlot: timeSlotLabel,
        note: apt.note || "",
        status: mappedStatus,
        propertyName: prop?.title || "ไม่พบข้อมูลอสังหาฯ",
        propertyPrice: prop ? "฿" + Number(prop.price).toLocaleString() : "฿0",
        propertyImage: propImage,
        propertyType: prop?.property_types?.name || "บ้านเดี่ยว",
        agentName,
        agentImage
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

    return NextResponse.json({ success: true, data: newAppointment });
  } catch (error) {
    const err = error as Error;
    console.error("Create Appointment Error:", err);
    return NextResponse.json({ error: "สร้างคำขอนัดหมายล้มเหลว: " + err.message }, { status: 500 });
  }
}
