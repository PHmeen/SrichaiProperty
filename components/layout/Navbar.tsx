'use client';
// ต้องเป็น Client Component เพราะไฟล์นี้ใช้ React hook (useState, usePathname, useSession)
// และมี event handler (onClick) ซึ่งทำงานได้เฉพาะฝั่ง browser เท่านั้น

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation"; // hook อ่าน path ปัจจุบันของ URL เพื่อไฮไลต์เมนูที่กำลังเปิดอยู่
import { useSession, signOut } from "next-auth/react"; // จัดการ session ผู้ใช้ (ล็อกอินอยู่หรือไม่) และฟังก์ชันออกจากระบบ
import NotificationBell from "@/components/common/NotificationBell"; // ไอคอนกระดิ่งแจ้งเตือน แสดงเมื่อล็อกอินแล้ว

export default function Navbar() {
  // ดึงข้อมูล session ปัจจุบันจาก NextAuth (มีค่าถ้าล็อกอินอยู่, เป็น null/undefined ถ้ายังไม่ล็อกอิน)
  const { data: session } = useSession();
  // state ควบคุมการเปิด/ปิดเมนูแบบ hamburger บนมือถือ
  const [isOpen, setIsOpen] = useState(false);
  // path ปัจจุบันของหน้า เช่น "/search", "/agents" ใช้เช็คว่าอยู่หน้าไหนเพื่อไฮไลต์เมนู
  const pathname = usePathname();

  // ฟังก์ชันเช็คว่าลิงก์เมนูนี้ตรงกับหน้าปัจจุบันหรือไม่ (ใช้กำหนดสีไฮไลต์เมนู)
  const isActive = (path: string) => {
    // กรณีพิเศษ: ทั้ง "/" และ "/home" ถือว่าเป็นหน้าแรกเหมือนกัน
    if (path === "/home" || path === "/") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname === path;
  };

  // ฟังก์ชันสร้างรูปโปรไฟล์สำรอง (fallback avatar) กรณีผู้ใช้ไม่มีรูปโปรไฟล์
  // โดยสร้างเป็นวงกลมสีน้ำเงินใส่ตัวอักษรย่อของชื่อ แล้วแปลงเป็น SVG แบบ data URI
  const getInitialsAvatar = (name: string) => {
    // ตัดชื่อเต็มด้วยช่องว่าง เอาตัวอักษรแรกของแต่ละคำ สูงสุด 2 ตัว แล้วแปลงเป็นตัวพิมพ์ใหญ่
    // ถ้าหาตัวอักษรย่อไม่ได้ (ชื่อว่าง) ใช้ "?" แทน
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    // สร้าง SVG string: วงกลมพื้นหลังสีน้ำเงิน + ข้อความตัวอักษรย่อสีขาวตรงกลาง
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    // แปลง SVG เป็น data URI เพื่อใช้เป็น src ของ <Image> ได้โดยตรงโดยไม่ต้องอัปโหลดไฟล์จริง
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // ชื่อผู้ใช้ที่แสดงผล ถ้าไม่มี session หรือไม่มีชื่อ ให้ใช้คำว่า "ผู้ใช้งาน" แทน
  const userFullName = session?.user?.name || "ผู้ใช้งาน";
  // บทบาทผู้ใช้ (admin / agent / สมาชิกทั่วไป) ต้อง cast type เพราะ next-auth ไม่มี field role ใน type เริ่มต้น
  const userRole = (session?.user as { role?: string })?.role;
  // ลิงก์รูปโปรไฟล์ดิบจาก session (อาจเป็น null/undefined/ค่าที่ไม่ถูกต้อง)
  const rawImage = session?.user?.image;
  // ตรวจสอบว่ารูปโปรไฟล์ที่ได้มาใช้งานได้จริงหรือไม่:
  // ต้องเป็น string, ไม่ว่างเปล่า, ไม่ใช่ข้อความ "null"/"undefined" (ที่หลุดมาจากการแปลงค่าผิดพลาด)
  // และต้องขึ้นต้นด้วย http (ลิงก์ภายนอก) หรือ / (ไฟล์ภายในระบบ) เท่านั้น
  const hasValidImage = rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && rawImage !== 'null' && rawImage !== 'undefined' && (rawImage.startsWith('http') || rawImage.startsWith('/'));
  // ถ้ารูปใช้ได้จริงก็ใช้รูปนั้น ถ้าไม่ ให้สร้างรูป avatar ตัวอักษรย่อแทน
  const avatarUrl = hasValidImage ? rawImage : getInitialsAvatar(userFullName);

  // flag บอกว่าผู้ใช้ปัจจุบันเป็นแอดมินหรือไม่ ใช้ปรับตำแหน่ง Navbar (เผื่อพื้นที่แถบแอดมินด้านบน)
  const isUserAdmin = userRole === 'admin';

  return (
    // <nav> ลอยติดด้านบนเสมอ (fixed) มีพื้นหลังโปร่งแสงเบลอ (backdrop-blur)
    // ถ้าเป็นแอดมิน เลื่อนลงมา top-8 (32px) เพื่อเว้นที่ให้แถบแจ้งเตือน/แถบแอดมินที่อาจอยู่บนสุดของหน้า
    // ถ้าไม่ใช่แอดมิน ให้ชิดขอบบนสุด (top-0)
    <nav className={`fixed w-full z-50 transition-all duration-300 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm ${isUserAdmin ? 'top-8' : 'top-0'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo: คลิกแล้วกลับหน้าแรก มีไอคอนตัว S สีน้ำเงินและชื่อแบรนด์ */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer group">
            <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          {/* เมนูนำทางหลักบนจอเดสก์ท็อป (ซ่อนบนจอเล็กด้วย hidden, แสดงเมื่อ lg ขึ้นไปด้วย lg:flex)
              แต่ละลิงก์ใช้ isActive() เช็คว่าตรงกับหน้าปัจจุบันไหม ถ้าใช่จะไฮไลต์สีน้ำเงิน */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/search") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            <Link
              href="/agents"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/agents") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              นายหน้าของเรา
            </Link>
            <Link
              href="/appointments"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/appointments") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>

            <Link
              href="/saved-properties"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all flex items-center gap-1.5 ${
                isActive("/saved-properties") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              <span>รายการโปรด</span>
            </Link>
          </div>

          {/* ส่วนควบคุมผู้ใช้ฝั่งขวาบนจอเดสก์ท็อป: แยกเป็น 2 กรณีตามสถานะล็อกอิน (session) */}
          <div className="hidden lg:flex items-center space-x-3">
            {session ? (
              // กรณีล็อกอินแล้ว: แสดงกระดิ่งแจ้งเตือน, โปรไฟล์ย่อ, และปุ่มออกจากระบบ
              <div className="flex items-center gap-2.5">
                <NotificationBell />

                {/* เส้นคั่นแนวตั้งบางๆ ระหว่างกระดิ่งกับโปรไฟล์ */}
                <div className="h-6 w-px bg-slate-200 mx-1" />

                {/* คลิกที่ชื่อ/รูปโปรไฟล์เพื่อไปหน้าโปรไฟล์ */}
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
                    {/* แสดงป้ายบทบาทผู้ใช้เป็นภาษาไทย ตามค่า userRole */}
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider mt-0.5">
                      {userRole === 'admin' ? 'ผู้ดูแลระบบ' : userRole === 'agent' ? 'นายหน้า' : 'สมาชิก'}
                    </span>
                  </div>
                </Link>

                {/* ปุ่มออกจากระบบ: เรียก signOut ของ next-auth แล้วพากลับไปหน้า /login */}
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  title="ออกจากระบบ"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              // กรณียังไม่ล็อกอิน: แสดงปุ่มเข้าสู่ระบบและสมัครสมาชิกแทน
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-blue-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-50 transition"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-700/10 active:scale-95 whitespace-nowrap"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>

          {/* ปุ่ม hamburger สำหรับเปิด/ปิดเมนูบนจอมือถือ (แสดงเฉพาะจอเล็กกว่า lg) */}
          <div className="flex items-center lg:hidden">
            {/* ทางลัดไปหน้าแอดมิน แสดงเฉพาะผู้ใช้ที่ล็อกอินและมี role เป็น admin */}
            {session && userRole === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[10px] shadow-sm mr-2 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                ⚡ แอดมิน
              </Link>
            )}
            
            {/* ปุ่มสลับสถานะเปิด/ปิดเมนู: ไอคอนเปลี่ยนรูปตาม isOpen
                - true: แสดงไอคอนกากบาท (X) สำหรับปิดเมนู
                - false: แสดงไอคอนขีดสามเส้น (hamburger) สำหรับเปิดเมนู */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl focus:outline-none transition cursor-pointer"
            >
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

      {/* เมนูแบบ Drawer ที่เลื่อนลงมาบนจอมือถือ แสดงเฉพาะเมื่อ isOpen เป็น true
          ใช้ absolute เพื่อลอยทับเนื้อหาด้านล่างโดยไม่ดันเลย์เอาต์ */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200/80 absolute w-full shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-2">

            {/* การ์ดสรุปข้อมูลผู้ใช้ (รูป, ชื่อ, บทบาท) พร้อมปุ่มลิงก์ไปหน้าโปรไฟล์ แสดงเฉพาะเมื่อล็อกอินแล้ว */}
            {session && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image 
                    src={avatarUrl} 
                    alt="Profile" 
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                    unoptimized
                  />
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{userFullName}</div>
                    <div className="text-[10px] text-blue-600 font-extrabold uppercase">
                      {userRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : userRole === 'agent' ? 'นายหน้าการขาย' : 'สมาชิกทั่วไป'}
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] bg-white border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
                >
                  โปรไฟล์
                </Link>
              </div>
            )}

            {/* ทางลัดไปหน้าแอดมินในเมนูมือถือ แสดงเฉพาะผู้ใช้ role admin */}
            {userRole === 'admin' && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-amber-950 bg-amber-400 font-black rounded-xl text-xs shadow-sm flex items-center gap-2 mb-2"
              >
                ⚡ หน้าควบคุมแอดมิน (Admin Dashboard)
              </Link>
            )}

            {/* รายการลิงก์เมนูหลัก (มือถือ) ทุกลิงก์จะปิดเมนู (setIsOpen(false)) เมื่อถูกคลิก
                และไฮไลต์สีน้ำเงินถ้าตรงกับหน้าปัจจุบันผ่าน isActive() */}
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              🏠 หน้าแรก
            </Link>

            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/search") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              🔍 ค้นหาอสังหาริมทรัพย์
            </Link>

            <Link
              href="/agents"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/agents") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              👔 นายหน้าของเรา
            </Link>

            <Link
              href="/appointments"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/appointments") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              📅 ประวัติการนัดหมาย
            </Link>

            {/* เส้นคั่นระหว่างเมนูนำทางกับส่วนล็อกอิน/ออกจากระบบ */}
            <div className="border-t border-slate-100 my-2 pt-2"></div>

            {/* เช่นเดียวกับฝั่งเดสก์ท็อป: สลับระหว่างปุ่มออกจากระบบ กับปุ่มเข้าสู่ระบบ/สมัครสมาชิก ตามสถานะ session */}
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
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-slate-700 font-bold text-center border border-slate-200 rounded-xl text-xs"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 bg-blue-700 text-white font-extrabold text-center rounded-xl text-xs shadow-md"
                >
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


