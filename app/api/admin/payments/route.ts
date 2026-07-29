import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

interface AdminSession {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

// GET: ดึงรายการการชำระเงินรอตรวจสอบ
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AdminSession | null;
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "pending";

    const transactions = await db.payment_transactions.findMany({
      where: { status },
      include: {
        listing_package_orders: {
          include: {
            properties: {
              include: {
                users: {
                  select: { id: true, first_name: true, last_name: true, email: true }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    const formatted = transactions.map((t) => {
      const order = t.listing_package_orders;
      const agent = order?.properties?.users;
      return {
        id: t.id,
        orderId: t.order_id,
        amount: Number(t.amount),
        paymentMethod: t.payment_method || "PromptPay",
        slipUrl: t.slip_url,
        status: t.status,
        createdAt: t.created_at,
        agentId: agent?.id,
        agentName: agent ? `${agent.first_name} ${agent.last_name}` : "นายหน้าในระบบ",
        agentEmail: agent?.email
      };
    });

    return NextResponse.json({ success: true, transactions: formatted });
  } catch (error) {
    const err = error as Error;
    console.error("GET Admin Payments Error:", err);
    return NextResponse.json({ error: "Internal Server Error: " + err.message }, { status: 500 });
  }
}

// PATCH: อนุมัติหรือปฏิเสธสลิปการโอนเงิน
export async function PATCH(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AdminSession | null;
    if (!session || !session.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transactionId, action, agentId } = body; // action: 'approve' | 'reject'

    if (!transactionId || !action) {
      return NextResponse.json({ error: "กรุณาระบุ transactionId และ action" }, { status: 400 });
    }

    const isApprove = action === "approve";
    const statusStr = isApprove ? "approved" : "rejected";

    // 1. อัปเดตสถานะการชำระเงิน
    const transaction = await db.payment_transactions.update({
      where: { id: transactionId },
      data: { status: statusStr }
    });

    // 2. อัปเดตคำสั่งซื้อ
    if (transaction.order_id) {
      await db.listing_package_orders.update({
        where: { id: transaction.order_id },
        data: { status: isApprove ? "paid" : "rejected" }
      });
    }

    // 3. หากอนุมัติ ให้อัปเกรดนายหน้าเป็น PRO (plan_type = 'pro')
    if (isApprove && agentId) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30);

      await db.users.update({
        where: { id: agentId },
        data: {
          plan_type: "pro",
          plan_expired_at: expDate
        }
      });

      // แจ้งเตือนนายหน้า
      await db.notifications.create({
        data: {
          user_id: agentId,
          title: "🎉 บัญชีของคุณอัปเกรดเป็น Verified PRO เรียบร้อยแล้ว!",
          content: "การชำระเงินของคุณได้รับการตรวจสอบแล้ว คุณสามารถลงประกาศได้ไม่จำกัดและรับสิทธิพิเศษดันประกาศฟรี 30 วัน",
          type: "package",
          is_read: false
        }
      }).catch(err => console.error("Notification error:", err));
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    const err = error as Error;
    console.error("PATCH Admin Payments Error:", err);
    return NextResponse.json({ error: "อัปเดตการชำระเงินล้มเหลว: " + err.message }, { status: 500 });
  }
}
