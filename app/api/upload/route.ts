import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // ตั้งชื่อไฟล์สุ่มด้วย Timestamp เพื่อเลี่ยงชื่อซ้ำ
    const ext = path.extname(file.name) || '.png';
    const filename = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    
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
