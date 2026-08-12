import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { hasAgentSlotConflict } from "@/lib/services/viewingSlotService";

/**
 * ==============================================================================
 * API Route: /api/properties/[id] (จัดการอสังหาริมทรัพย์รายหลัง)
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET    - ดึงข้อมูลบ้าน 1 หลัง พร้อมรูปภาพและรอบเวลานัดหมาย (สำหรับโหลดใส่ฟอร์มหน้าแก้ไข)
 * 2. PATCH  - อัปเดตรายละเอียดบ้าน รูปภาพชุดใหม่ และเพิ่ม/ลบรอบเวลานัดหมายเข้าชม
 * 3. DELETE - ลบประกาศอสังหาริมทรัพย์หลังนี้ออกจากระบบ
 * *หมายเหตุ: ทุกวิธี (GET, PATCH, DELETE) ต้องผ่านการยืนยันสิทธิ์ว่าเป็นนายหน้าเจ้าของบ้านจริงเท่านั้น
 * ==============================================================================
 */

// Helper 1: ฟังก์ชันแปลงวัตถุ Date ให้เป็นข้อความวันที่รูปแบบ "YYYY-MM-DD"
const toDateKey = (d: Date) => d.toISOString().split("T")[0];

// Helper 2: ฟังก์ชันตรวจสอบสิทธิ์นายหน้าและยืนยันว่าเป็นเจ้าของประกาศหลังนี้จริง
async function requireOwnerAgent(propertyId: string) {
  // 1. ตรวจสอบการเข้าสู่ระบบและสิทธิ์การใช้งาน (ต้องเป็นบทบาท 'agent')
  const session = await getServerSession(authOptions) as { user?: { id?: string; role?: string } } | null;
  if (!session?.user?.id || session.user.role !== "agent") {
    return { error: NextResponse.json({ error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น" }, { status: 401 }) };
  }

  // 2. ตรวจสอบว่ามีประกาศรหัสนี้ในฐานข้อมูลหรือไม่
  const property = await db.properties.findUnique({ where: { id: propertyId } });
  if (!property) {
    return { error: NextResponse.json({ error: "ไม่พบประกาศอสังหาริมทรัพย์หลังนี้" }, { status: 404 }) };
  }

  // 3. ตรวจสอบความเป็นเจ้าของ: รหัสนายหน้าในประกาศ (agent_id) ต้องตรงกับผู้ใช้งานปัจจุบัน (session.user.id)
  if (property.agent_id !== session.user.id) {
    return { error: NextResponse.json({ error: "คุณไม่มีสิทธิ์แก้ไขประกาศหลังนี้" }, { status: 403 }) };
  }

  return { property, error: null };
}

// ==============================================================================
// 1. GET: ดึงข้อมูลบ้าน 1 หลัง พร้อมรูปภาพและรอบเวลานัดหมาย (สำหรับหน้าแก้ไขนายหน้า)
// ==============================================================================
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // ตรวจสอบสิทธิ์ความเป็นเจ้าของก่อนดึงข้อมูล
    const { property, error } = await requireOwnerAgent(id);
    if (error) return error;

    // ดึงข้อมูลเชิงลึกเพิ่มเติม รวมตารางรูปภาพ (property_images) และรอบเวลานัดหมาย (property_viewing_slots)
    const fullProp = await db.properties.findUnique({
      where: { id },
      include: {
        users: { select: { first_name: true, last_name: true, phone: true, line_id: true } },
        property_images: { orderBy: { order_index: "asc" } },
        property_viewing_slots: { orderBy: [{ available_date: "asc" }, { time_slot: "asc" }] }
      }
    });

    if (!fullProp) {
      return NextResponse.json({ error: "ไม่พบประกาศอสังหาริมทรัพย์หลังนี้" }, { status: 404 });
    }

    // จัดฟอร์แมตข้อมูลส่งกลับไปให้ฟอร์มหน้าบ้านใช้งาน
    const formatted = {
      id: fullProp.id,
      title: fullProp.title,
      type_id: fullProp.type_id,
      listing_type: fullProp.listing_type === "rent" ? "rent" : "sale",
      price: Number(fullProp.price),
      description: fullProp.description || "",
      bedrooms: fullProp.bedrooms || 0,
      bathrooms: fullProp.bathrooms || 0,
      area_sqm: fullProp.area_sqm ? Number(fullProp.area_sqm) : 0,
      location: fullProp.location,
      province_id: fullProp.province_id,
      amphure_id: fullProp.amphure_id,
      district_id: fullProp.district_id,
      status: fullProp.status,
      rejectReason: fullProp.reject_reason || null,
      agentName: fullProp.users ? `${fullProp.users.first_name} ${fullProp.users.last_name}` : "ไม่ระบุตัวแทน",
      agentPhone: fullProp.users?.phone || "081-234-5678",
      lineId: fullProp.users?.line_id || null,
      images: fullProp.property_images.map((img) => img.image_url)
    };

    // จัดฟอร์แมตรายการรอบเวลานัดหมาย
    const slots = fullProp.property_viewing_slots.map((s) => ({
      id: s.id,
      date: toDateKey(s.available_date),
      timeSlot: s.time_slot,
      isBooked: Boolean(s.is_booked)
    }));

    return NextResponse.json({ success: true, property: formatted, slots });
  } catch (error) {
    return NextResponse.json({ error: "ดึงข้อมูลประกาศล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ==============================================================================
// 2. PATCH: บันทึกการแก้ไขข้อมูลบ้าน, รูปภาพ และรอบเวลานัดหมาย
// ==============================================================================
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // ตรวจสอบสิทธิ์ความเป็นเจ้าของก่อนอนุญาตให้แก้ไข
    const { property, error } = await requireOwnerAgent(id);
    if (error || !property) return error;

    const body = await req.json();
    const {
      title, type_id, price, description, listing_type, listingType,
      bedrooms, bathrooms, area_sqm, location,
      province_id, amphure_id, district_id, images, viewingSlots, status: newStatus
    } = body;

    // ตรวจสอบความถูกต้องของข้อมูล (Validation)
    if (!title || !price || !location) {
      return NextResponse.json({ error: "กรุณากรอกหัวข้อประกาศ ราคา และที่อยู่ให้ครบถ้วน" }, { status: 400 });
    }

    if (Number(price) <= 0) {
      return NextResponse.json({ error: "ราคาต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
    }

    if (area_sqm !== undefined && area_sqm !== null && area_sqm !== "" && Number(area_sqm) < 0) {
      return NextResponse.json({ error: "พื้นที่ต้องไม่ติดลบ" }, { status: 400 });
    }

    if ((bedrooms !== undefined && Number(bedrooms) < 0) || (bathrooms !== undefined && Number(bathrooms) < 0)) {
      return NextResponse.json({ error: "จำนวนห้องต้องไม่ติดลบ" }, { status: 400 });
    }

    const resolvedListingType = listing_type ?? listingType;

    // 2.1 เตรียมข้อมูลที่จะอัปเดตลงในตาราง properties
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

    // กฎพิเศษ: กรณีประกาศเคยถูกตีกลับ (rejected) เมื่อนายหน้าแก้ไขและกดบันทึก ให้เปลี่ยนเป็น 'pending' เพื่อส่งกลับเข้าคิวอนุมัติใหม่อัตโนมัติ
    if (property.status === "rejected") {
      updateData.status = "pending";
      updateData.reject_reason = null; // ล้างเหตุผลการตีกลับเดิมออก
    }

    const updated = await db.properties.update({
      where: { id },
      data: updateData
    });

    // 2.2 อัปเดตรูปภาพ: ลบรูปเดิมทั้งหมดของประกาศนี้ออก แล้วบันทึกชุดรูปภาพใหม่ตามลำดับ
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

    // 2.3 อัปเดตรอบเวลานัดหมาย (Syncing Viewing Slots)
    if (Array.isArray(viewingSlots)) {
      const existing = await db.property_viewing_slots.findMany({ where: { property_id: id } });
      const incomingKeys = new Set(viewingSlots.map((s: { date: string; timeSlot: string }) => `${s.date}|${s.timeSlot}`));
      const existingKeys = new Set(existing.map((s) => `${toDateKey(s.available_date)}|${s.time_slot}`));

      // ลบรอบที่นายหน้าเอาออก (เฉพาะรอบที่ยังไม่มีลูกค้าจองเท่านั้น เพื่อไม่ให้กระทบคิวนัดหมายของลูกค้า)
      const toDelete = existing.filter((s) => !s.is_booked && !incomingKeys.has(`${toDateKey(s.available_date)}|${s.time_slot}`));
      if (toDelete.length > 0) {
        await db.property_viewing_slots.deleteMany({
          where: { id: { in: toDelete.map((s) => s.id) } }
        });
      }

      // เพิ่มรอบใหม่ที่เพิ่งถูกเลือกเข้ามา
      const toCreate = viewingSlots.filter((s: { date: string; timeSlot: string }) => !existingKeys.has(`${s.date}|${s.timeSlot}`));
      if (toCreate.length > 0) {
        // กันไม่ให้เปิดวันว่างซ้อนกับ "บ้านหลังอื่น" ของนายหน้าคนเดียวกัน — รอบที่ชนจะถูกกรองทิ้งเงียบๆ
        const checkedToCreate = await Promise.all(
          toCreate.map(async (s: { date: string; timeSlot: string }) => ({
            slot: s,
            conflict: await hasAgentSlotConflict(property.agent_id!, id, new Date(s.date), s.timeSlot)
          }))
        );
        const nonConflicting = checkedToCreate.filter((c) => !c.conflict).map((c) => c.slot);

        if (nonConflicting.length > 0) {
          await db.property_viewing_slots.createMany({
            data: nonConflicting.map((s) => ({
              property_id: id,
              available_date: new Date(s.date),
              time_slot: s.timeSlot,
              is_booked: false
            })),
            skipDuplicates: true
          });
        }
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ error: "บันทึกการแก้ไขประกาศล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ==============================================================================
// 3. DELETE: ลบประกาศอสังหาริมทรัพย์ออกจากระบบ
// ==============================================================================
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // ตรวจสอบสิทธิ์ความเป็นเจ้าของก่อนอนุญาตให้ลบ
    const { error } = await requireOwnerAgent(id);
    if (error) return error;

    await db.properties.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "ลบประกาศล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}