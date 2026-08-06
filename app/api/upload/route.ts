import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import fs from 'fs';
import path from 'path';

// ประเภทไฟล์ที่อนุญาต
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    // 🔐 ตรวจสอบ Session ก่อน — ต้อง login ก่อนถึงอัปโหลดได้
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดไฟล์' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // ✅ ตรวจสอบประเภทไฟล์
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, WEBP, GIF) เท่านั้น' },
        { status: 400 }
      );
    }

    // ✅ ตรวจสอบขนาดไฟล์
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'ขนาดไฟล์ต้องไม่เกิน 5MB' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // ✅ ตั้งชื่อไฟล์ปลอดภัย — ไม่ใช้ชื่อไฟล์เดิมจาก client
    const ext = file.type === 'image/jpeg' ? '.jpg'
      : file.type === 'image/png' ? '.png'
      : file.type === 'image/webp' ? '.webp'
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
