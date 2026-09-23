import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { calculateModerationSla } from "@/lib/services/slaService";

function formatThaiRelativeTime(date: Date): string {
  const now = new Date();
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 60) return "เมื่อสักครู่";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "เมื่อวานนี้";
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

export async function GET(request: Request) {
  try {
    // ตรวจสอบสิทธิ์: เฉพาะ Admin เท่านั้น
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 401 });
    }

    // IP จริงของผู้เรียก
    const forwardedFor = request.headers.get("x-forwarded-for");
    const adminIp = forwardedFor ? forwardedFor.split(",")[0].trim() : (request.headers.get("x-real-ip") || "unknown");

    const [
      pendingCount,
      approvedListingsCount,
      totalPropertiesCount,
      agentsCount,
      proAgentsCount,
      customersCount,
      pendingKycCount,
      pendingPaymentsCount,
      pendingReportsCount,
      pendingAppointmentsCount,
      totalAppointmentsCount,
      pendingProperties,
      pendingKycUsers,
      pendingPayments,
      pendingReports,
      recentAppointments,
      recentLogins,
      recentProps,
      recentUsers
    ] = await Promise.all([
      db.properties.count({ where: { status: "pending" } }),
      db.properties.count({ where: { status: "approved" } }),
      db.properties.count(),
      db.users.count({ where: { role_id: "agent" } }),
      db.users.count({ where: { role_id: "agent", plan_type: "pro" } }),
      db.users.count({ where: { role_id: "customer" } }),
      db.users.count({ where: { role_id: "agent", status: "pending" } }),
      db.payment_transactions.count({ where: { status: "pending" } }),
      db.reports.count({ where: { status: "pending" } }),
      db.appointments.count({ where: { status: "pending" } }),
      db.appointments.count(),

      // 1. ประกาศที่รอการอนุมัติ (Pending Properties)
      db.properties.findMany({
        where: { status: "pending" },
        include: {
          users: { select: { first_name: true, last_name: true, plan_type: true, is_verified: true, phone: true } },
          property_images: { orderBy: { order_index: "asc" }, take: 1 }
        },
        orderBy: { created_at: "desc" },
        take: 10
      }),

      // 2. นายหน้าที่รอยืนยันตัวตน KYC
      db.users.findMany({
        where: { role_id: "agent", status: "pending" },
        orderBy: { created_at: "desc" },
        take: 5,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
          line_id: true,
          kyc_doc: true,
          created_at: true
        }
      }),

      // 3. สลิปชำระเงินที่รอตรวจสอบ
      db.payment_transactions.findMany({
        where: { status: "pending" },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          listing_package_orders: {
            include: {
              listing_packages: { select: { name: true } },
              properties: { select: { title: true } }
            }
          }
        }
      }),

      // 4. รายงานปัญหาที่รอดำเนินการ
      db.reports.findMany({
        where: { status: "pending" },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          users_reports_reporter_idTousers: { select: { first_name: true, last_name: true, email: true } },
          properties: { select: { id: true, title: true } },
          users_reports_reported_agent_idTousers: { select: { first_name: true, last_name: true } }
        }
      }),

      // 5. รายการนัดหมายล่าสุด
      db.appointments.findMany({
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          users_appointments_customer_idTousers: { select: { first_name: true, last_name: true, phone: true } },
          users_appointments_agent_idTousers: { select: { first_name: true, last_name: true } },
          properties: { select: { id: true, title: true, location: true } }
        }
      }),

      // 6. ประวัติกิจกรรมล่าสุดสำหรับ Activity Feed
      db.login_histories.findMany({
        take: 6,
        orderBy: { created_at: "desc" },
        include: { users: { select: { first_name: true, last_name: true, email: true, role_id: true } } }
      }),
      db.properties.findMany({
        take: 6,
        orderBy: { created_at: "desc" },
        select: { id: true, title: true, status: true, price: true, created_at: true, users: { select: { first_name: true, last_name: true } } }
      }),
      db.users.findMany({
        take: 6,
        orderBy: { created_at: "desc" },
        select: { id: true, first_name: true, last_name: true, email: true, role_id: true, status: true, created_at: true }
      })
    ]);

    // แปลงรายการรอตรวจสอบประกาศ
    const moderationItems = pendingProperties.map(p => {
      const slaInfo = calculateModerationSla(p.created_at);
      return {
        id: p.id,
        title: p.title,
        code: p.id.substring(0, 8).toUpperCase(),
        price: "฿" + Number(p.price).toLocaleString(),
        seller: p.users ? `${p.users.first_name || ""} ${p.users.last_name || ""}`.trim() : "ไม่ระบุตัวแทน",
        sellerPhone: p.users?.phone || "-",
        plan: p.users?.plan_type === "pro" ? "PRO Member" : "Basic Plan",
        isPremium: Number(p.price) > 7000000,
        isVerified: p.users?.is_verified || false,
        sla: slaInfo.label,
        slaLevel: slaInfo.level,
        slaUrgent: slaInfo.level === "urgent" || slaInfo.level === "overdue",
        image: p.property_images[0]?.image_url || "",
        createdTimeAgo: formatThaiRelativeTime(new Date(p.created_at))
      };
    });

    // รายการนายหน้ารอตรวจ KYC
    const formattedPendingKyc = pendingKycUsers.map(u => ({
      id: u.id,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "นายหน้า",
      email: u.email,
      phone: u.phone || "-",
      lineId: u.line_id || "-",
      hasDoc: Boolean(u.kyc_doc),
      timeAgo: formatThaiRelativeTime(new Date(u.created_at))
    }));

    // รายการชำระเงินรอตรวจ
    const formattedPendingPayments = pendingPayments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      formattedAmount: "฿" + Number(p.amount).toLocaleString(),
      paymentMethod: p.payment_method || "PromptPay",
      slipUrl: p.slip_url,
      packageName: p.listing_package_orders?.listing_packages?.name || "แพ็กเกจ PRO",
      propertyTitle: p.listing_package_orders?.properties?.title || "อัปเกรดสถานะ",
      timeAgo: formatThaiRelativeTime(new Date(p.created_at))
    }));

    // รายการรายงานปัญหา
    const formattedPendingReports = pendingReports.map(r => ({
      id: r.id,
      reason: r.reason,
      reporterName: r.users_reports_reporter_idTousers ? `${r.users_reports_reporter_idTousers.first_name || ""} ${r.users_reports_reporter_idTousers.last_name || ""}`.trim() : "ผู้ใช้งาน",
      propertyTitle: r.properties?.title || null,
      reportedAgent: r.users_reports_reported_agent_idTousers ? `${r.users_reports_reported_agent_idTousers.first_name || ""} ${r.users_reports_reported_agent_idTousers.last_name || ""}`.trim() : null,
      timeAgo: formatThaiRelativeTime(new Date(r.created_at))
    }));

    // รายการนัดหมายล่าสุด
    const formattedRecentAppointments = recentAppointments.map(a => {
      const appDate = a.appointment_date ? new Date(a.appointment_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-";
      return {
        id: a.id,
        customerName: a.users_appointments_customer_idTousers ? `${a.users_appointments_customer_idTousers.first_name || ""} ${a.users_appointments_customer_idTousers.last_name || ""}`.trim() : "ลูกค้า",
        customerPhone: a.users_appointments_customer_idTousers?.phone || "-",
        agentName: a.users_appointments_agent_idTousers ? `${a.users_appointments_agent_idTousers.first_name || ""} ${a.users_appointments_agent_idTousers.last_name || ""}`.trim() : "นายหน้า",
        propertyTitle: a.properties?.title || "ไม่ระบุประกาศ",
        propertyLocation: a.properties?.location || "",
        appointmentDate: appDate,
        timeSlot: a.time_slot || "ตามตกลง",
        status: a.status || "pending",
        timeAgo: formatThaiRelativeTime(new Date(a.created_at))
      };
    });

    // สร้าง Structured Activity Feed จากกิจกรรมจริง
    interface RawActivity {
      id: string;
      time: Date;
      type: "listing" | "kyc" | "payment" | "appointment" | "report" | "user" | "login";
      title: string;
      description: string;
      badgeText: string;
      badgeVariant: "blue" | "emerald" | "amber" | "purple" | "rose" | "slate";
    }

    const rawActivities: RawActivity[] = [];

    recentLogins.forEach(l => {
      const uName = l.users ? `${l.users.first_name} ${l.users.last_name}`.trim() : "ผู้ใช้";
      const roleText = l.users?.role_id === "admin" ? "ผู้ดูแลระบบ" : l.users?.role_id === "agent" ? "นายหน้า" : "ลูกค้า";
      rawActivities.push({
        id: `login-${l.id}`,
        time: new Date(l.created_at),
        type: "login",
        title: "เข้าสู่ระบบ",
        description: `${uName} (${roleText}) เข้าสู่ระบบจาก IP ${l.ip_address || "127.0.0.1"}`,
        badgeText: "ล็อกอิน",
        badgeVariant: "slate"
      });
    });

    recentProps.forEach(pr => {
      const uName = pr.users ? `${pr.users.first_name} ${pr.users.last_name}`.trim() : "นายหน้า";
      const statusLabel = pr.status === "pending" ? "รอการตรวจสอบ" : pr.status === "approved" ? "เผยแพร่แล้ว" : pr.status;
      rawActivities.push({
        id: `prop-${pr.id}`,
        time: new Date(pr.created_at),
        type: "listing",
        title: pr.status === "pending" ? "มีประกาศใหม่รอการอนุมัติ" : "ประกาศได้รับการเผยแพร่",
        description: `"${pr.title}" โดย ${uName} (ราคา ฿${Number(pr.price).toLocaleString()}) - สถานะ: ${statusLabel}`,
        badgeText: "ประกาศ",
        badgeVariant: pr.status === "pending" ? "amber" : "emerald"
      });
    });

    recentUsers.forEach(u => {
      const uName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "สมาชิกใหม่";
      const roleLabel = u.role_id === "agent" ? "นายหน้าอสังหาฯ" : "ลูกค้าทั่วไป";
      rawActivities.push({
        id: `user-${u.id}`,
        time: new Date(u.created_at),
        type: u.role_id === "agent" ? "kyc" : "user",
        title: "ลงทะเบียนสมาชิกใหม่",
        description: `${uName} สมัครสิทธิ์ ${roleLabel} (${u.email})`,
        badgeText: roleLabel,
        badgeVariant: u.role_id === "agent" ? "blue" : "purple"
      });
    });

    recentAppointments.forEach(a => {
      const cust = a.users_appointments_customer_idTousers ? `${a.users_appointments_customer_idTousers.first_name} ${a.users_appointments_customer_idTousers.last_name}`.trim() : "ลูกค้า";
      const prop = a.properties?.title || "บ้าน";
      rawActivities.push({
        id: `apt-${a.id}`,
        time: new Date(a.created_at),
        type: "appointment",
        title: "นัดหมายเข้าชมบ้าน",
        description: `${cust} ขอนัดชม "${prop}" (${a.time_slot || "-"})`,
        badgeText: "นัดหมาย",
        badgeVariant: "blue"
      });
    });

    pendingPayments.forEach(p => {
      rawActivities.push({
        id: `pay-${p.id}`,
        time: new Date(p.created_at),
        type: "payment",
        title: "แจ้งชำระเงินแพ็กเกจ",
        description: `โอนชำระยอด ฿${Number(p.amount).toLocaleString()} รอการตรวจสอบสลิป`,
        badgeText: "การเงิน",
        badgeVariant: "amber"
      });
    });

    pendingReports.forEach(rp => {
      rawActivities.push({
        id: `rep-${rp.id}`,
        time: new Date(rp.created_at),
        type: "report",
        title: "มีรายงานข้อร้องเรียน",
        description: `เรื่อง: "${rp.reason}"`,
        badgeText: "ร้องเรียน",
        badgeVariant: "rose"
      });
    });

    // เรียงลำดับจากล่าสุดขึ้นก่อน
    rawActivities.sort((a, b) => b.time.getTime() - a.time.getTime());

    const activities = rawActivities.slice(0, 15).map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      timestamp: item.time.toISOString(),
      timeAgo: formatThaiRelativeTime(item.time),
      badgeText: item.badgeText,
      badgeVariant: item.badgeVariant
    }));

    // System logs สำหรับ backwards compatibility
    const systemLogs = activities.slice(0, 8).map(a => `[${a.timeAgo}] ${a.title}: ${a.description}`);

    return NextResponse.json({
      pendingCount,
      approvedListingsCount,
      totalPropertiesCount,
      agentsCount,
      proAgentsCount,
      customersCount,
      kycCount: pendingKycCount,
      paymentsCount: pendingPaymentsCount,
      reportsCount: pendingReportsCount,
      pendingAppointmentsCount,
      totalAppointmentsCount,
      moderationItems,
      pendingKycList: formattedPendingKyc,
      pendingPaymentsList: formattedPendingPayments,
      pendingReportsList: formattedPendingReports,
      recentAppointments: formattedRecentAppointments,
      activities,
      systemLogs,
      adminIp
    });
  } catch (error) {
    const err = error as Error;
    console.error("Dashboard API Error:", err);
    return NextResponse.json({ error: "โหลดข้อมูลล้มเหลว: " + err.message }, { status: 500 });
  }
}

