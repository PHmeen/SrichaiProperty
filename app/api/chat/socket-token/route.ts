import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import jwt from 'jsonwebtoken';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

// GET: ออกโทเค็นอายุสั้นสำหรับยืนยันตัวตนตอนเชื่อมต่อ Socket.io
// เซ็นด้วยคีย์เดียวกับ NextAuth (NEXTAUTH_SECRET) เพื่อให้ socket-server.js ตรวจสอบได้
// โดยไม่ต้องแชร์ session cookie ข้ามโดเมน/พอร์ต
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อน' }, { status: 401 });
  }

  const user = await db.users.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: 'ไม่พบผู้ใช้ในระบบ' }, { status: 404 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ระบบยังไม่ได้ตั้งค่า NEXTAUTH_SECRET' }, { status: 500 });
  }

  const token = jwt.sign({ sub: user.id }, secret, { expiresIn: '10m' });
  return NextResponse.json({ token });
}
