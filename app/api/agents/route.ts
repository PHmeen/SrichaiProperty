import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const agents = await db.users.findMany({
      where: {
        role_id: 'agent',
        status: 'approved',
        ...(search ? {
          OR: [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { specialty_zone: { contains: search, mode: 'insensitive' } },
          ]
        } : {})
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        profile_image: true,
        experience: true,
        specialty_zone: true,
        specialty_type: true,
        is_verified: true,
        created_at: true,
        properties: {
          select: { id: true }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedAgents = agents.map(agent => ({
      id: agent.id,
      name: `${agent.first_name} ${agent.last_name}`,
      avatar: agent.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.first_name + ' ' + agent.last_name)}&background=1e40af&color=fff`,
      role: agent.specialty_type ? `ตัวแทนจำหน่าย${agent.specialty_type}` : "นายหน้าอสังหาริมทรัพย์มืออาชีพ",
      propertiesCount: agent.properties.length || 0,
      rating: "5.0 (รีวิวดีเยี่ยม)",
      location: agent.specialty_zone || "สงขลา / หาดใหญ่",
      phone: agent.phone || "08X-XXX-XXXX",
      email: agent.email,
      isVerified: agent.is_verified ?? true
    }));

    return NextResponse.json({ success: true, agents: formattedAgents });
  } catch (error) {
    console.error("Error fetching approved agents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
