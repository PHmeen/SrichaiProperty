import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

    const properties = await db.properties.findMany({
      where: {
        status: status,
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
      const mainImage = p.property_images[0]?.image_url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80";
      return {
        id: p.id,
        title: p.title,
        price: p.price.toString(),
        type: p.property_types?.name,
        location: p.location,
        province: p.provinces?.name_th,
        amphure: p.amphures?.name_th,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area: p.area_sqm,
        agentName: p.users ? `${p.users.first_name} ${p.users.last_name}` : "Unknown",
        agentPlan: p.users?.plan_type,
        createdAt: p.created_at,
        image: mainImage,
        imageCount: p.property_images.length
      };
    });

    return NextResponse.json({ success: true, properties: formattedProperties });
  } catch (error) {
    console.error("Error fetching admin properties:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
