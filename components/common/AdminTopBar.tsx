'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react'; // ใช้ตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์ admin หรือไม่
import { usePathname } from 'next/navigation'; // ใช้เช็คว่ากำลังอยู่ในหน้า /admin เพื่อซ่อนแถบนี้

export default function AdminTopBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  // ไม่แสดงถ้าไม่ใช่ admin หรือกำลังอยู่ในหน้า Admin Panel (/admin) อยู่แล้ว
  if (userRole !== 'admin' || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div className="bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8 fixed top-0 w-full z-[60] border-b border-slate-800 font-sans shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>โหมดแอดมิน (Admin View Mode)</span>
        </div>
        <Link
          href="/admin/dashboard"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1 rounded-md text-[10px] transition cursor-pointer active:scale-95 shadow"
        >
          กลับแดชบอร์ด ↗
        </Link>
      </div>
    </div>
  );
}
