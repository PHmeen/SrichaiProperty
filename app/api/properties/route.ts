import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const properties = await db.property.findMany({
      where: {
        status: "approved"
      },
      include: {
        agent: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // แปลงโครงสร้างให้ตรงกับการใช้งานหน้าบ้าน Next.js (Property Interface)
    const formattedProperties = properties.map((p) => ({
      id: p.id,
      title: p.title,
      price: "฿" + p.price.toLocaleString(),
      type: p.type === "house" ? "บ้านเดี่ยว" : p.type === "townhome" ? "ทาวน์โฮม" : "คอนโดมิเนียม",
      tag: p.isPremium ? "ทรัพย์แนะนำ" : "ทรัพย์ทั่วไป",
      tagBg: p.isPremium ? "bg-blue-600" : "bg-slate-500",
      location: "📍 " + p.location,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.areaSqm || 0,
      image: p.images[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      agentName: p.agent.fullName,
      agentImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.agent.fullName)}&background=1e40af&color=fff`,
      isPremium: p.isPremium
    }));

    return NextResponse.json(formattedProperties);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลอสังหาริมทรัพย์ได้: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, price, type, location, description, bedrooms, bathrooms, areaSqm, images, agentId, isPremium } = body;

    if (!title || !price || !type || !location || !agentId) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const newProperty = await db.property.create({
      data: {
        title,
        price: parseFloat(price),
        type,
        location,
        description,
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        areaSqm: parseFloat(areaSqm) || null,
        images: images || [],
        isPremium: !!isPremium,
        status: "pending", // รอการตรวจอนุมัติเพื่อความปลอดภัยของระบบจริง
        agentId
      }
    });

    return NextResponse.json({ success: true, data: newProperty });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงประกาศขายบ้าน: " + err.message },
      { status: 500 }
    );
  }
}