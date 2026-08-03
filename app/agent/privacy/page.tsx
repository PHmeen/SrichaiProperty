'use client';

import React from 'react';
import Link from 'next/link';

export default function AgentPrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            🔒 นโยบายความเป็นส่วนตัวเฉพาะนายหน้า (Agent PDPA Privacy)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            การคุ้มครองข้อมูลส่วนบุคคลสำหรับนายหน้าตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
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
          🏠 <strong>ข้อกำหนดเฉพาะนายหน้า:</strong> ศรีชัย พร็อพเพอร์ตี้ คุ้มครองข้อมูลส่วนบุคคลของนายหน้าและผู้ฝากขายอสังหาริมทรัพย์ เอกสารนี้ระบุเงื่อนไขการใช้ข้อมูลเพื่อการยืนยันตัวตนและการแสดงผลสาธารณะ
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm space-y-4">
          <h2 className="text-base font-black text-slate-900 border-b pb-2">1. ข้อมูลส่วนบุคคลของนายหน้าที่ระบบจัดเก็บ</h2>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>เอกสารยืนยันตัวตน KYC:</strong> ภาพถ่ายบัตรประชาชน หรือใบอนุญาตประกอบวิชาชีพนายหน้า (เพื่อตรวจสอบความถูกต้องก่อนอนุมัติสิทธิ์)</li>
            <li><strong>ข้อมูลติดต่อสาธารณะ:</strong> เบอร์โทรศัพท์ และ **LINE ID** (เพื่อแสดงผลในหน้าประกาศบ้านให้ลูกค้าทักแชทคุย LINE หรือโทรหาโดยตรง)</li>
            <li><strong>ข้อมูลธุรกรรมการเงิน:</strong> ภาพถ่ายสลิปโอนเงิน PromptPay ฿599 (จัดเก็บไว้ในระบบเพื่อตรวจสอบทางบัญชีการสมัคร Verified PRO)</li>
          </ul>

          <h2 className="text-base font-black text-slate-900 border-b pb-2">2. วัตถุประสงค์และการแสดงผลข้อมูล</h2>
          <p>
            ข้อมูลเบอร์โทรศัพท์และ LINE ID ของนายหน้าจะถูกนำไปสร้างลิงก์สำหรับปุ่ม &quot;💬 คุย LINE นายหน้า&quot; และ &quot;📞 โทร&quot; ในหน้าประกาศขายบ้าน เพื่อให้ลูกค้าผู้สนใจสามารถติดต่อกับนายหน้าโดยตรง
          </p>

          <h2 className="text-base font-black text-slate-900 border-b pb-2">3. สิทธิการจัดการข้อมูลและลบบัญชี (Agent Rights)</h2>
          <p>
            นายหน้าสามารถเข้ามาแก้ไข ชื่อ, เบอร์โทรศัพท์, และ LINE ID ได้ตลอดเวลาในหน้า **`/agent/profile`** และมีสิทธิกดลบบัญชีผู้ใช้นายหน้าอย่างถาวร (**Delete Account**) ได้เองผ่านระบบ
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
          <span>แยกไฟล์เฉพาะนายหน้า: app/agent/privacy/page.tsx</span>
          <Link href="/agent/terms" className="text-amber-600 font-bold hover:underline">
            ดูข้อกำหนดการใช้บริการนายหน้า (Agent Terms) →
          </Link>
        </div>

      </div>

    </div>
  );
}
