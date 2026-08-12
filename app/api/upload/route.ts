import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; // ดึงเซสชันเพื่อดูว่าผู้อัปโหลดล็อกอินอยู่หรือไม่ (ใช้กำหนดโควตา)
import fs from 'fs'; // บันทึกไฟล์ที่อัปโหลดลงดิสก์
import path from 'path'; // จัดการเส้นทางไฟล์ที่บันทึก
import { authOptions } from '@/lib/authOptions'; // ค่าคอนฟิก NextAuth ส่งให้ getServerSession
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'; // จำกัดอัตราการอัปโหลดกันการยิงถล่ม (DoS)

// ประเภทไฟล์ที่อนุญาต (รวมรูปภาพและเอกสาร PDF)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    // อนุญาตให้อัปโหลดไฟล์รูปภาพ/เอกสารได้โดยไม่ต้องเข้าสู่ระบบก่อน (สำหรับหน้าสมัครนายหน้า/ยื่นเอกสาร KYC)
    // แต่จำกัดอัตราการอัปโหลดกันการยิงถล่ม (DoS) เนื่องจาก endpoint นี้เปิดสาธารณะ
    // ผู้ใช้ที่ล็อกอินแล้ว (เช่น แนบไฟล์ในแชท) ได้โควตาสูงกว่าผู้ใช้ที่ไม่ได้ล็อกอิน
    const session = await getServerSession(authOptions);
    const rateLimitKey = session?.user?.email ? `user:${session.user.email}` : `ip:${getClientIp(request)}`;
    const limit = session?.user?.email ? 30 : 10;

    if (!checkRateLimit(rateLimitKey, limit, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'คุณอัปโหลดไฟล์บ่อยเกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    //  ตรวจสอบประเภทไฟล์
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP, GIF) หรือเอกสาร PDF เท่านั้น' },
        { status: 400 }
      );
    }

    //  ตรวจสอบขนาดไฟล์
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ต้องไม่เกิน 5MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    //  ตั้งชื่อไฟล์ปลอดภัย — ไม่ใช้ชื่อไฟล์เดิมจาก client
    const ext = file.type === 'image/jpeg' ? '.jpg'
      : file.type === 'image/png' ? '.png'
      : file.type === 'image/webp' ? '.webp'
      : file.type === 'application/pdf' ? '.pdf'
      : '.gif';
    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 10)}${ext}`;

    // ตรวจสอบโฟลเดอร์ปลายทาง
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // เขียนไฟล์ลงดิสก์
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    // ส่ง URL ของไฟล์กลับไป
    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error) {
    console.error('Error handling file upload:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
