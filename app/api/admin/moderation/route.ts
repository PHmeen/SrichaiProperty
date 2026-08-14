import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงประกาศตามสถานะการตรวจสอบ
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อยืนยันสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { calculateModerationSla } from '@/lib/services/slaService'; // สูตรคำนวณ SLA ใช้ร่วมกับหน้า dashboard

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
            plan_type: true
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
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedProperties = properties.map((p) => {
      const allImages = p.property_images.map((img) => img.image_url);
      const mainImage = allImages[0] || null;
      const slaInfo = calculateModerationSla(p.created_at);

      return {
        id: p.id,
        title: p.title,
        price: p.price.toString(),
        listingType: p.listing_type === "rent" ? "rent" : "sale",
        type: p.property_types?.name || "ไม่ระบุประเภท",
        location: p.location,
        province: p.provinces?.name_th || "",
        amphure: p.amphures?.name_th || "",
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        area: p.area_sqm ? p.area_sqm.toString() : "0",
        agentName: p.users ? `${p.users.first_name} ${p.users.last_name}` : "ไม่ระบุตัวแทน",
        agentPlan: p.users?.plan_type || "basic",
        createdAt: p.created_at,
        image: mainImage,
        images: allImages,
        imageCount: allImages.length,
        slaLabel: slaInfo.label,
        slaLevel: slaInfo.level,
        slaMinutesLeft: slaInfo.minutesLeft
      };
    });

    return NextResponse.json({ success: true, properties: formattedProperties });
  } catch (error) {
    console.error("Error fetching admin properties:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
