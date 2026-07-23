import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
    const { firstName, lastName, phone, lineId, emailNotification, smsNotification, newPassword } = body;

    const updateData: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      line_id?: string;
      password_hash?: string;
    } = {};

    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (lineId !== undefined) updateData.line_id = lineId;

    if (newPassword && newPassword.trim() !== "") {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
      }
      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    const targetUser = await db.users.findFirst({
      where: userId ? { id: userId } : { email: userEmail || "" },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
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
