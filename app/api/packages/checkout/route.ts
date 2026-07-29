import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

interface SessionUser {
  user?: {
    id?: string;
    email?: string;
  };
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await req.json();
    const { slipUrl, packageId = 1, amount = 599 } = body;

    if (!slipUrl) {
      return NextResponse.json({ error: "กรุณาแนบรูปภาพสลิปการโอนเงิน" }, { status: 400 });
    }

    // 1. สร้าง order ใน listing_package_orders
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30); // 30 วัน

    const order = await db.listing_package_orders.create({
      data: {
        package_id: parseInt(packageId),
        start_date: startDate,
        end_date: endDate,
        status: "pending"
      }
    });

    // 2. บันทึก transaction ชำระเงินใน payment_transactions
    const transaction = await db.payment_transactions.create({
      data: {
        order_id: order.id,
        amount: parseFloat(amount),
        payment_method: "PromptPay",
        slip_url: slipUrl,
        status: "pending"
      }
    });

    // 3. ส่งการแจ้งเตือนไปยังแอดมินทั้งหมด
    const admins = await db.users.findMany({ where: { role_id: "admin" }, select: { id: true } });
    const agentName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "นายหน้า";

    for (const admin of admins) {
      await db.notifications.create({
        data: {
          user_id: admin.id,
          title: "💳 แจ้งชำระเงินแพ็กเกจ PRO ใหม่",
          content: `${agentName} ได้แนบสลิปโอนเงิน ฿${amount} สำหรับสมัคร Verified PRO`,
          type: "payment",
          is_read: false
        }
      }).catch(err => console.error("Notification error:", err));
    }

    return NextResponse.json({ success: true, data: transaction });
  } catch (error) {
    const err = error as Error;
    console.error("Package Checkout Error:", err);
    return NextResponse.json({ error: "ส่งหลักฐานการชำระเงินล้มเหลว: " + err.message }, { status: 500 });
  }
}
