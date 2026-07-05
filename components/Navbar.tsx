"use client"; // แจ้ง Next.js ว่าไฟล์นี้เป็น Client Component (เปิดใช้ React State/Hooks ฝั่งเว็บบราวเซอร์ได้)

import { useState } from "react";
import Link from "next/link"; // ใช้แทน <a> สำหรับทำ Client-Side Routing (กดเปลี่ยนหน้าทันทีโดยไม่ต้องรีโหลดหน้าเว็บใหม่)
import { usePathname } from "next/navigation"; // Hook สำหรับดึงเส้นทาง URL ปัจจุบัน เพื่อนำมาเช็คว่าเมนูไหนกำลังเปิดอยู่

export default function Navbar() {
  // useState สำหรับเปิด-ปิดเมนูบนหน้าจอมือถือ (false = ปิด, true = เปิด)
  const [isOpen, setIsOpen] = useState(false);
  
  // เรียกใช้ Hook เพื่อดู URL ปัจจุบัน (เช่น "/" หรือ "/search")
  const pathname = usePathname();

  // ฟังก์ชันตัวช่วย: เช็คว่าปุ่มเมนูนี้ตรงกับ URL ปัจจุบันหรือไม่ (ใช้สำหรับไฮไลท์ปุ่มสีฟ้า)
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* ส่วนของโลโก้บริษัท (Brand Logo) */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
            {/* กล่องตัวอักษร 'S' มีสีพื้นหลังน้ำเงินและเงา */}
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-700/30">
              S
            </div>
            {/* ข้อความชื่อเว็บ */}
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          {/* เมนูนำทางสำหรับหน้าจอคอมพิวเตอร์ (Desktop Links) - จะซ่อนเมื่ออยู่บนมือถือด้วยคลาส hidden md:flex */}
          <div className="hidden md:flex space-x-1 items-center bg-slate-100/50 p-1 rounded-full border border-slate-200">
            {/* เมนูหน้าแรก */}
            <Link
              href="/"
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
            
            {/* เมนูติดต่อนายหน้า */}
            <Link
              href="/agents"
              className={`rounded-full px-5 py-2 text-sm transition ${
                isActive("/agents")
                  ? "text-blue-700 bg-white shadow-sm font-bold"
                  : "text-slate-600 hover:text-blue-600 hover:bg-white/50 font-medium"
              }`}
            >
              ติดต่อนายหน้า
            </Link>
          </div>

          {/* กลุ่มปุ่มล็อกอิน / สมัครสมาชิก และปุ่มแฮมเบอร์เกอร์บนมือถือ */}
          <div className="flex items-center space-x-4">
            {/* ซ่อนบนมือถือแสดงบนคอมพิวเตอร์ (hidden md:flex) */}
            <div className="hidden md:flex items-center space-x-4">
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
              href="/"
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
              ติดต่อนายหน้า
            </Link>
            <div className="border-t border-slate-100 my-2 pt-2"></div>
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
          </div>
        </div>
      )}
    </nav>
  );
}

