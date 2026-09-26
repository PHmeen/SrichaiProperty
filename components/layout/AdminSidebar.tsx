'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  BarChart3,
  FileCheck2,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  Users,
  ExternalLink,
  Menu,
  X,
  LogOut,
  Building2,
  Shield
} from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
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

  const adminName = session?.user?.name || (session?.user?.email ? session.user.email.split('@')[0] : 'Admin');
  const initial = adminName ? adminName.charAt(0).toUpperCase() : 'A';

  return (
    <>
      {/* Mobile Top Header Bar (< lg) */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-14 bg-[#0f172a] text-white border-b border-slate-800 px-4 flex items-center justify-between z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-blue-500/30">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm tracking-tight leading-none">
              SrichaiAdmin
            </h1>
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
              ระบบจัดการอสังหาฯ
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer"
          aria-label="สลับเมนูแอดมิน"
        >
          {isMobileOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

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
          {/* Logo Header & Mobile Close */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                  SrichaiAdmin
                </h1>
                <span className="text-[10px] text-slate-400 font-medium">
                  พอร์ทัลผู้ดูแลระบบ
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="ปิดเมนู"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Link 
            href="/" 
            className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all border border-slate-700/60 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span>เปิดหน้าเว็บไซต์หลัก</span>
          </Link>

          <nav className="space-y-6 pt-1 text-xs">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">ภาพรวม</span>
              <Link
                href="/admin/dashboard"
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-bold transition-all text-left ${
                  isActive('/admin/dashboard') ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 ${isActive('/admin/dashboard') ? 'text-white' : 'text-slate-400'}`} />
                <span>แดชบอร์ดหลัก</span>
              </Link>

              <Link
                href="/admin/analytics"
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-bold transition-all text-left ${
                  isActive('/admin/analytics') ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <BarChart3 className={`w-4 h-4 ${isActive('/admin/analytics') ? 'text-white' : 'text-slate-400'}`} />
                <span>สถิติและรายงาน</span>
              </Link>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">การตรวจสอบ (Moderation)</span>
              
              <Link 
                href="/admin/moderation" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/moderation') ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileCheck2 className={`w-4 h-4 ${isActive('/admin/moderation') ? 'text-white' : 'text-slate-400'}`} />
                  <span>ประกาศอสังหาฯ</span>
                </span>
                {counts.pending > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                    {counts.pending}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/kyc" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/kyc') ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className={`w-4 h-4 ${isActive('/admin/kyc') ? 'text-white' : 'text-slate-400'}`} />
                  <span>ยืนยันตัวตนนายหน้า (KYC)</span>
                </span>
                {counts.kyc > 0 && (
                  <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                    {counts.kyc}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/reports" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/reports') ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <AlertCircle className={`w-4 h-4 ${isActive('/admin/reports') ? 'text-white' : 'text-slate-400'}`} />
                  <span>รายงานปัญหา (Reports)</span>
                </span>
                {counts.reports > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                    {counts.reports}
                  </span>
                )}
              </Link>

              <Link 
                href="/admin/payments" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/payments') ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <CreditCard className={`w-4 h-4 ${isActive('/admin/payments') ? 'text-white' : 'text-slate-400'}`} />
                  <span>รายการชำระเงิน (PRO)</span>
                </span>
                {counts.payments > 0 && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center leading-none">
                    {counts.payments}
                  </span>
                )}
              </Link>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">การจัดการผู้ใช้งาน</span>
              <Link 
                href="/admin/users" 
                onClick={() => setIsMobileOpen(false)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left font-semibold ${
                  isActive('/admin/users') ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30' : 'hover:bg-slate-800/70 text-slate-300'
                }`}
              >
                <Users className={`w-4 h-4 ${isActive('/admin/users') ? 'text-white' : 'text-slate-400'}`} />
                <span>จัดการผู้ใช้งาน</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User profile section */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shadow-inner shrink-0 text-xs">
              {initial}
            </div>
            <div className="min-w-0 truncate">
              <p className="text-white font-bold text-xs truncate">{adminName}</p>
              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-blue-400 shrink-0" />
                <span>ผู้ดูแลระบบ</span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-slate-800 cursor-pointer shrink-0" 
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
}
