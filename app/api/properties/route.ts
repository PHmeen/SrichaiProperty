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
            email: true,
            plan_type: true,
            plan_expired_at: true
          }
        },
        listing_package_orders: {
          where: {
            status: "active"
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
      
      // อสังหาริมทรัพย์พรีเมียมเฉพาะนายหน้าที่ซื้อแพ็กเกจดันประกาศ (active) หรือเป็นสมาชิกแผน Premium/Pro
      const hasActivePackage = p.listing_package_orders && p.listing_package_orders.length > 0;
      const hasActivePlan = p.users?.plan_type && p.users.plan_type !== "basic";
      const isPremium = Boolean(hasActivePackage || hasActivePlan);

      return {
        id: p.id,
        title: p.title,
        price: "฿" + Number(p.price).toLocaleString(),
        type: p.property_types?.name || "อสังหาริมทรัพย์",
        tag: isPremium ? "ทรัพย์แนะนำ (พรีเมียม)" : "ทรัพย์ทั่วไป",
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
    const {
      title, price, type_id, type, location, description,
      bedrooms, bathrooms, area_sqm, areaSqm, agentId,
      province_id, amphure_id, district_id, latitude, longitude, images
    } = body;

    if (!title || !price || (!type_id && !type) || !location) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // หา agent_id จาก body หรือดึงนายหน้าคนแรกใน DB มาผูกมัด
    let validAgentId = agentId;
    if (!validAgentId) {
      const firstAgent = await db.users.findFirst({ where: { role_id: "agent" } });
      validAgentId = firstAgent?.id || "admin";
    }

    const resolvedTypeId = type_id ? parseInt(type_id) : (type === "house" ? 1 : type === "townhome" ? 2 : 3);
    const resolvedArea = parseFloat(area_sqm || areaSqm || 100);

    // 1. สร้างรายการในตาราง properties
    const newProperty = await db.properties.create({
      data: {
        title,
        price: parseFloat(price),
        type_id: resolvedTypeId,
        location,
        description: description || "",
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        area_sqm: resolvedArea,
        status: "pending", // รอแอดมินอนุมัติใน Admin Moderation Queue
        agent_id: validAgentId,
        province_id: province_id ? parseInt(province_id) : 70,
        amphure_id: amphure_id ? parseInt(amphure_id) : 9011,
        district_id: district_id ? parseInt(district_id) : 901101,
        latitude: latitude ? parseFloat(latitude) : 7.0089,
        longitude: longitude ? parseFloat(longitude) : 100.4812
      }
    });

    // 2. บันทึกรูปภาพเข้าตาราง property_images ถ้ามีการส่งรูปภาพมา
    if (Array.isArray(images) && images.length > 0) {
      await db.property_images.createMany({
        data: images.map((imgUrl: string, index: number) => ({
          property_id: newProperty.id,
          image_url: imgUrl,
          order_index: index
        }))
      });
    }

    return NextResponse.json({ success: true, data: newProperty });
  } catch (error) {
    const err = error as Error;
    console.error("Error creating property:", err);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงประกาศขายบ้าน: " + err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอสังหาฯ และสถานะที่ต้องการเปลี่ยน" },
        { status: 400 }
      );
    }

    const updatedProperty = await db.properties.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updatedProperty });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะประกาศได้: " + err.message },
      { status: 500 }
    );
  }
}