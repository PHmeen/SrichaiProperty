// === API จัดการอสังหาริมทรัพย์ "รายหลัง" (สำหรับหน้าแก้ไขประกาศของนายหน้า) ===
// GET    /api/properties/[id]  -> ดึงข้อมูลบ้าน 1 หลัง พร้อมรูปภาพและวันว่างทั้งหมด
// PATCH  /api/properties/[id]  -> แก้ไขรายละเอียดบ้าน + รูปภาพ + วันว่าง (ไม่รีเซ็ตสถานะอนุมัติ)
// DELETE /api/properties/[id]  -> ลบประกาศบ้านหลังนี้
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

interface SlotRow {
  id: string;
  available_date: Date;
  time_slot: string;
  is_booked: boolean | null;
}

interface ImageRow {
  image_url: string;
}

interface IncomingSlot {
  date: string;
  timeSlot: string;
}

// แปลง Date -> "YYYY-MM-DD"
function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ตรวจสอบสิทธิ์: ต้องเป็นนายหน้า และต้องเป็นเจ้าของบ้านหลังนี้จริงเท่านั้น
// ถ้าผ่าน -> คืน { error: null } / ถ้าไม่ผ่าน -> คืน { error: NextResponse ที่พร้อมส่งกลับ }
async function requireOwnerAgent(propertyId: string): Promise<{ error: NextResponse | null }> {
  const session = (await getServerSession(authOptions)) as AgentSession | null;

  if (!session?.user?.id || session.user.role !== "agent") {
    return { error: NextResponse.json({ error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" }, { status: 401 }) };
  }

  const property = await db.properties.findUnique({ where: { id: propertyId } });

  if (!property) {
    return { error: NextResponse.json({ error: "ไม่พบประกาศอสังหาริมทรัพย์หลังนี้" }, { status: 404 }) };
  }

  if (property.agent_id !== session.user.id) {
    return { error: NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขประกาศหลังนี้" }, { status: 403 }) };
  }

  return { error: null };
}

// ---------------------------------------------------------------------------
// GET: ดึงข้อมูลบ้าน 1 หลัง พร้อมรูปภาพและวันว่าง (เฉพาะนายหน้าเจ้าของ)
// ---------------------------------------------------------------------------
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const guard = await requireOwnerAgent(id);
    if (guard.error) return guard.error;

    const property = await db.properties.findUnique({
      where: { id },
      include: {
        users: { select: { first_name: true, last_name: true, phone: true, line_id: true } },
        property_images: { orderBy: { order_index: "asc" } },
        property_viewing_slots: { orderBy: [{ available_date: "asc" }, { time_slot: "asc" }] }
      }
    });

    if (!property) {
      return NextResponse.json({ error: "ไม่พบประกาศอสังหาริมทรัพย์หลังนี้" }, { status: 404 });
    }

    const formatted = {
      id: property.id,
      title: property.title,
      type_id: property.type_id,
      listing_type: property.listing_type === "rent" ? "rent" : "sale",
      price: Number(property.price),
      description: property.description || "",
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      area_sqm: property.area_sqm ? Number(property.area_sqm) : 0,
      location: property.location,
      province_id: property.province_id,
      amphure_id: property.amphure_id,
      district_id: property.district_id,
      status: property.status,
      agentName: property.users ? `${property.users.first_name} ${property.users.last_name}` : "ไม่ระบุตัวแทน",
      agentPhone: property.users?.phone || "081-234-5678",
      lineId: property.users?.line_id || null,
      images: property.property_images.map((img: ImageRow) => img.image_url)
    };

    const slots = property.property_viewing_slots.map((s: SlotRow) => ({
      id: s.id,
      date: toDateKey(s.available_date),
      timeSlot: s.time_slot,
      isBooked: Boolean(s.is_booked)
    }));

    return NextResponse.json({ success: true, property: formatted, slots });
  } catch (error) {
    const err = error as Error;
    console.error("Get Property By Id Error:", err);
    return NextResponse.json(
      { error: "ดึงข้อมูลประกาศล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH: แก้ไขรายละเอียดบ้าน + รูปภาพ + วันว่าง
// หมายเหตุ: ไม่แตะฟิลด์ status เพื่อไม่ให้ต้องรอแอดมินอนุมัติซ้ำ
// ---------------------------------------------------------------------------
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const guard = await requireOwnerAgent(id);
    if (guard.error) return guard.error;

    const body = await req.json();
    const {
      title, type_id, price, description, listing_type, listingType,
      bedrooms, bathrooms, area_sqm,
      location, province_id, amphure_id, district_id,
      images, viewingSlots, status: newStatus
    } = body;

    const resolvedListingType = listing_type ?? listingType;

    if (!title || !price || !location) {
      return NextResponse.json(
        { error: "กรุณากรอกหัวข้อประกาศ ราคา และที่อยู่ให้ครบถ้วน" },
        { status: 400 }
      );
    }

    if (!(Number(price) > 0)) {
      return NextResponse.json(
        { error: "ราคาต้องเป็นตัวเลขมากกว่า 0" },
        { status: 400 }
      );
    }

    if (area_sqm !== undefined && area_sqm !== null && area_sqm !== "" && Number(area_sqm) < 0) {
      return NextResponse.json(
        { error: "พื้นที่ต้องไม่ติดลบ" },
        { status: 400 }
      );
    }

    if ((bedrooms !== undefined && bedrooms !== null && bedrooms !== "" && Number(bedrooms) < 0) ||
        (bathrooms !== undefined && bathrooms !== null && bathrooms !== "" && Number(bathrooms) < 0)) {
      return NextResponse.json(
        { error: "จำนวนห้องต้องไม่ติดลบ" },
        { status: 400 }
      );
    }

    // 1) อัปเดตรายละเอียดหลักของบ้าน
    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title;
    if (type_id) updateData.type_id = parseInt(String(type_id));
    if (resolvedListingType) updateData.listing_type = resolvedListingType === "rent" ? "rent" : "sale";
    if (price) updateData.price = parseFloat(String(price));
    if (description !== undefined) updateData.description = description;
    if (bedrooms !== undefined && bedrooms !== null && bedrooms !== "") updateData.bedrooms = parseInt(String(bedrooms));
    if (bathrooms !== undefined && bathrooms !== null && bathrooms !== "") updateData.bathrooms = parseInt(String(bathrooms));
    if (area_sqm !== undefined && area_sqm !== null && area_sqm !== "") updateData.area_sqm = parseFloat(String(area_sqm));
    if (location) updateData.location = location;
    if (province_id) updateData.province_id = parseInt(String(province_id));
    if (amphure_id) updateData.amphure_id = parseInt(String(amphure_id));
    if (district_id) updateData.district_id = parseInt(String(district_id));
    if (newStatus) updateData.status = newStatus;

    const updated = await db.properties.update({
      where: { id },
      data: updateData
    });

    // 2) อัปเดตรูปภาพ (ลบของเดิมทั้งหมดแล้วบันทึกชุดใหม่ตามลำดับที่ส่งมา)
    if (Array.isArray(images)) {
      await db.property_images.deleteMany({ where: { property_id: id } });
      if (images.length > 0) {
        await db.property_images.createMany({
          data: images.map((url: string, index: number) => ({
            property_id: id,
            image_url: url,
            order_index: index
          }))
        });
      }
    }

    // 3) อัปเดตวันว่าง (เพิ่มอันใหม่ / ลบอันที่เอาออก แต่จะไม่ลบรอบที่ลูกค้าจองไปแล้ว)
    if (Array.isArray(viewingSlots)) {
      const existing = (await db.property_viewing_slots.findMany({
        where: { property_id: id }
      })) as SlotRow[];

      const incomingKeys = new Set(
        viewingSlots.map((s: IncomingSlot) => `${s.date}|${s.timeSlot}`)
      );
      const existingKeys = new Set(
        existing.map((s: SlotRow) => `${toDateKey(s.available_date)}|${s.time_slot}`)
      );

      // 3.1 ลบรอบที่นายหน้าเอาออก (เฉพาะรอบที่ยังไม่มีคนจอง)
      const toDelete = existing.filter(
        (s: SlotRow) =>
          !s.is_booked && !incomingKeys.has(`${toDateKey(s.available_date)}|${s.time_slot}`)
      );
      if (toDelete.length > 0) {
        await db.property_viewing_slots.deleteMany({
          where: { id: { in: toDelete.map((s: SlotRow) => s.id) } }
        });
      }

      // 3.2 เพิ่มรอบใหม่ที่ยังไม่เคยมีในระบบ
      const toCreate = viewingSlots.filter(
        (s: IncomingSlot) => !existingKeys.has(`${s.date}|${s.timeSlot}`)
      );
      if (toCreate.length > 0) {
        await db.property_viewing_slots.createMany({
          data: toCreate.map((s: IncomingSlot) => ({
            property_id: id,
            available_date: new Date(s.date),
            time_slot: s.timeSlot,
            is_booked: false
          })),
          skipDuplicates: true
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const err = error as Error;
    console.error("Update Property Error:", err);
    return NextResponse.json(
      { error: "บันทึกการแก้ไขประกาศล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE: ลบประกาศบ้านหลังนี้ (ใช้กับปุ่มลบในหน้าจัดการบ้านของฉัน)
// ---------------------------------------------------------------------------
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const guard = await requireOwnerAgent(id);
    if (guard.error) return guard.error;

    await db.properties.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("Delete Property Error:", err);
    return NextResponse.json(
      { error: "ลบประกาศล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}