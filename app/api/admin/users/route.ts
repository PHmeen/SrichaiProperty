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
    const roleFilter = searchParams.get('role'); // e.g. 'all', 'agent', 'customer'

    const whereClause: { role_id?: string } = {};
    if (roleFilter && roleFilter !== 'all') {
      whereClause.role_id = roleFilter;
    }

    const users = await db.users.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        profile_image: true,
        role_id: true,
        status: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Calculate stats
    const totalCount = await db.users.count();
    const agentCount = await db.users.count({ where: { role_id: 'agent' } });
    const customerCount = await db.users.count({ where: { role_id: 'customer' } });
    const pendingCount = await db.users.count({ where: { status: 'pending' } });

    return NextResponse.json({ 
      success: true, 
      users,
      stats: {
        total: totalCount,
        agents: agentCount,
        buyers: customerCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions) as AdminSession | null;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "Missing userId or status" }, { status: 400 });
    }

    // แปลงสถานะ 'rejected' เป็น 'banned' เพื่อให้ตรงตาม PostgreSQL check constraint ('pending', 'approved', 'banned')
    const dbStatus = status === 'rejected' ? 'banned' : status;

    const updatedUser = await db.users.update({
      where: { id: userId },
      data: { status: dbStatus }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const err = error as Error;
    console.error("Error updating user status:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
