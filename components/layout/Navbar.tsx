'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์แถบเมนูนำทางหลักบนสุดของเว็บไซต์ (Navbar Component)
 * /components/layout/Navbar.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงเมนูหลักสำหรับนำทางไปยังหน้าต่างๆ (หน้าแรก, ค้นหาอสังหาฯ, นายหน้า, นัดหมาย, รายการโปรด)
 * 2. จัดการสภาวะการเข้าสู่ระบบ (NextAuth Session):
 *    - เมื่อล็อกอิน: แสดงกระดิ่งแจ้งเตือน (`NotificationBell`), รูปโปรไฟล์ย่อ, ป้ายบทบาท, และปุ่มออกจากระบบ
 *    - เมื่อยังไม่ล็อกอิน: แสดงปุ่ม "เข้าสู่ระบบ" และ "สมัครสมาชิก"
 * 3. รองรับการแสดงผลทุกขนาดหน้าจอ (Responsive Navigation Header & Mobile Drawer Dropdown)
 * ==============================================================================
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import NotificationBell from "@/components/common/NotificationBell";

// รายการลิงก์เมนูหลักในระบบ (นำมาวนลูปแสดงผลทั้งบน Desktop และ Mobile เพื่อไม่ให้เขียนโค้ดซ้ำ)
const NAV_LINKS = [
  { path: "/", label: "หน้าแรก" },
  { path: "/search", label: "ค้นหาอสังหาฯ" },
  { path: "/agents", label: "นายหน้าของเรา" },
  { path: "/appointments", label: "ประวัติการนัดหมาย" },
  { path: "/saved-properties", label: "รายการโปรด" }
];

export default function Navbar() {
  // ดึงข้อมูลเซสชันจาก NextAuth เพื่อเช็คว่าล็อกอินอยู่หรือไม่
  const { data: session } = useSession();
  
  // สภาวะเปิด/ปิดเมนูบนจอมือถือ (Hamburger Drawer Menu)
  const [isOpen, setIsOpen] = useState(false);
  
  // ดึงเส้นทาง URL ปัจจุบันมาเช็คสีไฮไลต์เมนู
  const pathname = usePathname();

  // ฟังก์ชันตรวจสอบว่าลิงก์เมนูนี้ตรงกับหน้าปัจจุบันหรือไม่ (ใช้สำหรับไฮไลต์สีเมนู)
  const isActive = (path: string) => {
    if (path === "/" || path === "/home") {
      return pathname === "/" || pathname === "/home";
    }
    return pathname === path;
  };

  // ฟังก์ชันสร้างรูปโปรไฟล์ตัวอักษรย่อ (fallback avatar) กรณีผู้ใช้ไม่มีรูปถ่ายในระบบ
  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // ดึงข้อมูลส่วนตัวจากเซสชัน
  const userFullName = session?.user?.name || "ผู้ใช้งาน";
  const userRole = (session?.user as { role?: string })?.role;
  const rawImage = session?.user?.image;
  
  // ตรวจสอบความถูกต้องของลิงก์รูปถ่าย
  const hasValidImage = Boolean(rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && rawImage !== 'null' && (rawImage.startsWith('http') || rawImage.startsWith('/')));
  const avatarUrl = hasValidImage ? (rawImage as string) : getInitialsAvatar(userFullName);
  
  // เช็คสิทธิ์แอดมินและแปลงชื่อบทบาทเป็นภาษาไทย
  const isUserAdmin = userRole === 'admin';
  const roleLabel = userRole === 'admin' ? 'ผู้ดูแลระบบ' : userRole === 'agent' ? 'นายหน้า' : 'สมาชิก';

  return (
    // <nav> ลอยติดบนสุดเสมอ (fixed top-0) พร้อมเอฟเฟกต์พื้นหลังเบลอ (backdrop-blur)
    <nav className={`fixed w-full z-50 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm ${isUserAdmin ? 'top-8' : 'top-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* 1. โลโก้แบรนด์ SrichaiProperty (คลิกกลับหน้าแรก) */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer group">
            <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          {/* 2. เมนูหลักบนหน้าจอเดสก์ท็อป (Desktop Navigation Links) */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                  isActive(link.path) ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 3. แผงจัดการผู้ใช้ฝั่งขวาบนจอเดสก์ท็อป (Desktop Right User Panel) */}
          <div className="hidden lg:flex items-center space-x-3">
            {session ? (
              // กรณีเข้าสู่ระบบแล้ว: แสดงกระดิ่งแจ้งเตือน, รูปโปรไฟล์ย่อ, ชื่อผู้ใช้, ป้ายบทบาท และปุ่มออกจากระบบ
              <div className="flex items-center gap-2.5">
                <NotificationBell />
                <div className="h-6 w-px bg-slate-200 mx-1" />

                <Link href="/profile" className="flex items-center gap-2 py-1 px-2 hover:bg-slate-50 rounded-xl transition cursor-pointer">
                  <Image
                    src={avatarUrl}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm"
                    unoptimized
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">{userFullName}</span>
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider mt-0.5">
                      {roleLabel}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  title="ออกจากระบบ"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              // กรณียังไม่ได้เข้าสู่ระบบ: แสดงปุ่มเข้าสู่ระบบและสมัครสมาชิก
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-slate-700 hover:text-blue-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-50 transition">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-700/10 active:scale-95 whitespace-nowrap">
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>

          {/* 4. ปุ่ม Hamburger สลับสภาวะเปิด/ปิดเมนูบนมือถือ (Mobile Toggle) */}
          <div className="flex items-center lg:hidden">
            {session && isUserAdmin && (
              <Link href="/admin/dashboard" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[10px] shadow-sm mr-2 flex items-center gap-1 cursor-pointer whitespace-nowrap">
                ⚡ แอดมิน
              </Link>
            )}
            
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl focus:outline-none transition cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* 5. เมนูสไลด์ลงมาบนหน้าจอมือถือ (Mobile Drawer Dropdown) */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200/80 absolute w-full shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-2">
            {session && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image src={avatarUrl} alt="Profile" width={40} height={40} className="w-10 h-10 rounded-full object-cover border border-slate-200" unoptimized />
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{userFullName}</div>
                    <div className="text-[10px] text-blue-600 font-extrabold uppercase">{roleLabel}</div>
                  </div>
                </div>
                <Link href="/profile" onClick={() => setIsOpen(false)} className="text-[10px] bg-white border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition">
                  โปรไฟล์
                </Link>
              </div>
            )}

            {isUserAdmin && (
              <Link href="/admin/dashboard" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-amber-950 bg-amber-400 font-black rounded-xl text-xs shadow-sm flex items-center gap-2 mb-2">
                ⚡ หน้าควบคุมแอดมิน (Admin Dashboard)
              </Link>
            )}

            {/* วนลูปแสดงผลลิงก์เมนูบนมือถือ */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                  isActive(link.path) ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t border-slate-100 my-2 pt-2" />

            {session ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="block w-full text-left px-4 py-3 text-red-600 bg-red-50/50 hover:bg-red-50 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                🚪 ออกจากระบบ
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/login" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-slate-700 font-bold text-center border border-slate-200 rounded-xl text-xs">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/register" onClick={() => setIsOpen(false)} className="block px-4 py-3 bg-blue-700 text-white font-extrabold text-center rounded-xl text-xs shadow-md">
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
