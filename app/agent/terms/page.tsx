'use client';

import React from 'react';
import Link from 'next/link';

export default function AgentTermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            📜 ข้อกำหนดการใช้งานเฉพาะนายหน้า (Agent Terms & Conditions)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ข้อตกลง เงื่อนไขการฝากขายบ้าน และสิทธิ์การใช้งานแพ็กเกจ Verified PRO
          </p>
        </div>
        <Link
          href="/agent/profile"
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition text-center"
        >
          ← กลับโปรไฟล์นายหน้า
        </Link>
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed text-slate-700">
        
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs font-medium leading-relaxed">
          📌 <strong>ข้อตกลงการใช้บริการสำหรับนายหน้า:</strong> นายหน้าผู้ฝากขายอสังหาริมทรัพย์ต้องยอมรับข้อกำหนดและเงื่อนไขฉบับนี้ก่อนเริ่มลงประกาศหรือซื้อแพ็กเกจ PRO
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 border-b pb-2">1. มาตรฐานความถูกต้องของประกาศขายบ้าน</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>นายหน้าต้องระบุรายละเอียดบ้าน ราคา ตำแหน่งที่ตั้ง และรูปภาพที่เป็นจริง ไม่อนุญาตให้ลงประกาศเท็จหรือบิดเบือนเพื่อหลอกลวงผู้ซื้อ</li>
            <li>ประกาศที่รอดำเนินการจะถูกตรวจสอบโดยแอดมินก่อนเปิดแสดงผลสู่สาธารณะ</li>
          </ul>

          <h2 className="text-base font-black text-slate-900 border-b pb-2">2. เงื่อนไขแพ็กเกจ Verified PRO (฿599/เดือน)</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>นายหน้าทำการโอนเงินแนบสลิปผ่านระบบเช็คเอาต์ เมื่อแอดมินอนุมัติแล้วจะได้รับตรา Verified PRO 👑</li>
            <li>สมาชิก PRO จะได้รับโควต้าการลงประกาศไม่จำกัดจำนวน พร้อมต่ออายุสิทธิ์ใช้งาน 30 วันนับตั้งแต่วันที่แอดมินอนุมัติ</li>
            <li>กรณีปฏิเสธสลิป (Rejected) นายหน้าสามารถติดต่อแอดมินผ่านการแจ้งเตือนในระบบ</li>
          </ul>

          <h2 className="text-base font-black text-slate-900 border-b pb-2">3. การจองนัดหมายและการติดต่อลูกค้า</h2>
          <p>
            นายหน้าต้องตอบรับหรือดำเนินการเกี่ยวกับคำขอนัดหมายเข้าชมบ้านจากลูกค้าอย่างเหมาะสม เพื่อรักษาคุณภาพบริการบนแพลตฟอร์ม
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>แยกไฟล์เฉพาะนายหน้า: app/agent/terms/page.tsx</span>
          <Link href="/agent/privacy" className="text-amber-600 font-bold hover:underline">
            อ่านนโยบายความเป็นส่วนตัวนายหน้า (Agent Privacy) →
          </Link>
        </div>

      </div>

    </div>
  );
}
