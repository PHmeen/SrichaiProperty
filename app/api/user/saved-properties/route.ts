import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อระบุตัวผู้ใช้ที่บันทึก/ยกเลิกรายการโปรด
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับจัดการตารางรายการโปรดของผู้ใช้

/**
 * ==============================================================================
 * API Endpoint สำหรับจัดการรายการโปรดของผู้ใช้งาน (Saved Properties API Route)
 * /app/api/user/saved-properties/route.ts
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET: ดึงรายการอสังหาริมทรัพย์ทั้งหมดที่ผู้ใช้กดหัวใจบันทึกเป็นรายการโปรดไว้
 * 2. POST: บันทึกอสังหาริมทรัพย์เข้าตารางรายการโปรด (Upsert)
 * 3. DELETE: ยกเลิกและลบอสังหาริมทรัพย์ออกจากรายการโปรด
 * ==============================================================================
 */

// ฟังก์ชันช่วยดึงและตรวจสอบสิทธิ์ผู้ใช้งานจากตาราง users
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) return { error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 }) };

  const user = await db.users.findUnique({
    where: { email: userEmail },
    select: { id: true }
  });

  if (!user) return { error: NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 }) };
  return { userId: user.id };
}

// ------------------------------------------------------------------------------
// 1. GET: ดึงรายการอสังหาฯ ที่ผู้ใช้กดเซฟเป็นรายการโปรด
// ------------------------------------------------------------------------------
export async function GET() {
  try {
    const { userId, error } = await getAuthUser();
    if (error) return error;

    const saved = await db.saved_properties.findMany({
      where: { user_id: userId },
      include: {
        properties: {
          include: {
            property_types: true,
            property_images: { orderBy: { order_index: "asc" }, take: 1 },
            users: { select: { first_name: true, last_name: true, profile_image: true } }
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    const formatted = saved.map((s) => {
      const p = s.properties;
      const fullName = p?.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน";
      return {
        id: p?.id,
        title: p?.title,
        price: "฿" + Number(p?.price).toLocaleString(),
        type: p?.property_types?.name || "อสังหาริมทรัพย์",
        location: p?.location,
        bedrooms: p?.bedrooms || 0,
        bathrooms: p?.bathrooms || 0,
        area: Number(p?.area_sqm) || 0,
        image: p?.property_images[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600",
        agentName: fullName,
        savedAt: s.created_at
      };
    });

    return NextResponse.json({ success: true, savedProperties: formatted });
  } catch (err) {
    return NextResponse.json({ error: "ดึงรายการโปรดล้มเหลว: " + (err as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// 2. POST: บันทึกอสังหาฯ เข้าตารางรายการโปรด (Upsert)
// ------------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const { userId, error } = await getAuthUser();
    if (error) return error;

    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: "กรุณาระบุ propertyId" }, { status: 400 });
    }

    const saved = await db.saved_properties.upsert({
      where: {
        user_id_property_id: {
          user_id: userId,
          property_id: propertyId
        }
      },
      update: {},
      create: {
        user_id: userId,
        property_id: propertyId
      }
    });

    return NextResponse.json({ success: true, saved: true, data: saved });
  } catch (err) {
    return NextResponse.json({ error: "บันทึกรายการโปรดล้มเหลว: " + (err as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// 3. DELETE: ยกเลิกการบันทึกอสังหาฯ ออกจากตารางรายการโปรด
// ------------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { userId, error } = await getAuthUser();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "กรุณาระบุ propertyId" }, { status: 400 });
    }

    await db.saved_properties.deleteMany({
      where: {
        user_id: userId,
        property_id: propertyId
      }
    });

    return NextResponse.json({ success: true, saved: false });
  } catch (err) {
    return NextResponse.json({ error: "ยกเลิกรายการโปรดล้มเหลว: " + (err as Error).message }, { status: 500 });
  }
}
