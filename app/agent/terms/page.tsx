'use client';

import React from 'react';
import Link from 'next/link';

export default function AgentTermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">📜 ข้อกำหนดการใช้งานนายหน้า (Agent Terms)</h1>
          <p className="text-xs text-slate-500 mt-0.5">เงื่อนไขการลงประกาศขายบ้าน และการสมัครแพ็กเกจ Verified PRO</p>
        </div>
        <Link href="/agent/profile" className="px-3.5 py-1.5 bg-slate-100 font-bold text-xs rounded-xl text-slate-700 hover:bg-slate-200 transition">
          ← โปรไฟล์นายหน้า
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 text-xs text-slate-700 leading-relaxed">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 font-medium">
          📌 <strong>การยอมรับเงื่อนไข:</strong> นายหน้าผู้ฝากขายยอมรับข้อตกลงเรื่องความถูกต้องของประกาศขายบ้านและการชำระเงิน PRO
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-slate-900 border-b pb-1 text-sm">1. ความถูกต้องของประกาศ</h3>
          <p className="text-slate-600">นายหน้าต้องระบุรายละเอียด ราคา ตำแหน่งที่ตั้ง และรูปภาพบ้านที่เป็นจริง ไม่อนุญาตให้ลงข้อมูลเท็จหรือบิดเบือน</p>

          <h3 className="font-black text-slate-900 border-b pb-1 text-sm">2. แพ็กเกจ Verified PRO (฿599/เดือน)</h3>
          <p className="text-slate-600">เมื่อโอนเงินและแนบสลิปผ่านระบบ แล้วได้รับการอนุมัติจากแอดมิน จะได้รับโควต้าลงประกาศไม่จำกัดเป็นเวลา 30 วัน</p>
        </div>

        <div className="pt-4 border-t flex justify-between items-center text-[11px] text-slate-400">
          <span>Connected to PostgreSQL DB system_configs</span>
          <Link href="/agent/privacy" className="text-amber-600 font-bold hover:underline">นโยบายความเป็นส่วนตัว (Agent Privacy) →</Link>
        </div>
      </div>
    </div>
  );
}
