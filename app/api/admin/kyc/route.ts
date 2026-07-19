import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any)?.user || (session as any).user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending'; // pending, approved, rejected

    const users = await db.users.findMany({
      where: {
        role_id: 'agent',
        status: status,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        profile_image: true,
        kyc_doc: true,
        status: true,
        created_at: true,
        line_id: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching kyc agents:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session as any)?.user || (session as any).user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedUser = await db.users.update({
      where: { id: userId },
      data: { status: status }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
