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

    // 1. หาข้อมูลทรัพย์เพื่อเอา agent_id ผู้ดูแลทรัพย์
    const property = await db.properties.findUnique({
      where: { id: propertyId },
      select: { agent_id: true }
    });

    // 2. ดึงวันว่างเฉพาะบ้าน (property_viewing_slots)
    const propertySlots = await db.property_viewing_slots.findMany({
      where: { property_id: propertyId }
    });

    // 3. ดึงวันว่างส่วนตัวของนายหน้าผู้ดูแลทรัพย์ (agent_availabilities)
    let agentSlots: Array<{ id: string; available_date: Date; time_slot: string | null; is_booked: boolean | null }> = [];
    if (property?.agent_id) {
      agentSlots = await db.agent_availabilities.findMany({
        where: { agent_id: property.agent_id }
      });
    }

    // 4. รวมข้อมูลวันว่างทั้ง 2 ส่วน (Map ด้วย date + timeSlot)
    const slotsMap = new Map<string, { id: string; date: string; timeSlot: string; isBooked: boolean }>();

    // ใส่วันว่างส่วนตัวของนายหน้าก่อน
    agentSlots.forEach((s) => {
      if (!s.time_slot) return;
      const d = new Date(s.available_date);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const key = `${dateStr}_${s.time_slot}`;
      slotsMap.set(key, {
        id: s.id,
        date: dateStr,
        timeSlot: s.time_slot,
        isBooked: Boolean(s.is_booked)
      });
    });

    // ใส่วันว่างเฉพาะบ้าน (ถ้ามี จะทับหรือรวมเข้ามา)
    propertySlots.forEach((s) => {
      if (!s.time_slot) return;
      const d = new Date(s.available_date);
      const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
      const key = `${dateStr}_${s.time_slot}`;
      const existing = slotsMap.get(key);
      slotsMap.set(key, {
        id: s.id,
        date: dateStr,
        timeSlot: s.time_slot,
        // ถ้าถูกจองที่ตารางใดตารางหนึ่ง ให้ถือว่าถูกจองแล้ว (isBooked = true)
        isBooked: existing ? existing.isBooked || Boolean(s.is_booked) : Boolean(s.is_booked)
      });
    });

    const formatted = Array.from(slotsMap.values()).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });

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