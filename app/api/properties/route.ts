import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const properties = await db.properties.findMany({
      where: {
        status: "approved"
      },
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        },
        property_types: true,
        property_images: {
          orderBy: {
            order_index: "asc"
          }
        },
        provinces: true,
        amphures: true,
        districts: true
      },
      orderBy: {
        created_at: "desc"
      }
    });

    // แปลงโครงสร้างให้ตรงกับการใช้งานหน้าบ้าน Next.js (Property Interface)
    const formattedProperties = properties.map((p) => {
      const fullName = p.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน";
      const mainImage = p.property_images[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";
      const isPremium = Number(p.price) > 7000000;
      
      return {
        id: p.id,
        title: p.title,
        price: "฿" + Number(p.price).toLocaleString(),
        type: p.property_types?.name || "อสังหาริมทรัพย์",
        tag: isPremium ? "ทรัพย์แนะนำ" : "ทรัพย์ทั่วไป",
        tagBg: isPremium ? "bg-amber-600" : "bg-blue-600",
        location: "📍 " + p.location,
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        area: Number(p.area_sqm) || 0,
        image: mainImage,
        agentName: fullName,
        agentImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e40af&color=fff`,
        isPremium: isPremium,
        description: p.description || "",
        latitude: p.latitude ? Number(p.latitude) : null,
        longitude: p.longitude ? Number(p.longitude) : null,
        province_id: p.province_id,
        amphure_id: p.amphure_id,
        district_id: p.district_id,
        provinceName: p.provinces?.name_th || "",
        amphureName: p.amphures?.name_th || "",
        districtName: p.districts?.name_th || ""
      };
    });

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
    const { title, price, type, location, description, bedrooms, bathrooms, areaSqm, agentId } = body;

    if (!title || !price || !type || !location || !agentId) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const newProperty = await db.properties.create({
      data: {
        title,
        price: parseFloat(price),
        type_id: type === "house" ? 1 : type === "townhome" ? 2 : 3,
        location,
        description,
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        area_sqm: parseFloat(areaSqm) || null,
        status: "pending", // รอการตรวจอนุมัติเพื่อความปลอดภัยของระบบจริง
        agent_id: agentId
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