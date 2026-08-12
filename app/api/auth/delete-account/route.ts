import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // ดึงเซสชันเพื่อระบุตัวผู้ใช้ที่จะลบบัญชี
import { authOptions } from "@/lib/authOptions"; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { db } from "@/lib/db"; // ไคลเอนต์ Prisma สำหรับลบข้อมูลผู้ใช้ในฐานข้อมูล
import { Prisma } from "@prisma/client"; // ใช้ตรวจจับรหัสข้อผิดพลาด (เช่น P2003 กรณีมี foreign key ผูกอยู่)

/**
 * ==============================================================================
 * API Endpoint สำหรับลบบัญชีผู้ใช้งานถาวร (Delete Account API Route)
 * /app/api/auth/delete-account/route.ts
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. ตรวจสอบสิทธิ์ความปลอดภัยของผู้ใช้จาก NextAuth Session หลังบ้าน
 * 2. ลบข้อมูลบัญชีผู้ใช้งานออกจากฐานข้อมูล PostgreSQL ตามอีเมล
 * 3. ดักจับข้อผิดพลาด Foreign Key (P2003) กรณีผู้ใช้มีประวัติสัญญาซื้อขายที่ลบไม่ได้
 * ==============================================================================
 */
export async function DELETE() {
  try {
    // 1. ตรวจสอบเซสชันการล็อกอินของผู้ใช้ปัจจุบันจาก NextAuth
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    // ถ้ายังไม่ได้ล็อกอินหรือไม่มีอีเมลในเซสชัน ปฏิเสธคำขอทันที (401 Unauthorized)
    if (!userEmail) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการลบบัญชี" }, { status: 401 });
    }

    // 2. ทำการลบข้อมูลผู้ใช้งานออกจากฐานข้อมูล PostgreSQL ใน Query เดียว (ลบข้อมูลเชื่อมโยง Cascade ให้อัตโนมัติ)
    const result = await db.users.deleteMany({
      where: { email: userEmail }
    });

    // ถ้าไม่พบแถวที่ถูกลบ (count = 0) แสดงว่าไม่พบบัญชีนี้ในฐานข้อมูล (404 Not Found)
    if (result.count === 0) {
      return NextResponse.json({ error: "ไม่พบข้อมูลบัญชีผู้ใช้งานนี้ในระบบ" }, { status: 404 });
    }

    // 3. ส่งคำตอบกลับสำเร็จ (200 OK)
    return NextResponse.json({ success: true, message: "ลบบัญชีผู้ใช้งานของคุณเสร็จเรียบร้อยแล้ว" });

  } catch (error) {
    // ดักจับกรณีติด Foreign Key Constraint (P2003) เช่น มีประวัติสัญญาซื้อขายในระบบที่ถูกบล็อกไว้
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return NextResponse.json(
        { error: "ไม่สามารถลบบัญชีได้เนื่องจากมีประวัติสัญญาซื้อขายคงค้างในระบบ" },
        { status: 400 }
      );
    }

    console.error("Delete Account Error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ในการลบบัญชี" }, { status: 500 });
  }
}
