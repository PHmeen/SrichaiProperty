import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      pendingCount,
      onlineCount,
      agentsCount,
      proAgentsCount,
      pendingProperties,
      newAgents,
      reportsCount,
      kycCount,
      paymentsCount,
      recentLogins,
      recentPayments,
      recentProps,
      recentUsers,
      recentReports
    ] = await Promise.all([
      db.properties.count({ where: { status: "pending" } }),
      db.properties.count({ where: { status: "approved" } }),
      db.users.count({ where: { role_id: "agent" } }),
      db.users.count({ where: { role_id: "agent", plan_type: "pro" } }),
      db.properties.findMany({
        where: { status: "pending" },
        include: {
          users: { select: { first_name: true, last_name: true, plan_type: true, is_verified: true } },
          property_images: { orderBy: { order_index: "asc" }, take: 1 }
        },
        orderBy: { created_at: "desc" }
      }),
      db.users.findMany({ where: { role_id: "agent" }, orderBy: { created_at: "desc" }, take: 5 }),
      db.reports.count({ where: { status: "pending" } }),
      db.users.count({ where: { role_id: "agent", status: "pending" } }),
      db.payment_transactions.count({ where: { status: "pending" } }),
      // 1. ประวัติการล็อกอินจริงจาก DB
      db.login_histories.findMany({
        take: 5, orderBy: { created_at: "desc" },
        include: { users: { select: { first_name: true, last_name: true, email: true, role_id: true } } }
      }),
      // 2. การชำระเงินจริงจาก DB
      db.payment_transactions.findMany({ take: 5, orderBy: { created_at: "desc" } }),
      // 3. ประกาศบ้านใหม่จริงจาก DB
      db.properties.findMany({ take: 5, orderBy: { created_at: "desc" }, select: { id: true, title: true, status: true, created_at: true } }),
      // 4. สมาชิกสมัครใหม่จริงจาก DB
      db.users.findMany({ take: 5, orderBy: { created_at: "desc" }, select: { id: true, first_name: true, last_name: true, email: true, role_id: true, created_at: true } }),
      // 5. รายงานปัญหาจริงจาก DB
      db.reports.findMany({ take: 5, orderBy: { created_at: "desc" }, select: { id: true, reason: true, status: true, created_at: true } })
    ]);

    const moderationItems = pendingProperties.map(p => ({
      id: p.id,
      title: p.title,
      code: p.id.substring(0, 8).toUpperCase(),
      price: "฿" + Number(p.price).toLocaleString(),
      seller: p.users ? `${p.users.first_name || ""} ${p.users.last_name || ""}`.trim() : "ไม่ระบุตัวแทน",
      plan: p.users?.plan_type === "pro" ? "PRO Member" : "Basic Plan",
      isPremium: Number(p.price) > 7000000,
      isVerified: p.users?.is_verified || false,
      sla: "เหลือเวลา 4 ชม.",
      image: p.property_images[0]?.image_url || ""
    }));

    const formattedNewAgents = newAgents.map(u => ({
      id: u.id,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "นายหน้า",
      timeAgo: "สมัครเมื่อเร็วๆ นี้",
      isNdidVerified: u.is_verified || false,
      initials: u.first_name ? u.first_name.charAt(0).toUpperCase() : "A"
    }));

    // รวมและจัดสร้าง System Audit Logs จากกิจกรรม DB จริง 100%
    const rawLogs: { time: Date; tag: string; detail: string }[] = [];

    recentLogins.forEach(l => {
      const uName = l.users ? `${l.users.first_name} ${l.users.last_name}`.trim() : "User";
      rawLogs.push({
        time: new Date(l.created_at),
        tag: "LOGIN",
        detail: `User ${uName} (${l.users?.email || '-'}) logged in successfully (IP: ${l.ip_address || '127.0.0.1'})`
      });
    });

    recentPayments.forEach(p => {
      const st = (p.status || 'pending').toUpperCase();
      rawLogs.push({
        time: new Date(p.created_at),
        tag: "PAYMENT",
        detail: `PromptPay transfer ฿${Number(p.amount)} [Status: ${st}] TxID: ${p.id.substring(0, 8).toUpperCase()}`
      });
    });

    recentProps.forEach(pr => {
      rawLogs.push({
        time: new Date(pr.created_at),
        tag: "PROPERTY",
        detail: `Listing "${pr.title}" registered in system (Status: ${pr.status})`
      });
    });

    recentUsers.forEach(u => {
      const uName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'New User';
      rawLogs.push({
        time: new Date(u.created_at),
        tag: "SYSTEM",
        detail: `New account created for ${uName} (${u.role_id || 'customer'}) · Email: ${u.email}`
      });
    });

    recentReports.forEach(rp => {
      rawLogs.push({
        time: new Date(rp.created_at),
        tag: "ALERT",
        detail: `User report submitted: "${rp.reason}" (Status: ${rp.status})`
      });
    });

    // เรียงลำดับจากเวลาล่าสุดขึ้นก่อน
    rawLogs.sort((a, b) => b.time.getTime() - a.time.getTime());

    const formattedLogs = rawLogs.slice(0, 10).map(item => {
      const timeStr = item.time.toLocaleTimeString('th-TH');
      return `[${timeStr}] ${item.tag} ${item.detail}`;
    });

    if (formattedLogs.length === 0) {
      formattedLogs.push(`[${new Date().toLocaleTimeString('th-TH')}] SYSTEM Connected to PostgreSQL Database. Monitoring active system events.`);
    }

    return NextResponse.json({
      pendingCount, onlineCount, agentsCount, proAgentsCount,
      moderationItems, newAgents: formattedNewAgents,
      reportsCount, kycCount, paymentsCount, systemLogs: formattedLogs
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: "โหลดข้อมูลล้มเหลว: " + err.message }, { status: 500 });
  }
}
