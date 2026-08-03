'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'agent'>('all');

  useEffect(() => {
    fetch('/api/legal?type=terms')
      .then(res => res.json())
      .then(data => {
        if (data.content) setContent(data.content);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              📜 ข้อกำหนดและเงื่อนไขการใช้งาน (Terms & Conditions)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              ข้อตกลงและเงื่อนไขการใช้บริการ แยกตามหมวดหมู่สำหรับผู้ซื้อและนายหน้า
            </p>
          </div>
          <Link
            href="/home"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition text-center"
          >
            ← กลับหน้าหลัก
          </Link>
        </div>

        {/* User Group Selector Tabs */}
        <div className="flex gap-2 bg-slate-200/60 p-1.5 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${activeTab === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🌐 ทั้งหมด (Overview)
          </button>
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${activeTab === 'customer' ? 'bg-blue-600 shadow text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            👤 สำหรับลูกค้า / ผู้ซื้อ
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition ${activeTab === 'agent' ? 'bg-amber-500 shadow text-slate-950' : 'text-slate-600 hover:text-slate-900'}`}
          >
            🏠 สำหรับนายหน้า
          </button>
        </div>

        {/* Content Box */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6 text-xs sm:text-sm leading-relaxed text-slate-700">
            
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-900 text-xs font-medium leading-relaxed">
              📌 <strong>คำแจ้งเตือนสำคัญ:</strong> ข้อกำหนดนี้จัดทำขึ้นเพื่อสร้างมาตรฐานความปลอดภัยในการซื้อขายอสังหาริมทรัพย์และคุ้มครองทั้งผู้ซื้อและนายหน้า
            </div>

            {/* Section 1: Customer Terms */}
            {(activeTab === 'all' || activeTab === 'customer') && (
              <div className="bg-blue-50/40 border border-blue-100 rounded-3xl p-5 space-y-3">
                <h3 className="text-base font-black text-blue-900 flex items-center gap-2 border-b border-blue-200/60 pb-2">
                  👤 1. ข้อกำหนดสำหรับ &quot;ลูกค้า / ผู้ซื้อบ้าน&quot;
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  <li><strong>การส่งคำขอนัดหมาย:</strong> การจองนัดหมายเข้าชมบ้าน ต้องระบุวันเวลาและข้อมูลติดต่อจริงเพื่อความสะดวกในการนัดหมายกับนายหน้า</li>
                  <li><strong>การติดต่อกับนายหน้า:</strong> ลูกค้าสามารถกดปุ่ม **คุย LINE** หรือ **โทรศัพท์** ติดต่อกับนายหน้าได้โดยตรงเพื่อสอบถามข้อมูลบ้าน</li>
                  <li><strong>ขอบเขตความรับผิดชอบ:</strong> ระบบทำหน้าที่เป็นสื่อกลางและเครื่องมืออำนวยความสะดวก การทำสัญญาซื้อขายและวางมัดจำให้กระทำตามข้อตกลงกับนายหน้าโดยตรง</li>
                </ul>
              </div>
            )}

            {/* Section 2: Agent Terms */}
            {(activeTab === 'all' || activeTab === 'agent') && (
              <div className="bg-amber-50/40 border border-amber-100 rounded-3xl p-5 space-y-3">
                <h3 className="text-base font-black text-amber-900 flex items-center gap-2 border-b border-amber-200/60 pb-2">
                  🏠 2. ข้อกำหนดสำหรับ &quot;นายหน้า / ผู้ฝากขาย&quot;
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  <li><strong>ความถูกต้องของประกาศ:</strong> นายหน้าต้องให้ข้อมูลบ้าน ราคา ตำแหน่งที่ตั้ง และรูปภาพที่เป็นจริง ไม่อนุญาตให้ลงประกาศบิดเบือน</li>
                  <li><strong>เงื่อนไขแพ็กเกจ Verified PRO (฿599):</strong> นายหน้าอัปเกรดโดยการโอนเงินแนบสลิปผ่านระบบ เมื่อแอดมินอนุมัติจะได้รับโควต้าลงประกาศไม่จำกัดเป็นเวลา 30 วัน</li>
                  <li><strong>การยืนยันตัวตน KYC:</strong> นายหน้าต้องผ่านการส่งเอกสารยืนยันตัวตน เพื่อรับตราสัญลักษณ์ **Verified Agent** สร้างความน่าเชื่อถือให้ผู้ซื้อ</li>
                </ul>
              </div>
            )}

            {content && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono whitespace-pre-wrap">
                {content}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
