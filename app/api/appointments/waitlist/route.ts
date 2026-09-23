import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { isCustomerBlockedByNoShow } from "@/lib/services/noShowService";
import {
  WAITLIST_MAX_PER_CUSTOMER,
  countActiveWaitlist,
  findCustomerWaitlistForProperty,
  purgeExpiredWaitlist
} from "@/lib/services/waitlistService";
import { NO_SHOW_LIMIT } from "@/lib/constants";

// ==============================================================================
// API คิวรอรอบเข้าชม (Waitlist)
// ใช้ตอนลูกค้าเจอว่ารอบที่อยากได้ถูกจองไปแล้ว จะได้ลงชื่อรอไว้
// แล้วระบบแจ้งเตือนให้เองตอนรอบนั้นถูกปล่อยคืน (ดู lib/services/waitlistService.ts)
// ==============================================================================

/** ดึงเซสชันแล้วแปลงเป็นผู้ใช้จริงในฐานข้อมูล (ใช้ซ้ำทั้ง 3 เมธอด) */
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  return db.users.findUnique({ where: { email }, select: { id: true, role_id: true } });
}

// ------------------------------------------------------------------------------
// GET: รอบที่ลูกค้าคนนี้ลงคิวรอไว้กับบ้านหลังหนึ่ง
// หน้าจองใช้ตัดสินว่าปุ่มไหนควรขึ้นว่า "รออยู่แล้ว" แทน "แจ้งเตือนฉันถ้าว่าง"
// ------------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const propertyId = new URL(req.url).searchParams.get("propertyId");
    if (!propertyId) {
      return NextResponse.json({ error: "กรุณาระบุรหัสอสังหาริมทรัพย์ (propertyId)" }, { status: 400 });
    }

    await purgeExpiredWaitlist(); // เก็บกวาดคิวที่เลยวันไปแล้ว (โปรเจกต์นี้ไม่มี cron)
    const keys = await findCustomerWaitlistForProperty(user.id, propertyId);
    return NextResponse.json({ success: true, waitlistKeys: keys });
  } catch (error) {
    return NextResponse.json({ error: "ดึงคิวรอล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// POST: ลงชื่อรอรอบนี้
// ------------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { propertyId, date, timeSlot } = await req.json();
    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ ต้องมีบ้าน วันที่ และรอบเวลา" }, { status: 400 });
    }

    // ลูกค้าที่ถูกจำกัดการจองจากประวัติเบี้ยวนัด ก็ไม่ควรลงคิวรอได้เช่นกัน
    // (ไม่งั้นพอรอบว่างก็จองไม่ได้อยู่ดี กลายเป็นแจ้งเตือนหลอกให้เสียเวลา)
    if (await isCustomerBlockedByNoShow(user.id)) {
      return NextResponse.json(
        { error: `บัญชีของคุณมีประวัติไม่มาตามนัดครบ ${NO_SHOW_LIMIT} ครั้ง จึงยังลงคิวรอไม่ได้` },
        { status: 403 }
      );
    }

    // เพดานกันลงคิวรัวทุกรอบจนแจ้งเตือนท่วมกระดิ่งตัวเอง
    if ((await countActiveWaitlist(user.id)) >= WAITLIST_MAX_PER_CUSTOMER) {
      return NextResponse.json(
        { error: `ลงคิวรอค้างไว้ได้สูงสุด ${WAITLIST_MAX_PER_CUSTOMER} รอบ กรุณายกเลิกคิวเก่าก่อน` },
        { status: 400 }
      );
    }

    // ถ้ารอบนี้ว่างอยู่แล้วก็ไม่ต้องรอ ให้จองไปเลย
    const slot = await db.property_viewing_slots.findUnique({
      where: {
        property_id_available_date_time_slot: {
          property_id: propertyId,
          available_date: new Date(date),
          time_slot: timeSlot
        }
      },
      select: { is_booked: true }
    });
    if (slot && !slot.is_booked) {
      return NextResponse.json({ error: "รอบนี้ว่างอยู่แล้ว กดจองได้เลยไม่ต้องรอคิว" }, { status: 400 });
    }

    // upsert เพราะ unique constraint กันซ้ำอยู่แล้ว กดซ้ำจึงไม่ควรขึ้น error
    await db.appointment_waitlist.upsert({
      where: {
        customer_id_property_id_available_date_time_slot: {
          customer_id: user.id,
          property_id: propertyId,
          available_date: new Date(date),
          time_slot: timeSlot
        }
      },
      update: {},
      create: {
        customer_id: user.id,
        property_id: propertyId,
        available_date: new Date(date),
        time_slot: timeSlot
      }
    });

    return NextResponse.json({ success: true, message: "ลงคิวรอเรียบร้อย จะแจ้งเตือนทันทีที่รอบนี้ว่าง" });
  } catch (error) {
    return NextResponse.json({ error: "ลงคิวรอล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// DELETE: ยกเลิกคิวรอ
// ------------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

    const { propertyId, date, timeSlot } = await req.json();
    if (!propertyId || !date || !timeSlot) {
      return NextResponse.json({ error: "ข้อมูลไม่ครบ ต้องมีบ้าน วันที่ และรอบเวลา" }, { status: 400 });
    }

    // ผูก customer_id ของคนที่ล็อกอินเสมอ ลบคิวของคนอื่นไม่ได้แม้จะรู้ข้อมูลครบ
    const res = await db.appointment_waitlist.deleteMany({
      where: {
        customer_id: user.id,
        property_id: propertyId,
        available_date: new Date(date),
        time_slot: timeSlot
      }
    });

    return NextResponse.json({ success: true, removed: res.count });
  } catch (error) {
    return NextResponse.json({ error: "ยกเลิกคิวรอล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}
