import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // 1. ดึงจำนวนและข้อมูลนัดหมาย/รายงาน/ประกาศต่าง ๆ จากฐานข้อมูลจริง
    const [
      pendingPropertiesCount,
      approvedPropertiesCount,
      totalAgentsCount,
      proAgentsCount,
      pendingProperties,
      newAgents,
      totalReportsCount
    ] = await Promise.all([
      // ประกาศรอตรวจสอบ
      db.properties.count({ where: { status: "pending" } }),
      // ประกาศออนไลน์
      db.properties.count({ where: { status: "approved" } }),
      // นายหน้าทั้งหมด
      db.users.count({ where: { role_id: "agent" } }),
      // นายหน้าผู้ใช้ระดับ PRO
      db.users.count({ where: { role_id: "agent", plan_type: "pro" } }),
      // คิวตรวจสอบประกาศ (Listing Moderation)
      db.properties.findMany({
        where: { status: "pending" },
        include: {
          users: {
            select: {
              first_name: true,
              last_name: true,
              plan_type: true,
              is_verified: true
            }
          },
          property_types: true,
          property_images: {
            orderBy: { order_index: "asc" },
            take: 1
          }
        },
        orderBy: { created_at: "desc" }
      }),
      // สมาชิกนายหน้าสมัครใหม่
      db.users.findMany({
        where: { role_id: "agent" },
        orderBy: { created_at: "desc" },
        take: 5
      }),
      // รายงานปัญหาปัญหา
      db.reports.count({ where: { status: "pending" } })
    ]);

    // จัดระเบียบข้อมูลส่งคืนฝั่งหน้าบ้าน
    const formattedModerationItems = pendingProperties.map(p => {
      const sellerName = p.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน";
      const mainImage = p.property_images[0]?.image_url || "";
      const isPremium = Number(p.price) > 7000000;

      return {
        id: p.id,
        title: p.title,
        code: p.id.substring(0, 8).toUpperCase(),
        price: "฿" + Number(p.price).toLocaleString(),
        seller: sellerName,
        plan: p.users?.plan_type === "pro" ? "PRO Member" : "Basic Plan",
        isVerified: p.users?.is_verified || false,
        sla: "เหลือเวลา 4 ชม.", // จำลอง SLA ตามระยะเวลา
        slaUrgent: true,
        image: mainImage
      };
    });

    const formattedNewAgents = newAgents.map(u => ({
      id: u.id,
      name: `${u.first_name} ${u.last_name}`,
      timeAgo: "สมัครเมื่อเร็วๆ นี้",
      isNdidVerified: u.is_verified || false,
      initials: u.first_name ? u.first_name.charAt(0).toUpperCase() : "A"
    }));

    return NextResponse.json({
      pendingCount: pendingPropertiesCount,
      onlineCount: approvedPropertiesCount,
      agentsCount: totalAgentsCount,
      proAgentsCount: proAgentsCount,
      moderationItems: formattedModerationItems,
      newAgents: formattedNewAgents,
      reportsCount: totalReportsCount
    });

  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้: " + err.message },
      { status: 500 }
    );
  }
}
