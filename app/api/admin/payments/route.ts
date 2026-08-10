import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return (session?.user as { role?: string })?.role === "admin";
}

function parseNoti(content: string) {
  const get = (key: string) => content.match(new RegExp(`${key}:([\\w@.\\-]+)`))?.[1] ?? "";
  return { txId: get("txId"), agentId: get("agentId"), name: get("name"), email: get("email") };
}

// GET: รายการชำระเงิน Verified PRO
export async function GET(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = new URL(req.url).searchParams.get("status") || "pending";

  const [transactions, notis] = await Promise.all([
    db.payment_transactions.findMany({
      where: status === "all" ? {} : { status },
      orderBy: { created_at: "desc" }
    }),
    db.notifications.findMany({
      where: { type: "payment" },
      select: { content: true }
    })
  ]);

  // สร้าง Map: txId -> agent info จาก notification
  const agentMap = new Map(notis.map(n => {
    const p = parseNoti(n.content);
    return [p.txId, { agentId: p.agentId, agentName: p.name, agentEmail: p.email }];
  }));

  const data = transactions.map(t => {
    const agent = agentMap.get(t.id) ?? { agentId: null, agentName: "ไม่ระบุ", agentEmail: "-" };
    return {
      id: t.id,
      orderId: t.order_id,
      amount: Number(t.amount),
      slipUrl: t.slip_url,
      status: t.status,
      createdAt: t.created_at,
      ...agent
    };
  });

  return NextResponse.json({ success: true, transactions: data });
}

// PATCH: อนุมัติ / ปฏิเสธสลิป
export async function PATCH(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transactionId, action, agentId } = await req.json();
  if (!transactionId || !action) return NextResponse.json({ error: "ข้อมูลไม่ครบ" }, { status: 400 });

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
        title: "🎉 บัญชีอัปเกรดเป็น Verified PRO แล้ว!",
        content: "การชำระเงินของคุณได้รับการยืนยัน สามารถใช้สิทธิ์ PRO ได้ทันที 30 วัน",
        type: "package"
      })
    ]);
  }

  return NextResponse.json({ success: true });
}
