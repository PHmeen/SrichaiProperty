import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

interface SessionUser {
  user?: {
    id?: string;
    email?: string;
  };
}

// GET: ดึงรายการอสังหาฯ ที่ผู้ใช้กดเซฟเป็นรายการโปรด
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const saved = await db.saved_properties.findMany({
      where: { user_id: user.id },
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
        image: p?.property_images[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        agentName: fullName,
        savedAt: s.created_at
      };
    });

    return NextResponse.json({ success: true, savedProperties: formatted });
  } catch (error) {
    const err = error as Error;
    console.error("GET Saved Properties Error:", err);
    return NextResponse.json({ error: "ดึงรายการโปรดล้มเหลว: " + err.message }, { status: 500 });
  }
}

// POST: บันทึกอสังหาฯ เข้าตารางรายการโปรด
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: "กรุณาระบุ propertyId" }, { status: 400 });
    }

    const saved = await db.saved_properties.upsert({
      where: {
        user_id_property_id: {
          user_id: user.id,
          property_id: propertyId
        }
      },
      update: {},
      create: {
        user_id: user.id,
        property_id: propertyId
      }
    });

    return NextResponse.json({ success: true, saved: true, data: saved });
  } catch (error) {
    const err = error as Error;
    console.error("POST Saved Property Error:", err);
    return NextResponse.json({ error: "บันทึกรายการโปรดล้มเหลว: " + err.message }, { status: 500 });
  }
}

// DELETE: ยกเลิกการเซฟรายการโปรด
export async function DELETE(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");

    if (!propertyId) {
      return NextResponse.json({ error: "กรุณาระบุ propertyId" }, { status: 400 });
    }

    await db.saved_properties.deleteMany({
      where: {
        user_id: user.id,
        property_id: propertyId
      }
    });

    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    const err = error as Error;
    console.error("DELETE Saved Property Error:", err);
    return NextResponse.json({ error: "ยกเลิกรายการโปรดล้มเหลว: " + err.message }, { status: 500 });
  }
}
