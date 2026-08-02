'use client';

import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AdminTopBar() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;

  // แสดงเฉพาะเมื่อล็อกอินบัญชีที่มี Role เป็น admin เท่านั้น
  if (userRole !== 'admin') return null;

  return (
    <div className="bg-slate-900 text-white text-xs py-1.5 px-4 sm:px-6 lg:px-8 fixed top-0 w-full z-[60] border-b border-slate-800 font-sans shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>โหมดแอดมิน</span>
        </div>
        <Link
          href="/admin/dashboard"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1 rounded-md text-[10px] transition cursor-pointer active:scale-95"
        >
          กลับแดชบอร์ด
        </Link>
      </div>
    </div>
  );
}
