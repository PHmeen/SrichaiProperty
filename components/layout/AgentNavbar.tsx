'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import NotificationBell from '@/components/common/NotificationBell';
import {
  Home,
  Building2,
  Calendar,
  CalendarDays,
  MessageSquare,
  Plus,
  LogOut,
  Menu,
  X
} from 'lucide-react';

export default function AgentNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const userFullName = session?.user?.name || "สมชาย นายหน้าดี";
  const userImage = session?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userFullName)}&background=1e40af&color=fff`;

  // ดึงจำนวนแชทรอตอบ / แชทยังไม่ได้อ่าน
  useEffect(() => {
    if (session?.user) {
      fetch('/api/chat/sessions')
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.sessions)) {
            const totalUnread = data.sessions.reduce(
              (sum: number, s: { unreadCount?: number }) => sum + (s.unreadCount || 0),
              0
            );
            setUnreadChatCount(totalUnread);
          }
        })
        .catch(() => {});
    }
  }, [session?.user, pathname]);

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || pathname.startsWith(href + '/');
    const base = "text-xs font-bold px-3 py-1.5 rounded-xl transition-all duration-150 relative";

    if (isActive) {
      return `${base} bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20`;
    }
    return `${base} text-slate-300 hover:bg-amber-500/15 active:bg-amber-500/25`;
  };

  const navLinks = [
    {
      href: '/agent/home',
      label: 'หน้าหลัก',
      icon: <Home className="w-4 h-4 shrink-0" />
    },
    {
      href: '/agent/dashboard',
      label: 'จัดการบ้าน',
      icon: <Building2 className="w-4 h-4 shrink-0" />
    },
    {
      href: '/agent/appointments',
      label: 'คิวนัดหมาย',
      icon: <Calendar className="w-4 h-4 shrink-0" />
    },
    {
      href: '/agent/schedule',
      label: 'ตารางวันว่าง',
      icon: <CalendarDays className="w-4 h-4 shrink-0" />
    },
    {
      href: '/agent/chat',
      label: 'แชทลูกค้า',
      icon: <MessageSquare className="w-4 h-4 shrink-0" />,
      badge: unreadChatCount
    }
  ];

  return (
    <nav className="w-full shrink-0 bg-[#090D16] border-b border-slate-800 text-white shadow-lg relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand Logo */}
        <Link href="/agent/home" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-md">
            S
          </div>
          <span className="text-lg font-black tracking-tight text-white">
            Srichai<span className="text-amber-500">Agent</span>
            <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-extrabold px-2 py-0.5 rounded uppercase hidden xl:inline-block">Agent Portal</span>
          </span>
        </Link>

        {/* Desktop Links (>= lg) */}
        <div className="hidden lg:flex items-center gap-1.5 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link key={link.href} href={link.href} className={`${navLinkClass(link.href)} inline-flex items-center gap-1.5`}>
                {link.icon}
                <span>{link.label}</span>
                {Boolean(link.badge && link.badge > 0) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-red-500 text-white shadow-xs'
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* ปุ่มลงประกาศใหม่ (CTA หลัก) */}
          <Link
            href="/agent/add-property"
            className={`text-xs font-black px-3.5 py-1.5 rounded-xl transition-all duration-150 shadow-md active:scale-95 ml-1 inline-flex items-center gap-1.5 ${
              pathname === '/agent/add-property'
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/50'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>ลงประกาศใหม่</span>
          </Link>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Notifications, Profile & Logout */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link 
              href="/agent/profile" 
              title="จัดการโปรไฟล์ของฉัน"
              className="flex items-center gap-2 hover:opacity-80 transition cursor-pointer group"
            >
              <Image
                src={userImage}
                alt="Profile"
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border border-amber-500/40 object-cover group-hover:border-amber-400 transition"
                unoptimized
              />
              <div className="text-left hidden xl:block">
                <p className="text-xs font-bold text-white leading-none group-hover:text-amber-400 transition">{userFullName}</p>
                <p className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">นายหน้าพรีเมียม</p>
              </div>
            </Link>

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
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ออก</span>
            </button>
          </div>
        </div>

        {/* Mobile Header Actions (< lg) */}
        <div className="flex items-center gap-2 lg:hidden">
          <NotificationBell />

          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="เปิด/ปิดเมนูนายหน้า"
          >
            {isMobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileOpen && (
        <div className="lg:hidden bg-[#0c121e] border-t border-slate-800/80 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* User Card */}
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src={userImage}
                alt="Profile"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full border border-amber-500/50 object-cover"
                unoptimized
              />
              <div>
                <p className="text-xs font-bold text-white">{userFullName}</p>
                <p className="text-[10px] text-amber-400 font-bold uppercase mt-0.5">นายหน้าพรีเมียม</p>
              </div>
            </div>
            <Link
              href="/agent/profile"
              onClick={() => setIsMobileOpen(false)}
              className="text-[11px] bg-slate-800 text-amber-300 font-bold px-3 py-1.5 rounded-lg hover:bg-slate-700 transition"
            >
              โปรไฟล์
            </Link>
          </div>

          {/* Quick CTA */}
          <Link
            href="/agent/add-property"
            onClick={() => setIsMobileOpen(false)}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition"
          >
            <Plus className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span>ลงประกาศอสังหาฯ ใหม่</span>
          </Link>

          {/* Navigation Items */}
          <div className="space-y-1 pt-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {link.icon}
                    <span>{link.label}</span>
                  </div>
                  {Boolean(link.badge && link.badge > 0) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500 text-white shadow-xs">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-2">
            <button
              onClick={() => {
                setIsMobileOpen(false);
                if (confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
                  signOut({ callbackUrl: '/login/agent' });
                }
              }}
              className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}