'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // ใช้เช็คหน้าปัจจุบันเพื่อไฮไลต์เมนูที่กำลังเปิดอยู่
import { signOut } from 'next-auth/react'; // ใช้ออกจากระบบเมื่อกดปุ่มออกจากระบบในแถบเมนู

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [counts, setCounts] = useState({
    pending: 0,
    kyc: 0,
    reports: 0,
    payments: 0
  });

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setCounts({
            pending: data.pendingCount || 0,
            kyc: data.kycCount || 0,
            reports: data.reportsCount || 0,
            payments: data.paymentsCount || 0
          });
        }
      })
      .catch(err => console.error("Error loading sidebar counts:", err));
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile Toggle Floating Button */}
      <button 
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-5 left-5 z-[100] w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl border border-slate-700 active:scale-95 cursor-pointer"
        aria-label="สลับเมนูแอดมิน"
      >
        {isMobileOpen ? '✕' : '⚡'}
      </button>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[90]"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-[95] transition-transform duration-300 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Logo Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                SrichaiAdmin
              </h1>
              <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </span>
            </div>
          </div>

          <Link 
            href="/" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            🌐 เปิดดูหน้าเว็บไซต์จริง ↗
          </Link>

          <nav className="space-y-6 pt-3">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Overview</span>
              <Link
                href="/admin/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg font-bold transition-all text-left ${
                  isActive('/admin/dashboard') ? 'bg-slate-800 text-white shadow-inner' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                📊 แดชบอร์ดหลัก
              </Link>

              <Link
                href="/admin/analytics"
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg font-bold transition-all text-left ${
                  isActive('/admin/analytics') ? 'bg-slate-800 text-white shadow-inner' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                📈 สถิติ/รายงาน
              </Link>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Moderation (ตรวจสอบ)</span>
              
              <Link 
                href="/admin/moderation" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/moderation') ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">📝 ประกาศอสังหาฯ</span>
                {counts.pending > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {counts.pending}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/kyc" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/kyc') ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">🛡️ เอกสารยืนยันตัวตน (KYC)</span>
                {counts.kyc > 0 && (
                  <span className="bg-amber-500 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {counts.kyc}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/reports" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/reports') ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">⚠️ รายงานปัญหา (Reports)</span>
                {counts.reports > 0 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {counts.reports}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/payments" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/payments') ? 'bg-slate-800 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">💳 รายการชำระเงิน (PRO)</span>
                {counts.payments > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center">
                    {counts.payments}
                  </span>
                )}
              </Link>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Management</span>
              <Link 
                href="/admin/users" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/users') ? 'bg-slate-800 text-white font-bold shadow-inner' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                👥 ฐานข้อมูลผู้ใช้
              </Link>
            </div>
          </nav>
        </div>

        {/* User profile section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center shadow-inner">
              A
            </div>
            <div>
              <p className="text-white font-black text-xs">Admin Root</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Super Administrator</p>
            </div>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer" 
            title="ออกจากระบบ"
          >
            🚪
          </button>
        </div>
      </aside>
    </>
  );
}
