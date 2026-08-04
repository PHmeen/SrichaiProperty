'use client';

import { signOut } from 'next-auth/react';

export default function PendingAgentGate() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-950">🕒</div>
        <h1 className="text-xl font-black">บัญชีอยู่ระหว่างการตรวจสอบ</h1>
        <p className="text-slate-500 text-xs">ทีมงานจะใช้เวลาตรวจสอบ KYC 1-2 วันทำการ เพื่อความปลอดภัยของระบบ เมนูอื่น ๆ จะเปิดใช้งานทันทีที่บัญชีของคุณได้รับการอนุมัติ</p>
        <button onClick={() => signOut({ callbackUrl: '/login/agent' })} className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-xl">ออกจากระบบ</button>
      </div>
    </div>
  );
}
