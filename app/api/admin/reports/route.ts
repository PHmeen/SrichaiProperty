import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // ไคลเอนต์ Prisma สำหรับดึงข้อมูลรายงาน
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อตรวจสอบสิทธิ์ admin
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { notifyUser } from '@/lib/notify'; // ส่งการแจ้งเตือนความคืบหน้าเรื่องร้องเรียน

interface AdminSession {
  user?: {
    id?: string;
    email?: string;
    name?: string;
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
    const status = searchParams.get('status') || 'pending'; // pending, processing, resolved, dismissed

    const [reportsList, resolutionConfigs] = await Promise.all([
      db.reports.findMany({
        where: {
          status: status,
        },
        include: {
          users_reports_reporter_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role_id: true,
            }
          },
          users_reports_reported_agent_idTousers: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              role_id: true,
            }
          },
          properties: {
            select: {
              id: true,
              title: true,
              status: true,
              agent_id: true,
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      }),
      db.system_configs.findMany({
        where: {
          key: {
            startsWith: 'report_resolution_'
          }
        }
      })
    ]);

    // Map: reportId -> Resolution Info
    const resolutionMap = new Map(resolutionConfigs.map(c => {
      const reportId = c.key.replace('report_resolution_', '');
      return [reportId, {
        summary: c.description || '',
        author: c.value || 'Admin',
        resolvedAt: c.updated_at
      }];
    }));

    const formattedReports = reportsList.map((r) => {
      const reporter = r.users_reports_reporter_idTousers;
      const reportedAgent = r.users_reports_reported_agent_idTousers;
      const resolution = resolutionMap.get(r.id) ?? null;

      return {
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.created_at,
        resolution,
        reporter: reporter ? {
          id: reporter.id,
          name: `${reporter.first_name} ${reporter.last_name}`,
          role: reporter.role_id === 'customer' ? 'Buyer' : 'Agent'
        } : null,
        reportedAgent: reportedAgent ? {
          id: reportedAgent.id,
          name: `${reportedAgent.first_name} ${reportedAgent.last_name}`,
          role: 'Agent'
        } : null,
        property: r.properties ? {
          id: r.properties.id,
          title: r.properties.title,
          status: r.properties.status || 'pending',
          agentId: r.properties.agent_id
        } : null
      };
    });

    return NextResponse.json({ success: true, reports: formattedReports });
  } catch (error) {
    console.error("Error fetching reports:", error);
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
    const { reportId, status, action, agentId, propertyId, resolutionSummary, reporterId } = body;

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    const adminIdentifier = session.user.name || session.user.email || 'Admin';

    // 1. One-click Suspend / Hide Property Listing
    if (action === 'suspend_property' && propertyId) {
      const prop = await db.properties.update({
        where: { id: propertyId },
        data: { status: 'rejected' } // ปลดออกจากหน้าเว็บทันที
      });

      if (prop.agent_id) {
        await notifyUser({
          userId: prop.agent_id,
          title: "ประกาศของคุณถูกระงับการแสดงผลชั่วคราว",
          content: `ประกาศ "${prop.title}" ถูกระงับการแสดงผลชั่วคราว เนื่องจากมีรายงานข้อร้องเรียน กำลังอยู่ระหว่างการตรวจสอบจากทีมงาน`,
          type: "system",
          linkUrl: "/agent/listings"
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, action: 'suspended', propertyId });
    }

    // 2. Restore Property Listing
    if (action === 'restore_property' && propertyId) {
      const prop = await db.properties.update({
        where: { id: propertyId },
        data: { status: 'approved' }
      });

      if (prop.agent_id) {
        await notifyUser({
          userId: prop.agent_id,
          title: "ประกาศของคุณได้รับการคืนค่าการแสดงผลแล้ว",
          content: `การตรวจสอบข้อร้องเรียนเสร็จสิ้น ประกาศ "${prop.title}" ได้รับการเปิดให้แสดงผลบนเว็บไซต์ตามปกติเรียบร้อยแล้ว`,
          type: "system",
          linkUrl: `/property/${prop.id}`
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, action: 'restored', propertyId });
    }

    // 3. Ban Agent Action
    if (action === 'ban' && agentId) {
      await db.users.update({
        where: { id: agentId },
        data: { status: 'banned' }
      });

      await notifyUser({
        userId: agentId,
        title: "บัญชีของคุณถูกระงับการใช้งาน",
        content: `บัญชีนายหน้าของคุณถูกระงับการใช้งานถาวรเนื่องจากตรวจพบการละเมิดกฎร้ายแรงตามรายงานข้อร้องเรียน`,
        type: "system",
        linkUrl: "/support"
      }).catch(() => {});
    }

    // 4. Save Resolution Summary Log (Audit Trail)
    if (resolutionSummary) {
      await db.system_configs.upsert({
        where: { key: `report_resolution_${reportId}` },
        create: {
          key: `report_resolution_${reportId}`,
          value: adminIdentifier,
          description: resolutionSummary,
        },
        update: {
          value: adminIdentifier,
          description: resolutionSummary,
          updated_at: new Date()
        }
      });
    }

    // 5. Update Report Status
    const updatedReport = await db.reports.update({
      where: { id: reportId },
      data: { status: status || 'resolved' }
    });

    // Notify the Reporter of the resolution
    if (reporterId && status === 'resolved') {
      const ticketId = `TK-${reportId.slice(0, 8).toUpperCase()}`;
      await notifyUser({
        userId: reporterId,
        title: `รายงานปัญหา ${ticketId} ได้รับการดำเนินการแล้ว`,
        content: `เรื่องร้องเรียนของคุณได้รับการตรวจสอบและดำเนินการเรียบร้อยแล้ว${resolutionSummary ? `: ${resolutionSummary}` : ''} ขอบคุณที่ช่วยดูแลความปลอดภัยของชุมชน`,
        type: "system",
        linkUrl: "/"
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error("Error updating report status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

