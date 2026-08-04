// POST /api/properties/[id]/view -> นับยอดเข้าชมหน้ารายละเอียดประกาศ (สาธารณะ ไม่ต้องล็อกอิน)
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await db.properties.update({
      where: { id },
      data: { views_count: { increment: 1 } }
    });

    return NextResponse.json({ success: true });
  } catch {
    // ไม่ต้องแจ้ง error กลับไปที่ผู้ใช้ เพราะการนับวิวไม่ใช่การทำงานหลักของหน้า
    return NextResponse.json({ success: false });
  }
}
