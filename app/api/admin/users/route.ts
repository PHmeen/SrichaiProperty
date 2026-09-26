import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงและจัดการข้อมูลผู้ใช้
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อตรวจสอบสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession

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
    const targetUserId = searchParams.get('userId');

    // 1. กรณีต้องการดูข้อมูลโปรไฟล์และประวัติแบบเจาะลึกรายบุคคล (User Profile Modal)
    if (targetUserId) {
      const user = await db.users.findUnique({
        where: { id: targetUserId },
        include: {
          roles: true,
          login_histories: {
            orderBy: { created_at: 'desc' },
            take: 5
          },
          properties: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              created_at: true,
              property_types: { select: { name: true } },
              provinces: { select: { name_th: true } }
            },
            orderBy: { created_at: 'desc' },
            take: 6
          },
          appointments_appointments_agent_idTousers: {
            select: {
              id: true,
              status: true,
              appointment_date: true,
              time_slot: true,
              properties: { select: { title: true } },
              reviews: { select: { rating: true, comment: true } }
            },
            orderBy: { appointment_date: 'desc' },
            take: 6
          },
          appointments_appointments_customer_idTousers: {
            select: {
              id: true,
              status: true,
              appointment_date: true,
              time_slot: true,
              properties: { select: { title: true } }
            },
            orderBy: { appointment_date: 'desc' },
            take: 6
          },
          reports_reports_reported_agent_idTousers: {
            select: {
              id: true,
              reason: true,
              status: true,
              created_at: true
            },
            take: 5
          }
        }
      });

      if (!user) {
        return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, { status: 404 });
      }

      const [
        totalListings,
        approvedListings,
        soldListings,
        totalAgentAppointments,
        completedAgentAppointments,
        customerNoShowCount
      ] = await Promise.all([
        db.properties.count({ where: { agent_id: targetUserId } }),
        db.properties.count({ where: { agent_id: targetUserId, status: "approved" } }),
        db.properties.count({ where: { agent_id: targetUserId, status: "sold" } }),
        db.appointments.count({ where: { agent_id: targetUserId } }),
        db.appointments.count({ where: { agent_id: targetUserId, status: "completed" } }),
        db.appointments.count({ where: { customer_id: targetUserId, status: "no_show" } })
      ]);

      const agentReviews = user.appointments_appointments_agent_idTousers
        .map((a) => a.reviews)
        .filter((r): r is { rating: number | null; comment: string | null } => r !== null && r.rating !== null);

      const avgRating = agentReviews.length > 0
        ? (agentReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / agentReviews.length).toFixed(1)
        : null;

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          lineId: user.line_id,
          profileImage: user.profile_image,
          roleId: user.role_id,
          roleName: user.roles?.name || user.role_id,
          status: user.status,
          planType: user.plan_type,
          isVerified: user.is_verified,
          createdAt: user.created_at,
          kycDoc: user.kyc_doc,
          experience: user.experience,
          specialtyZone: user.specialty_zone,
          specialtyType: user.specialty_type,
          stats: {
            totalListings,
            approvedListings,
            soldListings,
            totalAgentAppointments,
            completedAgentAppointments,
            customerNoShowCount,
            avgRating,
            reviewCount: agentReviews.length
          },
          loginHistories: user.login_histories.map((lh) => ({
            id: lh.id,
            ipAddress: lh.ip_address || "ไม่ระบุ IP",
            userAgent: lh.user_agent || "ไม่ระบุอุปกรณ์",
            createdAt: lh.created_at
          })),
          recentProperties: user.properties.map((p) => ({
            id: p.id,
            title: p.title,
            price: p.price.toString(),
            status: p.status,
            type: p.property_types?.name || "ไม่ระบุประเภท",
            province: p.provinces?.name_th || "",
            createdAt: p.created_at
          })),
          recentAppointments: (user.role_id === "agent"
            ? user.appointments_appointments_agent_idTousers
            : user.appointments_appointments_customer_idTousers
          ).map((a) => ({
            id: a.id,
            status: a.status,
            date: a.appointment_date,
            timeSlot: a.time_slot,
            propertyTitle: a.properties?.title || "ไม่ระบุชื่ออสังหาฯ"
          })),
          recentReports: user.reports_reports_reported_agent_idTousers.map((r) => ({
            id: r.id,
            reason: r.reason,
            status: r.status,
            createdAt: r.created_at
          }))
        }
      });
    }

    // 2. ดึงรายการตารางผู้ใช้ทั่วไป
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

    // นับแยกทีเดียวด้วย groupBy แทนการ query ต่อ user (กันยิง query ซ้ำเป็นสิบ/ร้อยรอบ)
    const noShowGroups = await db.appointments.groupBy({
      by: ['customer_id'],
      where: { status: 'no_show', customer_id: { not: null } },
      _count: { _all: true }
    });
    const noShowCountMap = new Map(noShowGroups.map((g) => [g.customer_id as string, g._count._all]));
    const usersWithNoShow = users.map((u) => ({ ...u, noShowCount: noShowCountMap.get(u.id) || 0 }));

    // Calculate stats
    const totalCount = await db.users.count();
    const agentCount = await db.users.count({ where: { role_id: 'agent' } });
    const customerCount = await db.users.count({ where: { role_id: 'customer' } });
    const pendingCount = await db.users.count({ where: { status: 'pending' } });

    return NextResponse.json({
      success: true,
      users: usersWithNoShow,
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
