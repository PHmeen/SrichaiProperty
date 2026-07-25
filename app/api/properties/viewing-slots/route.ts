// === API วันเวลาที่เปิดให้ลูกค้าจองเข้าชม "บ้านแต่ละหลัง" (ผูกกับ property_id) ===
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

interface AgentSession {
  user?: {
    id?: string;
    role?: string;
  };
}

// GET: ดึงวันว่างของบ้านหลังหนึ่งๆ — สาธารณะ (ลูกค้าและนายหน้าใช้ร่วมกันได้)
// ใช้: /api/properties/viewing-slots?propertyId=xxxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอสังหาริมทรัพย์ (propertyId)" },
        { status: 400 }
      );
    }

    const slots = await db.property_viewing_slots.findMany({
      where: { property_id: propertyId },
      orderBy: [{ available_date: "asc" }, { time_slot: "asc" }]
    });

    const formatted = slots.map((s: { id: string; available_date: Date; time_slot: string; is_booked: boolean | null }) => ({
      id: s.id,
      date: s.available_date.toISOString().split("T")[0],
      timeSlot: s.time_slot,
      isBooked: s.is_booked
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