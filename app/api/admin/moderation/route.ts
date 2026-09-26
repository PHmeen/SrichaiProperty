import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงประกาศตามสถานะการตรวจสอบ
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อยืนยันสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { calculateModerationSla, calculateReviewDuration, summarizeReviewSla } from '@/lib/services/slaService'; // SLA นับถอยหลัง + วัดผลย้อนหลัง

interface AdminSession {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions) as AdminSession | null;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const listingType = searchParams.get('listingType');

    const properties = await db.properties.findMany({
      where: {
        status: status,
        ...(listingType === 'sale' || listingType === 'rent' ? { listing_type: listingType } : {})
      },
      include: {
        users: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
            line_id: true,
            profile_image: true,
            plan_type: true
          }
        },
        property_types: true,
        // แอดมินที่เป็นคนตรวจใบนี้ (null ถ้ายังไม่ตรวจ หรือเป็นประกาศเก่าก่อนมีฟีเจอร์นี้)
        reviewer: { select: { first_name: true, last_name: true } },
        property_images: {
          orderBy: {
            order_index: "asc"
          }
        },
        provinces: true,
        amphures: true,
        districts: true,
        property_documents: true,
        property_amenities: {
          include: {
            amenities: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedProperties = properties.map((p) => {
      const allImages = p.property_images.map((img) => img.image_url);
      const mainImage = allImages[0] || null;
      const slaInfo = calculateModerationSla(p.created_at);
      // ใบที่ตรวจแล้วจะมี reviewed_at ใช้บอกว่าใช้เวลาไปเท่าไหร่และทันกำหนดไหม
      const reviewDuration = calculateReviewDuration(p.created_at, p.reviewed_at);

      return {
        id: p.id,
        title: p.title,
        price: p.price.toString(),
        listingType: p.listing_type === "rent" ? "rent" : "sale",
        type: p.property_types?.name || "ไม่ระบุประเภท",
        location: p.location,
        province: p.provinces?.name_th || "",
        amphure: p.amphures?.name_th || "",
        district: p.districts?.name_th || "",
        latitude: p.latitude ? Number(p.latitude) : null,
        longitude: p.longitude ? Number(p.longitude) : null,
        description: p.description || "",
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        area: p.area_sqm ? p.area_sqm.toString() : "0",
        parkingSpaces: p.parking_spaces || 0,
        floors: p.floors || 1,
        ownershipType: p.ownership_type || "",
        agentName: p.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน",
        agentEmail: p.users?.email || "",
        agentPhone: p.users?.phone || "",
        agentLineId: p.users?.line_id || "",
        agentProfileImage: p.users?.profile_image || null,
        agentPlan: p.users?.plan_type || "basic",
        createdAt: p.created_at,
        image: mainImage,
        images: allImages,
        imageCount: allImages.length,
        amenities: p.property_amenities.map((pa) => pa.amenities.name),
        documents: p.property_documents.map((d) => ({
          id: d.id,
          url: d.doc_url,
          type: d.doc_type || "document"
        })),
        slaLabel: slaInfo.label,
        slaLevel: slaInfo.level,
        slaMinutesLeft: slaInfo.minutesLeft,
        slaUrgent: slaInfo.level === 'urgent' || slaInfo.level === 'overdue',
        // ร่องรอยการตรวจสอบ — null ทั้งหมดถ้ายังไม่ถูกตรวจ
        reviewedAt: p.reviewed_at,
        reviewerName: p.reviewer ? `${p.reviewer.first_name} ${p.reviewer.last_name}` : null,
        reviewDurationLabel: reviewDuration?.label ?? null,
        reviewWithinSla: reviewDuration?.withinSla ?? null
      };
    });

    // สรุปผล SLA ของชุดที่ดึงมา ใช้โชว์เป็นการ์ดสรุปด้านบนหน้า moderation
    const slaSummary = summarizeReviewSla(properties.map((p) => ({ created_at: p.created_at, reviewed_at: p.reviewed_at })));

    return NextResponse.json({ success: true, properties: formattedProperties, slaSummary });
  } catch (error) {
    console.error("Error fetching admin properties:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
