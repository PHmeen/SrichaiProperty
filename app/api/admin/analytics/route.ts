
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันปัจจุบันเพื่อตรวจสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงข้อมูลวิเคราะห์ (analytics)
import { summarizeReviewSla } from '@/lib/services/slaService'; // สรุปผล SLA การตรวจประกาศย้อนหลัง

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

    // ช่วงก่อนหน้าที่ยาวเท่ากัน ใช้เทียบว่าตัวเลขดีขึ้นหรือแย่ลง
    // ตัวเลขเดี่ยวๆ อย่าง "34 นัดหมาย" ตีความไม่ได้ว่าดีหรือแย่ ต้องมีฐานเทียบเสมอ
    const rangeEnd = buckets[buckets.length - 1].end;
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
    const prevStart = new Date(rangeStart.getTime() - rangeMs);
    const prevEnd = new Date(rangeStart.getTime() - 1);

    const [
      appointmentsRaw,
      usersRaw,
      viewsInRange,
      prevAppointmentsCount,
      prevUsersCount,
      prevViewsCount,
      totalUsers,
      agentsCount,
      proAgentsCount,
    ] = await Promise.all([
      db.appointments.findMany({
        where: { created_at: { gte: rangeStart } },
        select: { created_at: true, status: true },
      }),
      db.users.findMany({
        where: { created_at: { gte: rangeStart } },
        select: { created_at: true, role_id: true },
      }),
      // ใช้ log การเข้าชมรายครั้ง (property_views) แทนตัวนับสะสม properties.views_count
      // เพื่อให้ Top 5 ขยับตามช่วงเวลาที่เลือกจริง ตารางนี้มี index สำหรับงานนี้อยู่แล้ว
      db.property_views.findMany({
        where: { viewed_at: { gte: rangeStart, lte: rangeEnd } },
        select: { property_id: true, properties: { select: { title: true } } },
      }),
      db.appointments.count({ where: { created_at: { gte: prevStart, lte: prevEnd } } }),
      db.users.count({ where: { created_at: { gte: prevStart, lte: prevEnd } } }),
      db.property_views.count({ where: { viewed_at: { gte: prevStart, lte: prevEnd } } }),
      db.users.count(),
      db.users.count({ where: { role_id: 'agent' } }),
      db.users.count({ where: { role_id: 'agent', plan_type: 'pro' } }),
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

    // ตัดช่วงเวลาหัวแถวที่ไม่มีข้อมูลเลยทิ้ง (เช่น เม.ย./พ.ค./มิ.ย. ที่ระบบยังไม่เปิดใช้)
    // กราฟสองอันต้องตัดที่ตำแหน่งเดียวกัน ไม่งั้นแกนเวลาจะไม่ตรงกันและเทียบกันไม่ได้
    const hasAnyData = (i: number) =>
      APPOINTMENT_STATUSES.some(st => Number(appointmentsChart[i][st]) > 0) ||
      usersChart[i].customer > 0 || usersChart[i].agent > 0;
    let firstWithData = 0;
    while (firstWithData < buckets.length - 1 && !hasAnyData(firstWithData)) firstWithData++;
    const appointmentsChartTrimmed = appointmentsChart.slice(firstWithData);
    const usersChartTrimmed = usersChart.slice(firstWithData);

    // Top 5 ประกาศที่มีคนเข้าชมมากที่สุด "ในช่วงที่เลือก"
    // เดิมเรียงจาก views_count ซึ่งเป็นยอดสะสมตลอดกาล ทำให้อันดับไม่ขยับตามตัวกรองเลย
    // กลายเป็นว่าบนจอเดียวกันมีข้อมูลสองมาตรฐานปนกัน คนอ่านตีความผิดได้ง่าย
    const viewsByProperty = new Map<string, { title: string; views: number }>();
    for (const v of viewsInRange) {
      const cur = viewsByProperty.get(v.property_id);
      if (cur) cur.views += 1;
      else viewsByProperty.set(v.property_id, { title: v.properties?.title ?? 'ไม่ระบุชื่อ', views: 1 });
    }
    const topPropertiesChart = [...viewsByProperty.values()]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map(p => ({
        title: p.title.length > 24 ? `${p.title.slice(0, 24)}…` : p.title,
        views: p.views,
      }));

    // ตัวชี้วัดสุขภาพของ core flow — ตอบว่า "ระบบทำงานดีไหม" ไม่ใช่แค่ "มีกิจกรรมเท่าไหร่"
    // ใช้ข้อมูลจากระบบติดตามผลนัดหมาย (No-show) ที่เก็บไว้อยู่แล้ว
    const totalInRange = appointmentsRaw.length;
    const countBy = (st: string) => appointmentsRaw.filter(a => (a.status || 'pending') === st).length;
    const pct = (n: number) => (totalInRange > 0 ? Math.round((n / totalInRange) * 100) : 0);
    const appointmentHealth = {
      total: totalInRange,
      completed: countBy('completed'),
      completedPercent: pct(countBy('completed')),
      noShow: countBy('no_show'),
      noShowPercent: pct(countBy('no_show')),
      rejected: countBy('rejected'),
      rejectedPercent: pct(countBy('rejected')),
      cancelled: countBy('cancelled'),
      cancelledPercent: pct(countBy('cancelled')),
    };

    // เปอร์เซ็นต์เปลี่ยนแปลงเทียบช่วงก่อนหน้า — null เมื่อช่วงก่อนหน้าเป็นศูนย์
    // (หารด้วยศูนย์ไม่ได้ และการโชว์ "+100%" จากฐาน 0 ทำให้เข้าใจผิด)
    const changePercent = (now: number, prev: number): number | null =>
      prev === 0 ? null : Math.round(((now - prev) / prev) * 100);

    const viewsInRangeCount = viewsInRange.length;
    const newUsersInRange = usersRaw.length;

    // 🔑 KEYWORD: สรุปผล SLA การตรวจประกาศ
    // ตอบว่าทีมแอดมินตรวจทันกำหนดจริงไหม ด้วยตัวเลขจากข้อมูลจริง
    // นับเฉพาะใบที่มี reviewed_at (ประกาศเก่าก่อนเริ่มเก็บข้อมูลจะถูกข้าม)
    const reviewedRows = await db.properties.findMany({
      where: { reviewed_at: { not: null } },
      select: { created_at: true, reviewed_at: true }
    });
    const moderationSla = summarizeReviewSla(reviewedRows);

    return NextResponse.json({
      range,
      appointmentsChart: appointmentsChartTrimmed,
      usersChart: usersChartTrimmed,
      topPropertiesChart,
      summary: {
        // ตัวเลขของ "ช่วงที่เลือก" พร้อมค่าเทียบช่วงก่อนหน้า
        appointmentsInRange: totalInRange,
        appointmentsChangePercent: changePercent(totalInRange, prevAppointmentsCount),
        viewsInRange: viewsInRangeCount,
        viewsChangePercent: changePercent(viewsInRangeCount, prevViewsCount),
        newUsersInRange,
        newUsersChangePercent: changePercent(newUsersInRange, prevUsersCount),
        // ตัวเลขสะสมทั้งระบบ แยกกลุ่มให้ชัดว่าไม่ได้ขยับตามตัวกรอง
        totalUsers,
        agentsCount,
        proAgentsCount,
      },
      appointmentHealth,
      moderationSla,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: 'โหลดข้อมูลสถิติล้มเหลว: ' + err.message }, { status: 500 });
  }
}
