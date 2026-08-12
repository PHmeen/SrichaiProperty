import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อระบุตัวผู้ใช้ที่เจ้าของโปรไฟล์
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับดึง/แก้ไขข้อมูลโปรไฟล์ผู้ใช้
import bcrypt from "bcryptjs"; // ตรวจสอบรหัสผ่านเดิมและเข้ารหัสรหัสผ่านใหม่ตอนเปลี่ยนรหัสผ่าน

/**
 * ==============================================================================
 * API Endpoint สำหรับจัดการข้อมูลส่วนตัวของผู้ใช้ (User Profile API Route)
 * /app/api/user/profile/route.ts
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET: ดึงข้อมูลโปรไฟล์ผู้ใช้งานที่ล็อกอินอยู่ (ชื่อ, เบอร์โทร, LINE ID, ประวัติเข้าสู่ระบบล่าสุด)
 * 2. PUT: อัปเดตข้อมูลส่วนตัว และ เปลี่ยนรหัสผ่านใหม่ (พร้อมตรวจสอบรหัสผ่านเดิมด้วย bcrypt)
 * ==============================================================================
 */

// ฟังก์ชันช่วยดึงและตรวจสอบเซสชันผู้ใช้งาน
async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: NextResponse.json({ error: "กรุณาล็อกอินก่อนใช้งาน" }, { status: 401 }) };
  const userId = (session.user as { id?: string }).id;
  const userEmail = session.user.email;
  return { userId, userEmail };
}

// ------------------------------------------------------------------------------
// 1. GET: ดึงข้อมูลโปรไฟล์ผู้ใช้งานที่ล็อกอินอยู่
// ------------------------------------------------------------------------------
export async function GET() {
  try {
    const { userId, userEmail, error } = await getAuthUser();
    if (error) return error;

    // ค้นหาข้อมูลผู้ใช้ในตาราง users พร้อมประวัติการเข้าสู่ระบบล่าสุด 1 รายการ
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
        plan_type: true,
        plan_expired_at: true,
        created_at: true,
        login_histories: {
          take: 1,
          orderBy: { created_at: "desc" },
          select: { user_agent: true, ip_address: true, created_at: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบข้อมูลผู้ใช้งาน" }, { status: 404 });
    }

    // คำนวณสถานะแพ็กเกจ Pro
    const isPro = Boolean(
      user.plan_type && user.plan_type !== "basic" && (!user.plan_expired_at || new Date(user.plan_expired_at) > new Date())
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
        isPro,
        lastLogin: user.login_histories[0] || null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + (err as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// 2. PUT: อัปเดตข้อมูลส่วนตัว / เปลี่ยนรหัสผ่านใหม่
// ------------------------------------------------------------------------------
export async function PUT(request: Request) {
  try {
    const { userId, userEmail, error } = await getAuthUser();
    if (error) return error;

    const body = await request.json();
    const { firstName, lastName, phone, lineId, newPassword, currentPassword } = body;

    // 2.1 ตรวจสอบความถูกต้องของข้อมูล (Validation)
    if (firstName !== undefined && (!firstName || firstName.trim().length === 0 || firstName.trim().length > 100)) {
      return NextResponse.json({ error: "กรุณากรอกชื่อจริงให้ถูกต้อง (ไม่เกิน 100 ตัวอักษร)" }, { status: 400 });
    }
    if (lastName !== undefined && (!lastName || lastName.trim().length === 0 || lastName.trim().length > 100)) {
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

    // 2.2 ค้นหาข้อมูลผู้ใช้ในตารางฐานข้อมูล
    const targetUser = await db.users.findFirst({
      where: userId ? { id: userId } : { email: userEmail || "" },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    // 2.3 ตรวจสอบและเปรียบเทียบรหัสผ่านด้วย bcrypt กรณีมีการร้องขอเปลี่ยนรหัสผ่านใหม่
    const updateData: Record<string, string> = {};
    if (firstName !== undefined) updateData.first_name = firstName.trim();
    if (lastName !== undefined) updateData.last_name = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (lineId !== undefined) updateData.line_id = lineId.trim();

    if (newPassword && newPassword.trim() !== "") {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
      }

      if (targetUser.password_hash) {
        if (!currentPassword) {
          return NextResponse.json({ error: "กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน" }, { status: 400 });
        }
        const isValid = await bcrypt.compare(currentPassword, targetUser.password_hash);
        if (!isValid) {
          return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
        }
      }

      updateData.password_hash = await bcrypt.hash(newPassword, 10);
    }

    // 2.4 อัปเดตข้อมูลลงฐานข้อมูล PostgreSQL
    const updatedUser = await db.users.update({
      where: { id: targetUser.id },
      data: updateData,
      select: { id: true, email: true, first_name: true, last_name: true, phone: true, line_id: true },
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
  } catch (err) {
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล: " + (err as Error).message }, { status: 500 });
  }
}
