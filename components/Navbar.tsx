'use client';

import { useState } from "react";
import Link from "next/link"; // ใช้แทน <a> สำหรับทำ Client-Side Routing (กดเปลี่ยนหน้าทันทีโดยไม่ต้องรีโหลดหน้าเว็บใหม่)
import { usePathname } from "next/navigation"; // Hook สำหรับดึงเส้นทาง URL ปัจจุบัน เพื่อนำมาเช็คว่าเมนูไหนกำลังเปิดอยู่
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  // useState สำหรับเปิด-ปิดเมนูบนหน้าจอมือถือ (false = ปิด, true = เปิด)
  const [isOpen, setIsOpen] = useState(false);
  
  // เรียกใช้ Hook เพื่อดู URL ปัจจุบัน (เช่น "/" หรือ "/search")
  const pathname = usePathname();

  // ฟังก์ชันตัวช่วย: เช็คว่าปุ่มเมนูนี้ตรงกับ URL ปัจจุบันหรือไม่ (ใช้สำหรับไฮไลท์ปุ่มสีฟ้า)
  const isActive = (path: string) => {
    if (path === "/home" || path === "/") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname === path;
  };

  // ฟังก์ชันวาดรูปภาพอักษรย่อจากชื่อผู้ใช้แบบ SVG (เข้ารหัส URI เพื่อความง่ายและเสถียร 100% ทั้งฝั่ง Server และ Client)
  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  // ค้นหารูปภาพผู้ใช้จริง (ตรวจสอบลิ้งค์ให้ถูกต้องและไม่ใช่คำว่า "null" / "undefined")
  const userFullName = session?.user?.name || "ผู้ใช้งาน";
  const rawImage = session?.user?.image;
  const hasValidImage = rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && rawImage !== 'null' && rawImage !== 'undefined' && (rawImage.startsWith('http') || rawImage.startsWith('/'));
  const avatarUrl = hasValidImage ? rawImage : getInitialsAvatar(userFullName);

  return (
    <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* ส่วนของโลโก้บริษัท (Brand Logo) */}
          <Link href="/home" className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
            {/* กล่องตัวอักษร 'S' มีสีพื้นหลังน้ำเงินและเงา */}
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-700/30 group-hover:scale-105 transition-transform">
              S
            </div>
            {/* ข้อความชื่อเว็บ */}
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          {/* เมนูนำทางสำหรับหน้าจอคอมพิวเตอร์ (Desktop Links) - จะซ่อนเมื่ออยู่บนมือถือด้วยคลาส hidden md:flex */}
          <div className="hidden md:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
            {/* เมนูหน้าแรก */}
            <Link
              href="/home"
              className={`rounded-full px-5 py-2 text-sm transition ${
                isActive("/") 
                  ? "text-blue-700 bg-white shadow-sm font-bold" // ไฮไลท์ถ้ากดหน้านี้อยู่
                  : "text-slate-600 hover:text-blue-600 hover:bg-white/50 font-medium"
              }`}
            >
              หน้าแรก
            </Link>
            
            {/* เมนูค้นหาอสังหาฯ */}
            <Link
              href="/search"
              className={`rounded-full px-5 py-2 text-sm transition ${
                isActive("/search")
                  ? "text-blue-700 bg-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-blue-600 hover:bg-white/50 font-medium"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            
            {/* เมนูนายหน้าของเรา */}
            <Link
              href="/agents"
              className={`rounded-full px-5 py-2 text-sm transition ${
                isActive("/agents")
                  ? "text-blue-700 bg-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-blue-600 hover:bg-white/50 font-medium"
              }`}
            >
              นายหน้าของเรา
            </Link>

            {/* เมนูการนัดหมาย */}
            <Link
              href="/appointments"
              className={`rounded-full px-5 py-2 text-sm transition ${
                isActive("/appointments")
                  ? "text-blue-700 bg-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-blue-600 hover:bg-white/50 font-medium"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>
          </div>

          {/* กลุ่มปุ่มล็อกอิน / สมัครสมาชิก และปุ่มแฮมเบอร์เกอร์บนมือถือ */}
          <div className="flex items-center space-x-4">
            {/* ซ่อนบนมือถือแสดงบนคอมพิวเตอร์ (hidden md:flex) */}
            <div className="hidden md:flex items-center space-x-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center space-x-2 bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-sm hover:bg-slate-100 transition cursor-pointer">
                    <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = getInitialsAvatar(userFullName); }} className="w-7 h-7 rounded-full border border-white shadow-sm object-cover" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-900 leading-none">{userFullName}</span>
                      <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">โปรไฟล์ของฉัน</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-red-600 hover:text-red-700 text-xs font-bold transition cursor-pointer"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-600 text-sm font-medium hover:text-blue-700 transition flex items-center gap-2"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-full text-sm font-bold transition shadow-lg shadow-blue-700/30"
                  >
                    สมัครสมาชิก
                  </Link>
                </>
              )}
            </div>

            {/* ปุ่มเปิดเมนูสำหรับบราวเซอร์มือถือ (Mobile Menu Button) - จะแสดงเฉพาะบนจอเล็ก md:hidden */}
            <button
              onClick={() => setIsOpen(!isOpen)} // กดปุ่มแล้วสลับค่า true/false ของ isOpen
              className="md:hidden text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  // รูปกากบาท (X) แสดงเมื่อเมนูถูกเปิดอยู่
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  // รูปสามขีด (Hamburger Menu) แสดงเมื่อเมนูถูกปิดอยู่
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* เมนูนำทางแบบสไลด์ลงมา สำหรับหน้าจอมือถือ (แสดงผลเฉพาะเมื่อ isOpen = true) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link
              href="/home"
              onClick={() => setIsOpen(false)} // คลิกไปแล้วปิดแถบเมนูมือถือ
              className={`block px-3 py-3 rounded-xl ${
                isActive("/") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/search") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            <Link
              href="/agents"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/agents") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              นายหน้าของเรา
            </Link>
            <Link
              href="/appointments"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/appointments") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>
            <div className="border-t border-slate-100 my-2 pt-2"></div>
            {session ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-xl"
                >
                  👤 ตั้งค่าโปรไฟล์
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  🚪 ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 text-slate-600 font-medium text-center border border-slate-200 rounded-xl mb-2"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 bg-blue-700 text-white font-bold text-center rounded-xl shadow-md"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

