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

// GET: ดึงรายการแจ้งเตือนของผู้ใช้ที่ล็อกอินอยู่
export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const notifications = await db.notifications.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 20
    });

    const unreadCount = await db.notifications.count({
      where: { user_id: user.id, is_read: false }
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        isRead: Boolean(n.is_read),
        type: n.type || "info",
        linkUrl: n.link_url || null,
        createdAt: n.created_at
      }))
    });
  } catch (error) {
    const err = error as Error;
    console.error("GET Notifications Error:", err);
    return NextResponse.json({ error: "ดึงข้อมูลการแจ้งเตือนล้มเหลว: " + err.message }, { status: 500 });
  }
}

// PATCH: ทำเครื่องหมายอ่านแล้ว (Mark as read)
export async function PATCH(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, markAll } = body;

    if (markAll) {
      await db.notifications.updateMany({
        where: { user_id: user.id, is_read: false },
        data: { is_read: true }
      });
      return NextResponse.json({ success: true, message: "อ่านการแจ้งเตือนทั้งหมดแล้ว" });
    }

    if (notificationId) {
      await db.notifications.updateMany({
        where: { id: notificationId, user_id: user.id },
        data: { is_read: true }
      });
      return NextResponse.json({ success: true, message: "อ่านการแจ้งเตือนสำเร็จ" });
    }

    return NextResponse.json({ error: "กรุณาระบุ notificationId หรือ markAll" }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    console.error("PATCH Notifications Error:", err);
    return NextResponse.json({ error: "อัปเดตการแจ้งเตือนล้มเหลว: " + err.message }, { status: 500 });
  }
}

// DELETE: ลบการแจ้งเตือน (ทีละอัน หรือลบทั้งหมดของผู้ใช้ที่ล็อกอินอยู่)
export async function DELETE(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { notificationId, deleteAll } = body;

    if (deleteAll) {
      await db.notifications.deleteMany({
        where: { user_id: user.id }
      });
      return NextResponse.json({ success: true, message: "ลบการแจ้งเตือนทั้งหมดแล้ว" });
    }

    if (notificationId) {
      await db.notifications.deleteMany({
        where: { id: notificationId, user_id: user.id }
      });
      return NextResponse.json({ success: true, message: "ลบการแจ้งเตือนสำเร็จ" });
    }

    return NextResponse.json({ error: "กรุณาระบุ notificationId หรือ deleteAll" }, { status: 400 });
  } catch (error) {
    const err = error as Error;
    console.error("DELETE Notifications Error:", err);
    return NextResponse.json({ error: "ลบการแจ้งเตือนล้มเหลว: " + err.message }, { status: 500 });
  }
}
