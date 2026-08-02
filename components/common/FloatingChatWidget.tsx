'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function FloatingChatWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // ซ่อนปุ่มลอยเมื่อเปิดอยู่ที่หน้าแชทหลักแล้ว
  if (pathname === '/chat' || pathname === '/agent/chat') return null;

  const userRole = (session?.user as { role?: string })?.role;
  const targetChatUrl = userRole === 'agent' ? '/agent/chat' : '/chat';

  return (
    <Link
      href={session ? targetChatUrl : '/login'}
      className="fixed bottom-6 right-6 z-[999] w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/40 cursor-pointer group"
      title="เปิดกล่องข้อความแชท"
      aria-label="เปิดกล่องข้อความแชท"
    >
      <span className="transition-transform group-hover:scale-110">💬</span>
      {/* จุดแสดงสถานะมีข้อความ/ออนไลน์ */}
      <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
    </Link>
  );
}
