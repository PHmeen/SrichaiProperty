import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อยืนยันสิทธิ์ admin
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับตาราง payment_transactions และการแจ้งเตือน
import { notifyUser } from "@/lib/notify"; // ส่งการแจ้งเตือนไปยังตัวแทนเมื่ออนุมัติ/ปฏิเสธการชำระเงิน

async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return null;
  return session;
}

function parseNoti(content: string) {
  const get = (key: string) => content.match(new RegExp(`${key}:([\\w@.\\-]+)`))?.[1] ?? "";
  return { txId: get("txId"), agentId: get("agentId"), name: get("name"), email: get("email") };
}

// GET: รายการชำระเงิน Verified PRO พร้อมโน้ตภายใน
export async function GET(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") || "pending";

  const [transactions, notis, notesConfigs] = await Promise.all([
    db.payment_transactions.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { created_at: "desc" }
    }),
    db.notifications.findMany({
      where: { type: "payment" },
      select: { content: true }
    }),
    db.system_configs.findMany({
      where: {
        key: {
          startsWith: "payment_note_"
        }
      }
    })
  ]);

  // สร้าง Map: txId -> agent info จาก notification
  const agentMap = new Map(notis.map(n => {
    const p = parseNoti(n.content);
    return [p.txId, { agentId: p.agentId, agentName: p.name, agentEmail: p.email }];
  }));

  // สร้าง Map: txId -> internal note
  const noteMap = new Map(notesConfigs.map(c => {
    const txId = c.key.replace("payment_note_", "");
    return [txId, {
      text: c.description || "",
      author: c.value || "Admin",
      updatedAt: c.updated_at
    }];
  }));

  const data = transactions.map(t => {
    const agent = agentMap.get(t.id) ?? { agentId: null, agentName: "ไม่ระบุ", agentEmail: "-" };
    const internalNote = noteMap.get(t.id) ?? null;
    return {
      id: t.id,
      orderId: t.order_id,
      amount: Number(t.amount),
      slipUrl: t.slip_url,
      status: t.status,
      createdAt: t.created_at,
      internalNote,
      ...agent
    };
  });

  return NextResponse.json({ success: true, transactions: data });
}

// PATCH: อนุมัติ / ปฏิเสธสลิป / บันทึกโน้ตภายใน
export async function PATCH(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { transactionId, action, agentId, reason, note } = body;
  if (!transactionId || !action) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

  // 1. กรณีบันทึกโน้ตภายในของแอดมิน (Internal Admin Note)
  if (action === "save_note") {
    const adminIdentifier = session.user?.name || session.user?.email || "Admin";
    await db.system_configs.upsert({
      where: { key: `payment_note_${transactionId}` },
      create: {
        key: `payment_note_${transactionId}`,
        value: adminIdentifier,
        description: note || "",
      },
      update: {
        value: adminIdentifier,
        description: note || "",
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      note: {
        text: note || "",
        author: adminIdentifier,
        updatedAt: new Date()
      }
    });
  }

  // 2. กรณีอนุมัติ / ปฏิเสธสลิป
  const isApprove = action === "approve";

  const tx = await db.payment_transactions.update({
    where: { id: transactionId },
    data: { status: isApprove ? "approved" : "rejected" }
  });

  if (tx.order_id) {
    await db.listing_package_orders.update({
      where: { id: tx.order_id },
      data: { status: isApprove ? "paid" : "rejected" }
    });
  }

  if (isApprove && agentId) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30);

    await Promise.all([
      db.users.update({
        where: { id: agentId },
        data: { plan_type: "pro", plan_expired_at: expDate }
      }),
      notifyUser({
        userId: agentId,
        title: "ยินดีด้วย! อนุมัติสิทธิ์ Verified PRO สำเร็จ",
        content: "สลิปการชำระเงินได้รับการยืนยันเรียบร้อยแล้ว บัญชีของคุณได้รับการปรับเป็น Verified PRO (ระยะเวลา 30 วัน)",
        type: "package",
        linkUrl: "/agent/packages"
      }).catch(() => {})
    ]);
  } else if (!isApprove && agentId) {
    const reasonDetail = reason ? ` (สาเหตุ: ${reason}${note ? ` - ข้อแนะนำ: ${note}` : ''})` : '';
    await notifyUser({
      userId: agentId,
      title: "แจ้งผลการตรวจสอบสลิปการชำระเงิน",
      content: `สลิปการชำระเงินของคุณไม่ผ่านการอนุมัติ${reasonDetail} กรุณาตรวจสอบและอัปโหลดหลักฐานใหม่อีกครั้ง`,
      type: "package",
      linkUrl: "/agent/packages"
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}

