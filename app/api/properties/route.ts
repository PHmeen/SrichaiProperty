import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const properties = await db.properties.findMany({
      where: {
        status: { in: ["approved", "active"] }
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
        agentName: fullName,
        agentImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1e40af&color=fff`,
        isPremium: isPremium,
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
    });

    // เรียงลำดับให้ทรัพย์ของนายหน้าพรีเมียมขึ้นก่อนเสมอ (Priority Top Listing)
    formattedProperties.sort((a, b) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0));

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
    // === ตรวจสอบว่าใครเป็นคนลงประกาศ (ต้องเป็นนายหน้าที่ล็อกอินอยู่จริงเท่านั้น) ===
    // หมายเหตุ: เดิมโค้ดตรงนี้ไปดึง "นายหน้าคนแรกใน DB" มาผูกให้เมื่อไม่มี agentId ส่งมา
    // ทำให้บ้านที่นายหน้าคนอื่นลงประกาศ ไปโผล่ในบัญชีของนายหน้าคนแรกทั้งหมด
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนลงประกาศ" },
        { status: 401 }
      );
    }

    const agent = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!agent || agent.role_id !== "agent") {
      return NextResponse.json(
        { error: "อนุญาตให้ลงประกาศได้เฉพาะบัญชีนายหน้าเท่านั้น" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title, price, listing_type, listingType, type_id, type, location, description,
      bedrooms, bathrooms, area_sqm, areaSqm,
      province_id, amphure_id, district_id, latitude, longitude, images,
      doc, viewingSlots
    } = body;

    const resolvedListingType = (listing_type ?? listingType) === "rent" ? "rent" : "sale";

    if (!title || !price || (!type_id && !type) || !location) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน" },
        { status: 400 }
      );
    }

    if (!(Number(price) > 0)) {
      return NextResponse.json(
        { error: "ราคาต้องเป็นตัวเลขมากกว่า 0" },
        { status: 400 }
      );
    }

    const rawArea = area_sqm ?? areaSqm;
    if (rawArea !== undefined && rawArea !== null && rawArea !== "" && Number(rawArea) < 0) {
      return NextResponse.json(
        { error: "พื้นที่ต้องไม่ติดลบ" },
        { status: 400 }
      );
    }

    if ((bedrooms !== undefined && Number(bedrooms) < 0) || (bathrooms !== undefined && Number(bathrooms) < 0)) {
      return NextResponse.json(
        { error: "จำนวนห้องต้องไม่ติดลบ" },
        { status: 400 }
      );
    }

    // ผูกประกาศกับนายหน้าที่ล็อกอินอยู่เสมอ (ไม่รับค่า agentId จาก body อีกต่อไป)
    // หมายเหตุ: ตัดการ fallback ไปหา "นายหน้าคนแรกใน DB" ออกทั้งหมด เพราะเป็นต้นเหตุของบั๊กเดิม
    // ที่ทำให้บ้านของทุกนายหน้าไปกองอยู่ที่บัญชีเดียวกัน
    const validAgentId = agent.id;

    const resolvedTypeId = type_id ? parseInt(type_id) : (type === "house" ? 1 : type === "townhome" ? 2 : 3);
    const resolvedArea = parseFloat(area_sqm || areaSqm || 100);

    // 1. สร้างรายการในตาราง properties
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

    // 3. บันทึกเอกสารสิทธิ์เข้าตาราง property_documents ถ้ามีการแนบมา (เช่น โฉนดที่ดิน, สัญญา)
    if (doc) {
      await db.property_documents.create({
        data: {
          property_id: newProperty.id,
          doc_url: doc,
          doc_type: String(doc).toLowerCase().endsWith(".pdf") ? "pdf" : "image"
        }
      });
    }

    // 4. บันทึกวันเวลาที่นายหน้าเปิดว่างสำหรับบ้านหลังนี้ (ถ้ามีการเลือกไว้ตอนลงประกาศ)
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

    // แจ้งเตือนแอดมินทุกคนให้เข้ามาตรวจสอบประกาศใหม่ที่รออนุมัติ
    const admins = await db.users.findMany({
      where: { role_id: "admin" },
      select: { id: true }
    });

    await Promise.allSettled(
      admins.map(admin =>
        db.notifications.create({
          data: {
            user_id: admin.id,
            title: "📋 มีประกาศใหม่รออนุมัติ",
            content: `ประกาศ "${title}" ถูกส่งเข้าคิวตรวจสอบ`,
            type: "property_pending",
            is_read: false
          }
        })
      )
    );

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
    // เปลี่ยนสถานะประกาศ (อนุมัติ/ปฏิเสธ) ได้เฉพาะแอดมินเท่านั้น
    // หมายเหตุ: route นี้ไม่ได้อยู่ใน matcher ของ proxy.ts จึงต้องเช็คสิทธิ์เองตรงนี้
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string })?.role;
    if (!session || role !== "admin") {
      return NextResponse.json(
        { error: "อนุญาตเฉพาะผู้ดูแลระบบเท่านั้น" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, reason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "กรุณาระบุรหัสอสังหาฯ และสถานะที่ต้องการเปลี่ยน" },
        { status: 400 }
      );
    }

    const isApproved = status === "approved";
    const isRejected = status === "rejected";

    const updatedProperty = await db.properties.update({
      where: { id },
      data: {
        status,
        // ตีกลับ → บันทึกเหตุผลไว้ให้นายหน้าเห็น / อนุมัติ → ล้างเหตุผลเก่าทิ้ง (เผื่อเคยตีกลับมาก่อนแล้วแก้จนผ่าน)
        reject_reason: isRejected ? (reason || null) : isApproved ? null : undefined
      }
    });

    if (updatedProperty.agent_id) {
      const reasonText = isRejected && reason ? `\nเหตุผล: ${reason}` : "";
      await db.notifications.create({
        data: {
          user_id: updatedProperty.agent_id,
          title: isApproved ? "✅ ประกาศของคุณได้รับการอนุมัติแล้ว" : "❌ ประกาศของคุณไม่ผ่านการอนุมัติ",
          content: isApproved
            ? `ประกาศ "${updatedProperty.title}" ผ่านการตรวจสอบและแสดงบนเว็บไซต์เรียบร้อยแล้ว`
            : `ประกาศ "${updatedProperty.title}" ไม่ผ่านการอนุมัติจากทีมงาน กรุณาตรวจสอบข้อมูลอีกครั้ง${reasonText}`,
          type: "property",
          is_read: false
        }
      }).catch(err => console.error("Notification error:", err));
    }

    return NextResponse.json({ success: true, data: updatedProperty });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะประกาศได้: " + err.message },
      { status: 500 }
    );
  }
}