'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-500">กำลังโหลดแผงควบคุม...</span>
        </div>
      </div>
    );
  }

  // ตรวจสอบเซสชันผู้ใช้งาน
  interface CustomUser {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    status?: string | null;
    role?: string | null;
  }

  const user = session?.user as CustomUser | undefined;
  const userStatus = user?.status || 'pending';
  const userEmail = user?.email || 'agent@email.com';


  // --- 1. หน้าจอแจ้งเตือนความปลอดภัยระหว่างรออนุมัติ (Pending Review UI) ---
  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 font-sans text-slate-800 antialiased">
        <div className="w-full max-w-2xl bg-white rounded-3xl shadow-[0_15px_50px_-15px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
          {/* Header dark panel */}
          <div className="bg-gradient-to-b from-[#1e293b] to-[#0f172a] p-10 text-center relative flex flex-col items-center">
            {/* Clock icon inside orange circle */}
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
              <svg className="w-9 h-9 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-3 tracking-tight">
              บัญชีอยู่ระหว่างการตรวจสอบ
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium opacity-90 max-w-md mx-auto leading-relaxed">
              เราได้รับข้อมูลการสมัครเป็นตัวแทนขายอสังหาริมทรัพย์ของคุณเรียบร้อยแล้ว
            </p>
          </div>

          {/* Stepper Timeline Section */}
          <div className="px-6 py-8 sm:px-12 border-b border-slate-100">
            <div className="flex items-center justify-center w-full max-w-md mx-auto">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-black shadow-md">
                  ✓
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 mt-2.5">ส่งคำขอ</span>
              </div>

              {/* Progress Line 1 */}
              <div className="h-1 bg-gradient-to-r from-emerald-500 to-amber-500 flex-1 -mx-2 -mt-4" />

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-sm font-black shadow-md border-4 border-white">
                  2
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-amber-600 mt-2.5">ตรวจสอบ KYC</span>
              </div>

              {/* Progress Line 2 */}
              <div className="h-1 bg-slate-200 flex-1 -mx-2 -mt-4" />

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center relative z-10 flex-1">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-sm font-black">
                  3
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 mt-2.5">เปิดใช้งาน</span>
              </div>
            </div>
          </div>

          {/* Details / Next Steps Panel */}
          <div className="p-6 sm:p-10">
            <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-6 sm:p-8 space-y-5">
              <h2 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                📋 ขั้นตอนต่อไปคืออะไร?
              </h2>

              <ul className="space-y-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                <li className="flex gap-3 items-start">
                  <span className="text-amber-500 text-lg flex-shrink-0 leading-none">✓</span>
                  <span>ทีมงาน (Admin) จะทำการตรวจสอบเอกสารยืนยันตัวตน (KYC) และประวัติการทำงานของคุณ</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-amber-500 text-lg flex-shrink-0 leading-none">🕒</span>
                  <span>กระบวนการนี้จะใช้เวลาประมาณ <strong>1-2 วันทำการ</strong> (ไม่รวมวันเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-amber-500 text-lg flex-shrink-0 leading-none">✉️</span>
                  <span>เมื่อได้รับการอนุมัติ ระบบจะส่งอีเมลแจ้งเตือนไปยัง <strong className="text-slate-800">{userEmail}</strong> (อีเมลที่คุณใช้สมัคร) เพื่อให้คุณเข้าสู่ Agent Dashboard ได้ทันที</span>
                </li>
              </ul>
            </div>

            {/* Footer Support Info */}
            <div className="text-center mt-8 text-[11px] text-slate-400 font-medium leading-relaxed">
              หากคุณมีข้อสงสัย หรือต้องการแก้ไขเอกสาร สามารถติดต่อฝ่ายดูแลพาร์ทเนอร์ได้ที่ <br />
              <a href="mailto:partner@srichaiproperty.com" className="text-amber-600 font-bold hover:underline">partner@srichaiproperty.com</a> หรือ <span className="text-slate-500 font-bold">074-XXX-XXX</span>
            </div>

            {/* Action Button */}
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => signOut({ callbackUrl: '/login/agent' })}
                className="w-full max-w-xs bg-slate-900 hover:bg-slate-950 text-white font-extrabold py-3.5 px-6 rounded-xl transition shadow-lg active:scale-[0.98] cursor-pointer text-xs uppercase tracking-wider"
              >
                ไปหน้าเข้าสู่ระบบนายหน้า
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. หน้าจอปกติของนายหน้าที่ผ่านอนุมัติแล้ว (Approved Agent Dashboard) ---
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 font-sans">แผงควบคุมนายหน้า (Agent Dashboard)</h1>
        <a 
          href="/agent/add-property" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          + ลงประกาศขายบ้านใหม่
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">บ้านที่กำลังขาย</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">12 หลัง</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">คิวนัดหมายรออนุมัติ</p>
          <p className="text-3xl font-bold text-yellow-600 mt-2">3 คิว</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">แชทคุยกับลูกค้า</p>
          <p className="text-3xl font-bold text-green-600 mt-2">5 ห้อง</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500">สถานะ KYC บัญชี</p>
          <p className="text-lg font-bold text-green-600 mt-2">ยืนยันเรียบร้อยแล้ว</p>
        </div>
      </div>

      {/* ลิงก์ด่วนการจัดการสำหรับนายหน้า */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">จัดการนัดหมาย</h2>
          <p className="text-sm text-gray-500 mt-1">อนุมัติหรือปฏิเสธคำขอการจองนัดเข้าชมบ้านของลูกค้า</p>
          <a href="/agent/appointments" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปยังหน้านัดหมาย →</a>
        </div>
        <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800">แชทของฉัน</h2>
          <p className="text-sm text-gray-500 mt-1">สนทนาตอบคำถามลูกค้าเกี่ยวกับอสังหาริมทรัพย์ที่ลงประกาศ</p>
          <a href="/agent/chat" className="inline-block mt-4 text-blue-600 font-semibold hover:underline">ไปยังห้องแชทนายหน้า →</a>
        </div>
      </div>
    </div>
  );
}
