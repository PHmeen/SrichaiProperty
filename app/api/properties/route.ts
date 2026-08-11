import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { notifyUser, notifyUsers } from "@/lib/notify";

/**
 * ==============================================================================
 * API Route: /api/properties
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET   - ดึงรายการอสังหาริมทรัพย์ที่อนุมัติแล้วทั้งหมดไปแสดงบนหน้าเว็บฝั่งลูกค้า
 * 2. POST  - ลงประกาศอสังหาริมทรัพย์ใหม่โดยนายหน้า (สถานะเริ่มต้นเป็น 'pending')
 * 3. PATCH - อัปเดตสถานะประกาศ (อนุมัติ 'approved' หรือ ตีกลับ 'rejected') โดยแอดมิน
 * ==============================================================================
 */

// ==============================================================================
// 1. GET: ดึงรายการอสังหาริมทรัพย์ที่ผ่านการอนุมัติแล้ว (approved / active)
// ==============================================================================
export async function GET() {
  try {
    // 1.1 ดึงข้อมูลจากฐานข้อมูล PostgreSQL ผ่าน Prisma ORM
    const properties = await db.properties.findMany({
      where: { 
        status: { in: ["approved", "active"] } // ดึงเฉพาะประกาศที่ผ่านการอนุมัติแล้วเท่านั้น
      },
      include: {
        users: { 
          select: { 
            id: true, 
            first_name: true, 
            last_name: true, 
            email: true, 
            phone: true, 
            line_id: true, 
            plan_type: true 
          } 
        },
        listing_package_orders: { 
          where: { status: "active" } // ดึงข้อมูลแพ็กเกจดันประกาศที่ใช้งานอยู่
        },
        property_types: true, // ชนิดอสังหาฯ (บ้านเดี่ยว, คอนโด, ทาวน์โฮม)
        property_images: { 
          orderBy: { order_index: "asc" } // ดึงรูปภาพเรียงตามลำดับที่ตั้งไว้
        },
        provinces: true, // ข้อมูลจังหวัด
        amphures: true,  // ข้อมูลอำเภอ
        districts: true  // ข้อมูลตำบล
      },
      orderBy: { 
        created_at: "desc" // ประกาศใหม่ล่าสุดขึ้นก่อน
      }
    });

    // 1.2 แปลงโครงสร้างข้อมูลจาก DB รูปแบบ Snake Case ให้เป็น camelCase เพื่อให้หน้าบ้าน (React Component) ใช้งานสะดวก
    const formattedProperties = properties
      .map((p) => {
        const agentName = p.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน";
        
        // เช็คว่าอสังหาฯ นี้เป็น "ทรัพย์พรีเมียม" หรือไม่ (นายหน้าซื้อแพ็กเกจดันประกาศ หรือ เป็นสมาชิกระดับ Pro/Premium)
        const isPremium = Boolean(
          p.listing_package_orders?.length || (p.users?.plan_type && p.users.plan_type !== "basic")
        );
        
        const mainImage = p.property_images[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80";

        return {
          id: p.id,
          title: p.title,
          price: "฿" + Number(p.price).toLocaleString(), // จัดฟอร์แมตตัวเลขราคา (เช่น ฿2,500,000)
          listingType: p.listing_type === "rent" ? "rent" : "sale",
          type: p.property_types?.name || "อสังหาริมทรัพย์",
          tag: isPremium ? "ทรัพย์พรีเมียม" : "ทรัพย์ทั่วไป",
          tagBg: isPremium ? "bg-amber-600" : "bg-blue-600",
          location: "📍 " + p.location,
          bedrooms: p.bedrooms || 0,
          bathrooms: p.bathrooms || 0,
          area: Number(p.area_sqm) || 0,
          image: mainImage,
          images: p.property_images.map((img) => img.image_url),
          agentName,
          agentImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(agentName)}&background=1e40af&color=fff`,
          isPremium,
          description: p.description || "",
          latitude: p.latitude ? Number(p.latitude) : null,
          longitude: p.longitude ? Number(p.longitude) : null,
          province_id: p.province_id,
          amphure_id: p.amphure_id,
          district_id: p.district_id,
          agent_id: p.agent_id,
          agentPhone: p.users?.phone || "081-234-5678",
          lineId: p.users?.line_id || null,
          provinceName: p.provinces?.name_th || "",
          amphureName: p.amphures?.name_th || "",
          districtName: p.districts?.name_th || ""
        };
      })
      // 1.3 เรียงลำดับทรัพย์พรีเมียมขึ้นก่อนทรัพย์ทั่วไป (Priority Sorting)
      .sort((a, b) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0));

    return NextResponse.json(formattedProperties);
  } catch (error) {
    return NextResponse.json(
      { error: "ไม่สามารถดึงข้อมูลอสังหาริมทรัพย์ได้: " + (error as Error).message }, 
      { status: 500 }
    );
  }
}

// ==============================================================================
// 2. POST: สร้างประกาศอสังหาริมทรัพย์ใหม่ (เฉพาะบัญชีประเภทนายหน้า / agent)
// ==============================================================================
export async function POST(request: Request) {
  try {
    // 2.1 ตรวจสอบการเข้าสู่ระบบผ่าน NextAuth Session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนลงประกาศ" }, { status: 401 });
    }

    // 2.2 ค้นหาข้อมูลผู้ใช้ใน DB และตรวจสอบบทบาทว่าต้องเป็น 'agent' เท่านั้น
    const agent = await db.users.findUnique({ where: { email: session.user.email } });
    if (!agent || agent.role_id !== "agent") {
      return NextResponse.json({ error: "อนุญาตให้ลงประกาศได้เฉพาะบัญชีนายหน้าเท่านั้น" }, { status: 403 });
    }

    // 2.3 อ่านข้อมูลที่ส่งมาจาก Request Body
    const body = await request.json();
    const {
      title, price, listing_type, listingType, type_id, type, location, description,
      bedrooms, bathrooms, area_sqm, areaSqm,
      province_id, amphure_id, district_id, latitude, longitude, images, doc, viewingSlots
    } = body;

    // 2.4 ตรวจสอบความถูกต้องของข้อมูล (Data Validation)
    if (!title || !price || (!type_id && !type) || !location) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน" }, { status: 400 });
    }

    if (Number(price) <= 0) {
      return NextResponse.json({ error: "ราคาต้องเป็นตัวเลขมากกว่า 0" }, { status: 400 });
    }

    const rawArea = area_sqm ?? areaSqm;
    if (rawArea !== undefined && rawArea !== null && rawArea !== "" && Number(rawArea) < 0) {
      return NextResponse.json({ error: "พื้นที่ต้องไม่ติดลบ" }, { status: 400 });
    }

    if ((bedrooms !== undefined && Number(bedrooms) < 0) || (bathrooms !== undefined && Number(bathrooms) < 0)) {
      return NextResponse.json({ error: "จำนวนห้องต้องไม่ติดลบ" }, { status: 400 });
    }

    // 2.5 จัดการประเภทการลงประกาศและประเภทบ้าน
    const resolvedListingType = (listing_type ?? listingType) === "rent" ? "rent" : "sale";
    const resolvedTypeId = type_id ? parseInt(type_id) : (type === "house" ? 1 : type === "townhome" ? 2 : 3);

    // 2.6 สร้างข้อมูลประกาศลงในตาราง properties (สถานะเริ่มต้นเป็น 'pending' เพื่อรอแอดมินอนุมัติ)
    const newProperty = await db.properties.create({
      data: {
        title,
        price: parseFloat(price),
        listing_type: resolvedListingType,
        type_id: resolvedTypeId,
        location,
        description: description || "",
        bedrooms: parseInt(bedrooms) || 1,
        bathrooms: parseInt(bathrooms) || 1,
        area_sqm: parseFloat(rawArea || 100),
        status: "pending", // ส่งเข้าคิว Moderation Queue รอแอดมินอนุมัติ
        agent_id: agent.id, // ผูกกับ ID ของนายหน้าที่ล็อกอินอยู่
        province_id: province_id ? parseInt(province_id) : 70,
        amphure_id: amphure_id ? parseInt(amphure_id) : 9011,
        district_id: district_id ? parseInt(district_id) : 901101,
        latitude: latitude ? parseFloat(latitude) : 7.0089,
        longitude: longitude ? parseFloat(longitude) : 100.4812
      }
    });

    // 2.7 บันทึกรูปภาพประกอบประกาศลงในตาราง property_images
    if (Array.isArray(images) && images.length > 0) {
      await db.property_images.createMany({
        data: images.map((imgUrl: string, index: number) => ({
          property_id: newProperty.id,
          image_url: imgUrl,
          order_index: index
        }))
      });
    }

    // 2.8 บันทึกเอกสารสิทธิ์เข้าตาราง property_documents ถ้ามีการแนบมา (เช่น โฉนดที่ดิน, สัญญา)
    if (doc) {
      await db.property_documents.create({
        data: {
          property_id: newProperty.id,
          doc_url: doc,
          doc_type: String(doc).toLowerCase().endsWith(".pdf") ? "pdf" : "image"
        }
      });
    }

    // 2.9 บันทึกรอบเวลานัดหมายเข้าชมที่นายหน้าเปิดให้จอง ลงในตาราง property_viewing_slots
    if (Array.isArray(viewingSlots) && viewingSlots.length > 0) {
      await db.property_viewing_slots.createMany({
        data: viewingSlots.map((slot: { date: string; timeSlot: string }) => ({
          property_id: newProperty.id,
          available_date: new Date(slot.date),
          time_slot: slot.timeSlot,
          is_booked: false
        })),
        skipDuplicates: true
      });
    }

    // 2.10 ส่งการแจ้งเตือน (Notifications) ไปยังแอดมินทุกคนเพื่อแจ้งให้ทราบว่ามีประกาศใหม่รออนุมัติ
    const admins = await db.users.findMany({ where: { role_id: "admin" }, select: { id: true } });
    if (admins.length > 0) {
      await notifyUsers(admins.map((admin) => admin.id), {
        title: "รายการประกาศใหม่รอการตรวจสอบ",
        content: `ประกาศอสังหาริมทรัพย์ "${title}" ยื่นเรื่องเข้าสู่ระบบ อยู่ระหว่างรอการตรวจสอบอนุมัติ`,
        type: "property_pending",
        linkUrl: "/admin/dashboard"
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: newProperty });
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลงประกาศ: " + (error as Error).message }, 
      { status: 500 }
    );
  }
}

// ==============================================================================
// 3. PATCH: อัปเดตสถานะประกาศอนุมัติ / ตีกลับ (เฉพาะบัญชีผู้ดูแลระบบ / admin)
// ==============================================================================
export async function PATCH(request: Request) {
  try {
    // 3.1 ตรวจสอบสิทธิ์การเข้าถึง ต้องเป็นแอดมินเท่านั้น
    const session = await getServerSession(authOptions);
    if (!session || (session.user as { role?: string })?.role !== "admin") {
      return NextResponse.json({ error: "อนุญาตเฉพาะผู้ดูแลระบบเท่านั้น" }, { status: 401 });
    }

    // 3.2 อ่านค่ารหัสอสังหาฯ และสถานะใหม่ที่ส่งมา
    const { id, status, reason } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: "กรุณาระบุรหัสอสังหาฯ และสถานะที่ต้องการเปลี่ยน" }, { status: 400 });
    }

    const isApproved = status === "approved";
    const isRejected = status === "rejected";

    // 3.3 อัปเดตสถานะในตาราง properties
    const updatedProperty = await db.properties.update({
      where: { id },
      data: {
        status,
        reject_reason: isRejected ? (reason || null) : isApproved ? null : undefined
      }
    });

    // 3.4 ส่งการแจ้งเตือนไปยังนายหน้าเจ้าของประกาศเพื่อแจ้งผลการตรวจสอบ
    if (updatedProperty.agent_id) {
      const reasonText = isRejected && reason ? ` (เหตุผล: ${reason})` : "";
      await notifyUser({
        userId: updatedProperty.agent_id,
        title: isApproved ? "ประกาศอสังหาริมทรัพย์ได้รับการอนุมัติ" : "แจ้งผลการตรวจสอบประกาศอสังหาริมทรัพย์",
        content: isApproved
          ? `รายการ "${updatedProperty.title}" ผ่านการตรวจสอบเรียบร้อยแล้ว และเปิดแสดงผลบนระบบศรีชัย พร็อพเพอร์ตี้`
          : `รายการ "${updatedProperty.title}" จำเป็นต้องได้รับการปรับปรุงข้อมูลเพิ่มเติม${reasonText}`,
        type: "property",
        linkUrl: isApproved ? `/property/${updatedProperty.id}` : `/agent/properties`
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: updatedProperty });
  } catch (error) {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะประกาศได้: " + (error as Error).message }, 
      { status: 500 }
    );
  }
}