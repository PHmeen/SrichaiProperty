import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { notifyUser, notifyUsers } from "@/lib/notify";
import fs from "fs";
import path from "path";

async function getUser(email: string) {
  return db.users.findUnique({ where: { email } });
}

// GET: ตรวจสอบสถานะแพ็กเกจ
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  const isPro = Boolean(
    user.plan_type && 
    user.plan_type !== "basic" && 
    (!user.plan_expired_at || new Date(user.plan_expired_at) > new Date())
  );
  return NextResponse.json({ planType: user.plan_type ?? "basic", planExpiredAt: user.plan_expired_at, isPro });
}

// POST: รับไฟล์สลิป (multipart/form-data) แล้วบันทึกลง DB
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getUser(session.user.email);
  if (!user) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (user.role_id !== "agent") return NextResponse.json({ error: "เฉพาะนายหน้าเท่านั้น" }, { status: 403 });

  try {
    // รับไฟล์สลิปจาก FormData
    const formData = await req.formData();
    const slipFile = formData.get("slip") as File | null;
    if (!slipFile || typeof slipFile === "string") {
      return NextResponse.json({ error: "กรุณาแนบไฟล์รูปภาพสลิป" }, { status: 400 });
    }
    if (!slipFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)" }, { status: 400 });
    }
    if (slipFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "ไฟล์ต้องมีขนาดไม่เกิน 5MB" }, { status: 400 });
    }

    // บันทึกไฟล์ลง public/uploads/
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const filename = `slip_${user.id.substring(0, 8)}_${Date.now()}${path.extname(slipFile.name) || ".png"}`;
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(await slipFile.arrayBuffer()));
    const slipUrl = `/uploads/${filename}`;

    // สร้าง order + transaction
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const order = await db.listing_package_orders.create({
      data: { package_id: 1, start_date: new Date(), end_date: endDate, status: "pending" }
    });
    const transaction = await db.payment_transactions.create({
      data: { order_id: order.id, amount: 599, payment_method: "PromptPay", slip_url: slipUrl, status: "pending" }
    });

    // แจ้งเตือน admin + agent
    const agentName = `${user.first_name} ${user.last_name}`.trim();
    const admins = await db.users.findMany({ where: { role_id: "admin" }, select: { id: true } });

    await Promise.allSettled([
      notifyUsers(admins.map(admin => admin.id), {
        title: "💳 แจ้งชำระเงิน PRO ใหม่",
        content: `txId:${transaction.id} agentId:${user.id} name:${agentName} email:${user.email} amount:599`,
        type: "payment"
      }),
      notifyUser({
        userId: user.id,
        title: "✅ ส่งสลิปเรียบร้อย",
        content: "ทีมงานได้รับสลิปแล้ว จะยืนยันและเปิด Verified PRO ภายใน 1 วันทำการ",
        type: "payment"
      })
    ]);

    return NextResponse.json({ success: true, orderId: order.id, transactionId: transaction.id });
  } catch (error) {
    const err = error as Error;
    console.error("Checkout Error:", err.message);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด: " + err.message }, { status: 500 });
  }
}
