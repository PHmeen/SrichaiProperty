import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันปัจจุบันเพื่อตรวจสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงข้อมูลวิเคราะห์ (analytics)

interface AdminSession {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

type RangeType = 'day' | 'month' | 'year';

interface Bucket {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

// สร้างช่วงเวลา (bucket) สำหรับกราฟ ใช้รูปแบบเดียวกับกราฟสถิติฝั่งนายหน้า (agent/dashboard)
// เพื่อให้ UX การสลับ วัน/เดือน/ปี เหมือนกันทั้งระบบ
function getBuckets(range: RangeType): Bucket[] {
  const buckets: Bucket[] = [];
  const now = new Date();

  if (range === 'day') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      buckets.push({
        key,
        label: d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' }),
        start: new Date(`${key}T00:00:00.000Z`),
        end: new Date(`${key}T23:59:59.999Z`),
      });
    }
  } else if (range === 'month') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('th-TH', { month: 'short' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      });
    }
  } else {
    for (let i = 2; i >= 0; i--) {
      const year = now.getFullYear() - i;
      buckets.push({
        key: String(year),
        label: String(year + 543), // แสดงเป็น พ.ศ.
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      });
    }
  }

  return buckets;
}

const APPOINTMENT_STATUSES = ['pending', 'approved', 'completed', 'rejected', 'cancelled'] as const;

// GET: สถิติภาพรวมสำหรับหน้า /admin/analytics (นัดหมาย, ยอดเข้าชมบ้าน, ผู้ใช้/นายหน้า)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions) as AdminSession | null;
    if (!session || !session.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rangeParam = searchParams.get('range');
    const range: RangeType = rangeParam === 'day' || rangeParam === 'year' ? rangeParam : 'month';

    const buckets = getBuckets(range);
    const rangeStart = buckets[0].start;

    const [
      appointmentsRaw,
      usersRaw,
      topProperties,
      totalAppointments,
      totalUsers,
      agentsCount,
      proAgentsCount,
      viewsAgg,
    ] = await Promise.all([
      db.appointments.findMany({
        where: { created_at: { gte: rangeStart } },
        select: { created_at: true, status: true },
      }),
      db.users.findMany({
        where: { created_at: { gte: rangeStart } },
        select: { created_at: true, role_id: true },
      }),
      db.properties.findMany({
        orderBy: { views_count: 'desc' },
        take: 5,
        select: { id: true, title: true, views_count: true },
      }),
      db.appointments.count(),
      db.users.count(),
      db.users.count({ where: { role_id: 'agent' } }),
      db.users.count({ where: { role_id: 'agent', plan_type: 'pro' } }),
      db.properties.aggregate({ _sum: { views_count: true } }),
    ]);

    // นับจำนวนนัดหมายแยกตามสถานะในแต่ละช่วงเวลา
    const appointmentsChart = buckets.map(b => {
      const inBucket = appointmentsRaw.filter(a => a.created_at >= b.start && a.created_at <= b.end);
      const row: Record<string, string | number> = { timeframe: b.label };
      APPOINTMENT_STATUSES.forEach(s => {
        row[s] = inBucket.filter(a => (a.status || 'pending') === s).length;
      });
      return row;
    });

    // นับจำนวนผู้ใช้สมัครใหม่แยกตาม role ในแต่ละช่วงเวลา
    const usersChart = buckets.map(b => {
      const inBucket = usersRaw.filter(u => u.created_at >= b.start && u.created_at <= b.end);
      return {
        timeframe: b.label,
        customer: inBucket.filter(u => (u.role_id || 'customer') === 'customer').length,
        agent: inBucket.filter(u => u.role_id === 'agent').length,
      };
    });

    // Top 5 ประกาศที่มีคนเข้าชมมากที่สุด (views_count เป็นตัวเลขสะสม ไม่มี log รายวัน จึงแสดงเป็นอันดับแทนกราฟเทรนด์)
    const topPropertiesChart = topProperties.map(p => ({
      title: p.title.length > 24 ? `${p.title.slice(0, 24)}…` : p.title,
      views: p.views_count,
    }));

    return NextResponse.json({
      range,
      appointmentsChart,
      usersChart,
      topPropertiesChart,
      summary: {
        totalAppointments,
        totalUsers,
        agentsCount,
        proAgentsCount,
        totalViews: viewsAgg._sum.views_count || 0,
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'โหลดข้อมูลสถิติล้มเหลว: ' + err.message }, { status: 500 });
  }
}
