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
    const status = searchParams.get('status') || 'pending'; // pending, processing, resolved, dismissed

    const reportsList = await db.reports.findMany({
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
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedReports = reportsList.map((r) => {
      const reporter = r.users_reports_reporter_idTousers;
      const reportedAgent = r.users_reports_reported_agent_idTousers;

      return {
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.created_at,
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
          title: r.properties.title
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
    const session = await getServerSession(authOptions);
    if (!session || !(session as any)?.user || (session as any).user.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { reportId, status, action, agentId } = body;

    if (!reportId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Perform specific database updates if required (e.g., Ban Agent)
    if (action === 'ban' && agentId) {
      await db.users.update({
        where: { id: agentId },
        data: { status: 'suspended' } // suspended/banned
      });
    }

    const updatedReport = await db.reports.update({
      where: { id: reportId },
      data: { status: status }
    });

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (error) {
    console.error("Error updating report status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
