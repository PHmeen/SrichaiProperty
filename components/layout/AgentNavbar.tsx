'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import NotificationBell from '@/components/common/NotificationBell';

export default function AgentNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const userFullName = session?.user?.name || "สมชาย นายหน้าดี";
  const userImage = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=1e40af&color=fff`;

  /**
   * สร้าง class ของเมนูตามหน้าที่กำลังเปิดอยู่
   * - ปกติ      : ตัวอักษรสีเทาอ่อน ไม่มีพื้นหลัง
   * - hover     : พื้นหลังส้มอ่อนๆ ตัวอักษรยังสีเดิม (บอกว่า "กำลังจะเลือกอันนี้")
   * - หน้าปัจจุบัน : พื้นหลังส้มเข้มทึบ ตัวอักษรสีดำ (บอกว่า "ตอนนี้อยู่หน้านี้")
   */
  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    const base = "text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-150";

    if (isActive) {
      return `${base} bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20`;
    }
    return `${base} text-slate-300 hover:bg-amber-500/15 active:bg-amber-500/25`;
  };

  return (
    <nav className="fixed w-full z-50 top-0 bg-[#090D16] border-b border-slate-800 text-white shadow-lg h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">

        {/* Brand Logo */}
        <Link href="/agent/home" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
            S
          </div>
          <span className="text-lg font-black tracking-tight text-white">
            Srichai<span className="text-amber-500">Agent</span>
            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold px-2 py-0.5 rounded uppercase hidden lg:inline-block">Agent Portal</span>
          </span>
        </Link>

        {/* Center / Right Links */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/agent/home" className={navLinkClass('/agent/home')}>
            🏠 <span className="hidden md:inline">หน้าหลักนายหน้า</span>
          </Link>

          <Link href="/agent/dashboard" className={navLinkClass('/agent/dashboard')}>
            🏘️ <span className="hidden md:inline">จัดการบ้านของฉัน</span>
          </Link>

          <Link href="/agent/appointments" className={navLinkClass('/agent/appointments')}>
            📋 <span className="hidden md:inline">จัดการคิวนัดหมาย</span>
          </Link>
          {/* ปุ่มลงประกาศใหม่ (CTA หลัก) */}
          <Link
            href="/agent/add-property"
            className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all duration-150 shadow-md active:scale-95 ml-1 ${
              pathname === '/agent/add-property'
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/50'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            + <span className="hidden sm:inline">ลงประกาศใหม่</span>
          </Link>

          <div className="h-6 w-px bg-slate-800 hidden sm:block mx-1" />

          {/* Notifications, Profile & Logout */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <Image
                src={userImage}
                alt="Profile"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border border-amber-500/40 object-cover"
                unoptimized
              />
              <div className="text-left hidden xl:block">
                <p className="text-xs font-bold text-white leading-none">{userFullName}</p>
                <p className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">นายหน้าพรีเมียม</p>
              </div>
            </div>

            {/* ปุ่มออกจากระบบ - ขนาดใหญ่ขึ้นและใช้สีแดงให้เห็นชัด */}
            <button
              onClick={() => {
                if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
                  signOut({ callbackUrl: '/login/agent' });
                }
              }}
              className="flex items-center gap-1.5 bg-red-500/15 hover:bg-red-500 border border-red-500/40 hover:border-red-500 text-red-400 hover:text-white font-bold text-xs px-3 py-2 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className="hidden lg:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}