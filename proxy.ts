import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// โค้ดดักกรองความปลอดภัยและการจัดการสิทธิ์การเข้าถึงหน้าเว็บ (Proxy)
export default async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const url = request.nextUrl.clone();
  
  const isLoggedIn = !!token;
  const userRole = (token?.role as string) || 'buyer'; // 'buyer', 'agent', 'admin'

  // 1. ป้องกันหน้าของนายหน้า (Agent Pages)
  if (url.pathname.startsWith('/agent') || url.pathname.includes('/agent/')) {
    if (!isLoggedIn) {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    
    if (userRole !== 'agent') {
      url.pathname = '/home'; // หากไม่ใช่ Agent ดีดกลับไปหน้าหลัก
      return NextResponse.redirect(url);
    }
  }

  // 2. ป้องกันหน้าของแอดมิน (Admin Pages & APIs)
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
    if (!isLoggedIn || userRole !== 'admin') {
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: "Unauthorized: Admins only" }, { status: 401 });
      }
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// กำหนดเส้นทางที่จะรัน middleware ตัวนี้ (คุ้มครองทั้งหน้าแอดมิน นายหน้า และ API)
export const config = {
  matcher: ['/agent/:path*', '/admin/:path*', '/api/admin/:path*'],
};
