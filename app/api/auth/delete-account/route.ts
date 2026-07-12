import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";

// API Endpoint สำหรับให้ผู้ใช้ทำการลบบัญชีตนเองออกอย่างถาวร
export async function DELETE() {
  try {
    // 1. ดึงข้อมูลเซสชันของผู้ใช้ที่ล็อกอินอยู่ในขณะนี้ (ตรวจสอบความปลอดภัยหลังบ้าน)
    const session = await getServerSession();
    
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนดำเนินการลบบัญชี" },
        { status: 401 }
      );
    }

    const email = session.user.email;

    // 2. ค้นหาบัญชีผู้ใช้ในตารางฐานข้อมูล
    const user = await db.users.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลบัญชีผู้ใช้งานนี้ในระบบ" },
        { status: 404 }
      );
    }

    // 3. ทำการลบข้อมูลบัญชีผู้ใช้ออกอย่างถาวร (Cascade ลบข้อมูลเชื่อมโยงอื่น ๆ ใน Database)
    await db.users.delete({
      where: { id: user.id },
    });

    return NextResponse.json(
      { success: true, message: "ลบบัญชีผู้ใช้งานของคุณเสร็จเรียบร้อยแล้ว" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Account Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ในการลบบัญชี" },
      { status: 500 }
    );
  }
}
