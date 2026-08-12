'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // ใช้เช็คหน้าปัจจุบันเพื่อซ่อนปุ่มลอยตอนอยู่ในหน้าแชทอยู่แล้ว
import { useSession } from 'next-auth/react'; // ใช้ดึงข้อมูลผู้ใช้ที่ล็อกอินเพื่อกำหนดลิงก์ปลายทางของปุ่มแชท

// ==============================================================================
// FLOATING CHAT WIDGET COMPONENT (ปุ่มทางด่วนเข้าสู่ระบบแชทแบบลอยมุมขวาล่าง)
// ==============================================================================
/**
 * คอมโพเนนต์ปุ่มแชทลอย (Floating Widget)
 * แสดงผลมุมขวาล่างของทุกหน้าเว็บ เพื่อให้ผู้ใช้งานหรือนายหน้าสามารถกดเข้าสู่ห้องแชทได้อย่างสะดวกรวดเร็ว
 */
export default function FloatingChatWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // 1. ตรวจสอบตำแหน่งหน้าปัจจุบัน: ซ่อนปุ่มลอยนี้ทันทีเมื่อผู้ใช้งานเปิดอยู่ที่หน้าเพจแชทหลักแล้ว (/chat หรือ /agent/chat)
  if (pathname === '/chat' || pathname === '/agent/chat') return null;

  // 2. ตรวจสอบบทบาทของผู้ใช้งาน (Role-Based Routing):
  // - หากเป็นนายหน้า (agent) -> นำทางไปที่ /agent/chat
  // - หากเป็นลูกค้า (customer) -> นำทางไปที่ /chat
  const userRole = (session?.user as { role?: string })?.role;
  const targetChatUrl = userRole === 'agent' ? '/agent/chat' : '/chat';

  // 3. Render ปุ่มแชทลอย ( Floating Button UI )
  // - หากยังไม่ได้เข้าสู่ระบบ จะนำทางไปหน้าล็อกอิน (/login)
  return (
    <Link
      href={session ? targetChatUrl : '/login'}
      className="fixed bottom-6 right-6 z-[999] w-14 h-14 bg-gradient-to-tr from-blue-700 to-blue-500 hover:from-blue-800 hover:to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-white/40 cursor-pointer group"
      title="เปิดกล่องข้อความแชท"
      aria-label="เปิดกล่องข้อความแชท"
    >
      {/* ไอคอนบอลลูนข้อความแชท */}
      <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1 4.5A8 8 0 0 1 21 12Z" />
      </svg>

      {/* จุดป้ายสีเขียวแสดงสถานะออนไลน์และพร้อมใช้งาน (Online Indicator Badge) */}
      <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
    </Link>
  );
}

