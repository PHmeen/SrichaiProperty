import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// ============================================================================
// ไฟล์นี้คือ "Middleware" ของ Next.js (ในโปรเจกต์นี้ถูก export เป็นชื่อ proxy)
// หน้าที่หลัก: ทำงานสกัดกั้นทุก request ที่เข้ามา "ก่อน" ที่จะไปถึงหน้าเว็บ/หน้า API จริง
// เพื่อตรวจสอบว่า "ใครเป็นคนเรียก" (login หรือยัง) และ "มีสิทธิ์" เข้าหน้านั้นหรือไม่
// ถ้าไม่มีสิทธิ์ก็จะ redirect ไปหน้าอื่น หรือตอบ error กลับไปแทน
// ============================================================================
export default async function proxy(request: NextRequest) {
  // ดึงข้อมูล session/token ของผู้ใช้จากคุกกี้ (next-auth เป็นคนเข้ารหัส/ถอดรหัสให้)
  // ถ้าไม่ได้ login มา token จะเป็น null
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // clone() เพื่อให้แก้ไข pathname ได้โดยไม่กระทบ URL ต้นฉบับของ request
  const url = request.nextUrl.clone();

  // แปลง token ให้เป็น boolean: มี token = login แล้ว, ไม่มี = ยังไม่ login
  const isLoggedIn = !!token;

  // ดึง role ของผู้ใช้จาก token ถ้าไม่มีให้ถือว่าเป็น 'customer' (สิทธิ์ต่ำสุด)
  // ระบบมี 3 role: 'customer' (ลูกค้าทั่วไป), 'agent' (นายหน้า), 'admin' (ผู้ดูแลระบบ)
  const userRole = (token?.role as string) || 'customer';

  // ---------------------------------------------------------------------
  // 1. ป้องกันหน้าของนายหน้า (Agent Pages) — เส้นทางที่ขึ้นต้นด้วย /agent
  // ---------------------------------------------------------------------
  if (url.pathname.startsWith('/agent')) {
    // 1.1 ยังไม่ login เลย -> เด้งไปหน้า login ก่อน
    if (!isLoggedIn) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // 1.2 login แล้วแต่ role ไม่ใช่ agent และไม่ใช่ admin (เช่นเป็น customer)
    // -> ไม่มีสิทธิ์เข้าเขตนายหน้า ให้เด้งกลับหน้าแรก
    if (userRole !== 'agent' && userRole !== 'admin') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // 1.3 กรณีเป็น agent แต่บัญชียังไม่ได้รับอนุมัติจากแอดมิน
    // (status เริ่มต้นคือ 'pending' รอตรวจสอบ, หรืออาจถูกระงับ/แบน)
    // -> ห้ามเข้าแผงควบคุมนายหน้า ให้เด้งกลับไปหน้า login
    // หมายเหตุ: เงื่อนไขนี้เช็คเฉพาะกรณี role === 'agent' เท่านั้น
    // (ถ้าเป็น admin จะข้ามการเช็ค status นี้ไปเลย เพราะ admin เข้าได้เสมอ)
    const userStatus = (token?.status as string) || 'pending';
    if (userRole === 'agent' && userStatus !== 'approved') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  // ---------------------------------------------------------------------
  // อนุญาตให้เข้าหน้า /admin/login ได้เสมอ โดยไม่ต้องผ่านการตรวจสอบสิทธิ์แอดมิน
  // (เพราะถ้าไปเช็คสิทธิ์แอดมินก่อน คนที่ยังไม่ login ก็จะเข้าหน้า login เองไม่ได้)
  // ---------------------------------------------------------------------
  if (url.pathname === '/admin/login') {
    return NextResponse.next(); // ปล่อยผ่านไปตามปกติ ไม่สกัดกั้น
  }

  // ---------------------------------------------------------------------
  // 2. ป้องกันหน้าของแอดมิน (Admin Pages & APIs)
  // ครอบคลุมทั้งหน้าเว็บ /admin/* และ API /api/admin/*
  // ---------------------------------------------------------------------
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    // ต้อง login และต้องเป็น role admin เท่านั้น ถึงจะผ่านได้
    if (!isLoggedIn || userRole !== 'admin') {
      // ถ้าเป็นการเรียก API (/api/admin/...) ให้ตอบกลับเป็น JSON error
      // แทนการ redirect เพราะฝั่งเรียก API มักเป็นโค้ด (fetch/axios) ไม่ใช่ browser ที่ต้องเปลี่ยนหน้า
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 401 });
      }
      // ถ้าเป็นการเข้าหน้าเว็บตรงๆ ให้ redirect ไปหน้า login ของแอดมิน
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // ผ่านทุกเงื่อนไขแล้ว (ไม่เข้าเงื่อนไขใดๆ ข้างบน หรือมีสิทธิ์ครบถ้วน) -> ให้ request ไปต่อได้ตามปกติ
  return NextResponse.next();
}

// ============================================================================
// config.matcher บอก Next.js ว่า middleware ตัวนี้จะทำงาน "เฉพาะ" เส้นทางไหนบ้าง
// (ถ้าไม่ตรงกับ pattern เหล่านี้ middleware จะไม่ถูกเรียกเลย ช่วยลด overhead)
// - '/agent/:path*'     -> ทุกหน้าใต้ /agent เช่น /agent/dashboard, /agent/listings
// - '/admin/:path*'     -> ทุกหน้าใต้ /admin เช่น /admin/users, /admin/login
// - '/api/admin/:path*' -> ทุก API endpoint ใต้ /api/admin
// ============================================================================
export const config = {
  matcher: ['/agent/:path*', '/admin/:path*', '/api/admin/:path*'],
};
