/**
 * ==============================================================================
 * API Endpoint สำหรับบริการข้อมูลทำเลที่ตั้ง (Locations API Route)
 * ==============================================================================
 * Path: GET /api/locations?type=provinces | amphures | districts
 * 
 * ภาพรวมการทำงาน:
 * 1. รับ HTTP GET Request จากหน้าบ้าน (เช่น SearchSidebar.tsx)
 * 2. อ่านค่าพารามิเตอร์ `type` จาก URL เพื่อระบุประเภทข้อมูลที่ต้องการ:
 *    - type=provinces -> ดึงรายชื่อจังหวัดทั้งหมดในประเทศ
 *    - type=amphures&provinceId=XX -> ดึงรายชื่ออำเภอเฉพาะในจังหวัดที่ระบุ
 *    - type=districts&amphureId=YY -> ดึงรายชื่อตำบลเฉพาะในอำเภอที่ระบุ
 * 3. ค้นหาข้อมูลจากฐานข้อมูลผ่าน Prisma ORM (`db`) และคืนค่าผลลัพธ์เป็น JSON Array
 * ==============================================================================
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  // อ่าน Query Parameters จาก URL ของ Request
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    // --------------------------------------------------------------------------
    // กรณีที่ 1: ขอรายชื่อ "จังหวัด" ทั้งหมดในระบบ
    // --------------------------------------------------------------------------
    if (type === 'provinces') {
      const list = await db.provinces.findMany({ 
        orderBy: { name_th: 'asc' } // เรียงลำดับชื่อจังหวัดตามตัวอักษร ก-ฮ
      });
      return NextResponse.json(list);
    }

    // --------------------------------------------------------------------------
    // กรณีที่ 2: ขอรายชื่อ "อำเภอ / เขต" (ต้องระบุ provinceId)
    // --------------------------------------------------------------------------
    if (type === 'amphures') {
      const provinceId = parseInt(searchParams.get('provinceId') || '0');
      // ถ้าไม่ได้ระบุ provinceId หรือระบุไม่ถูกต้อง คืนค่า Error HTTP 400 Bad Request
      if (!provinceId) {
        return NextResponse.json({ error: 'provinceId is required' }, { status: 400 });
      }
      
      // ค้นหาเฉพาะอำเภอที่มี province_id ตรงกับจังหวัดที่ส่งมา
      const list = await db.amphures.findMany({
        where: { province_id: provinceId },
        orderBy: { name_th: 'asc' }
      });
      return NextResponse.json(list);
    }

    // --------------------------------------------------------------------------
    // กรณีที่ 3: ขอรายชื่อ "ตำบล / แขวง" (ต้องระบุ amphureId)
    // --------------------------------------------------------------------------
    if (type === 'districts') {
      const amphureId = parseInt(searchParams.get('amphureId') || '0');
      // ถ้าไม่ได้ระบุ amphureId คืนค่า Error HTTP 400 Bad Request
      if (!amphureId) {
        return NextResponse.json({ error: 'amphureId is required' }, { status: 400 });
      }

      // ค้นหาเฉพาะตำบลที่มี amphure_id ตรงกับอำเภอที่ส่งมา
      const list = await db.districts.findMany({
        where: { amphure_id: amphureId },
        orderBy: { name_th: 'asc' }
      });
      return NextResponse.json(list);
    }

    // กรณีพารามิเตอร์ type ไม่ถูกต้อง หรือไม่ได้ส่งมา
    return NextResponse.json({ error: 'Invalid or missing type parameter' }, { status: 400 });

  } catch (error) {
    // จัดการข้อผิดพลาดที่เกิดขึ้นในเซิร์ฟเวอร์ และคืนค่า Error HTTP 500 Internal Server Error
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
