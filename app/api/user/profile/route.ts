import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/user/profile - ดึงข้อมูลโปรไฟล์ผู้ใช้งานที่ล็อกอินอยู่
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อนใช้งาน" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userEmail = session.user.email;

    const user = await db.users.findFirst({
      where: userId ? { id: userId } : { email: userEmail || "" },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        line_id: true,
        profile_image: true,
        role_id: true,
        is_verified: true,
        status: true,
        plan_type: true,
        plan_expired_at: true,
        created_at: true,
        login_histories: {
          take: 1,
          orderBy: { created_at: "desc" },
          select: {
            user_agent: true,
            ip_address: true,
            created_at: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, { status: 404 });
    }

    const isPro = Boolean(
      user.plan_type && 
      user.plan_type !== "basic" && 
      (!user.plan_expired_at || new Date(user.plan_expired_at) > new Date())
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone || "",
        lineId: user.line_id || "",
        profileImage: user.profile_image || "",
        role: user.role_id || "buyer",
        isVerified: user.is_verified || false,
        planType: user.plan_type || "basic",
        planExpiredAt: user.plan_expired_at || null,
        isPro: isPro,
        lastLogin: user.login_histories[0] || null,
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + err.message }, { status: 500 });
  }
}

// PUT /api/user/profile - อัปเดตข้อมูลส่วนตัว / เปลี่ยนรหัสผ่าน
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "กรุณาล็อกอินก่อนใช้งาน" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const userEmail = session.user.email;

    const body = await request.json();
    const { firstName, lastName, phone, lineId, newPassword, currentPassword } = body;

    // ตรวจสอบความถูกต้องของข้อมูลฝั่งเซิร์ฟเวอร์
    if (firstName !== undefined && (typeof firstName !== "string" || firstName.trim().length === 0 || firstName.trim().length > 100)) {
      return NextResponse.json({ error: "กรุณากรอกชื่อจริงให้ถูกต้อง (ไม่เกิน 100 ตัวอักษร)" }, { status: 400 });
    }
    if (lastName !== undefined && (typeof lastName !== "string" || lastName.trim().length === 0 || lastName.trim().length > 100)) {
      return NextResponse.json({ error: "กรุณากรอกนามสกุลให้ถูกต้อง (ไม่เกิน 100 ตัวอักษร)" }, { status: 400 });
    }
    if (phone !== undefined && phone !== "") {
      const phoneDigits = String(phone).replace(/\D/g, "");
      if (!/^0\d{8,9}$/.test(phoneDigits)) {
        return NextResponse.json({ error: "รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
      }
    }
    if (lineId !== undefined && typeof lineId === "string" && lineId.length > 100) {
      return NextResponse.json({ error: "LINE ID ยาวเกินไป" }, { status: 400 });
    }

    const updateData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      line_id?: string;
      password_hash?: string;
    } = {};

    if (firstName !== undefined) updateData.first_name = firstName.trim();
    if (lastName !== undefined) updateData.last_name = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (lineId !== undefined) updateData.line_id = lineId.trim();

    const targetUser = await db.users.findFirst({
      where: userId ? { id: userId } : { email: userEmail || "" },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    if (newPassword && newPassword.trim() !== "") {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
      }

      // ถ้าบัญชีนี้มีรหัสผ่านอยู่แล้ว ต้องยืนยันรหัสผ่านเดิมก่อนเปลี่ยน เพื่อป้องกันการยึด session แล้วเปลี่ยนรหัสผ่านแทนเจ้าของบัญชี
      if (targetUser.password_hash) {
        if (!currentPassword || typeof currentPassword !== "string") {
          return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน" }, { status: 400 });
        }
        const isValidCurrentPassword = await bcrypt.compare(currentPassword, targetUser.password_hash);
        if (!isValidCurrentPassword) {
          return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
        }
      }

      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await db.users.update({
      where: { id: targetUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        line_id: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "อัปเดตข้อมูลสำเร็จ",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        lineId: updatedUser.line_id,
      },
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล: " + err.message }, { status: 500 });
  }
}
