/**
 * ==============================================================================
 * API Endpoint สำหรับเพิ่มยอดเข้าชมอสังหาริมทรัพย์ (Property View Counter API)
 * /app/api/properties/[id]/view/route.ts
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. นับจำนวนครั้งที่มีผู้เปิดเข้ามาดูหน้ารายละเอียดอสังหาริมทรัพย์ (views_count)
 * 2. ทำงานแบบสาธารณะ (Public Endpoint) ไม่จำเป็นต้องล็อกอินก่อนใช้งาน
 * 3. ใช้คำสั่ง Atomic Increment (`views_count: { increment: 1 }`) ของ Prisma เพื่อป้องกันปัญหา Race Condition
 * 4. หากเกิดข้อผิดพลาดในการนับยอดวิว จะคืนค่า `{ success: false }` แบบเงียบๆ (Silent Failure) 
 *    เพื่อไม่ให้กระทบกับการแสดงผลหลักของหน้ารายละเอียดบ้าน
 * ==============================================================================
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. ดึง ID ของอสังหาริมทรัพย์จาก URL Dynamic Route (รองรับ Next.js 15 Async Params)
    const { id } = await context.params;

    // 2. อัปเดตเพิ่มยอดเข้าชมแบบ Atomic Increment (+1) ในตาราง properties
    await db.properties.update({
      where: { id },
      data: { views_count: { increment: 1 } }
    });

    return NextResponse.json({ success: true });
  } catch {
    // ป้องกันการขัดจังหวะการทำงานหลักของหน้าเว็บ หากเกิด Error จะไม่แสดง Alert ใดๆ
    return NextResponse.json({ success: false });
  }
}
