'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export default function AgentNavbar() {
  const { data: session } = useSession();

  const userFullName = session?.user?.name || "สมชาย นายหน้าดี";
  const userImage = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=1e40af&color=fff`;

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
            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold px-2 py-0.5 rounded uppercase">Agent Portal</span>
          </span>
        </Link>

        {/* Center / Right Links */}
        <div className="flex items-center gap-5">
          <Link href="/agent/home" className="text-xs font-bold text-slate-300 hover:text-amber-400 transition">
            🏠 หน้าหลักนายหน้า
          </Link>
          <Link href="/agent/add-property" className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl transition shadow-md active:scale-95">
            + ลงประกาศใหม่
          </Link>
          <Link href="/agent/home" className="relative text-xs font-bold text-slate-300 hover:text-amber-400 transition hidden sm:inline-block">
            💬 แชทลูกค้า
            <span className="ml-1 bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-extrabold">2</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src={userImage} alt="Profile" className="w-8 h-8 rounded-full border border-amber-500/40 object-cover" />
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-white leading-none">{userFullName}</p>
                <p className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">นายหน้าพรีเมียม</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login/agent' })}
              className="text-slate-400 hover:text-red-400 transition p-1 text-xs cursor-pointer"
              title="ออกจากระบบ"
            >
              🚪
            </button>
          </div>
        </div>

      </div>
    </nav>
  );
}
