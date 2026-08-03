'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'agent'>('all');

  useEffect(() => {
    fetch('/api/legal?type=privacy')
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
              🔒 นโยบายความเป็นส่วนตัว (PDPA Privacy Policy)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              การคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-blue-900 text-xs font-medium leading-relaxed">
              💡 <strong>คำชี้แจง:</strong> ศรีชัย พร็อพเพอร์ตี้ คุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งานทุกกลุ่ม ทั้ง**ลูกค้าผู้ซื้อบ้าน** และ **นายหน้าผู้ฝากขาย** โดยจัดแบ่งรายละเอียดตามหมวดหมู่เพื่อความชัดเจน
            </div>

            {/* Section 1: Customer Privacy */}
            {(activeTab === 'all' || activeTab === 'customer') && (
              <div className="bg-blue-50/40 border border-blue-100 rounded-3xl p-5 space-y-3">
                <h3 className="text-base font-black text-blue-900 flex items-center gap-2 border-b border-blue-200/60 pb-2">
                  👤 1. การคุ้มครองข้อมูลส่วนบุคคลสำหรับ &quot;ลูกค้า / ผู้ซื้อ&quot;
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  <li><strong>ข้อมูลที่จัดเก็บ:</strong> ชื่อ-นามสกุล, อีเมล, เบอร์โทรศัพท์, ประวัติการนัดหมายเข้าชมบ้าน, และรายการบ้านที่บันทึกเป็นโปรด</li>
                  <li><strong>วัตถุประสงค์:</strong> ใช้สำหรับอำนวยความสะดวกในการส่งคำขอนัดหมายเข้าชมสถานที่จริง และเปิดแชทติดต่อสอบถามนายหน้า</li>
                  <li><strong>การเก็บรักษา:</strong> ข้อมูลเบอร์โทรนัดหมายจะใช้เฉพาะการติดต่อเรื่องการดูบ้านหลังนั้นๆ เท่านั้น และไม่มีการขายข้อมูลให้แก่บุคคลภายนอก</li>
                </ul>
              </div>
            )}

            {/* Section 2: Agent Privacy */}
            {(activeTab === 'all' || activeTab === 'agent') && (
              <div className="bg-amber-50/40 border border-amber-100 rounded-3xl p-5 space-y-3">
                <h3 className="text-base font-black text-amber-900 flex items-center gap-2 border-b border-amber-200/60 pb-2">
                  🏠 2. การคุ้มครองข้อมูลส่วนบุคคลสำหรับ &quot;นายหน้า / ผู้ฝากขาย&quot;
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
                  <li><strong>ข้อมูลที่จัดเก็บ:</strong> เอกสารยืนยันตัวตน KYC (บัตรประชาชน/ใบอนุญาต), เบอร์โทรติดต่อ, <strong>LINE ID</strong>, และสลิปหลักฐานการโอนเงินค่าแพ็กเกจ PRO</li>
                  <li><strong>การแสดงผลสาธารณะ:</strong> เบอร์โทรศัพท์ และ **LINE ID** ของนายหน้าจะแสดงในหน้าประกาศบ้าน เพื่อให้ลูกค้ากดคุย LINE หรือโทรสอบถามได้โดยตรง</li>
                  <li><strong>ประวัติการเงิน:</strong> สลิปโอนเงิน PromptPay ฿599 จะถูกจัดเก็บอย่างปลอดภัยในตาราง `payment_transactions` เพื่อการตรวจสอบทางบัญชีและภาษีของแอดมิน</li>
                </ul>
              </div>
            )}

            {/* General PDPA Rights */}
            <div className="pt-4 border-t space-y-3 text-xs">
              <h3 className="text-sm font-black text-slate-900">🛡️ สิทธิของเจ้าของข้อมูลตามกฎหมาย PDPA (สำหรับทุกคน)</h3>
              <p>ผู้ใช้งานทุกท่าน (ทั้งลูกค้าและนายหน้า) มีสิทธิตามกฎหมายในการ:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>ขอเข้าถึงและขอรับสำเนาข้อมูลส่วนบุคคลของคุณ</li>
                <li>ขอแก้ไขข้อมูลส่วนบุคคลให้ถูกต้อง (ผ่านหน้าโปรไฟล์ `/agent/profile`)</li>
                <li><strong>ขอลบข้อมูลส่วนบุคคลถาวร (Delete Account)</strong> ออกจากระบบได้ตลอดเวลา</li>
              </ul>
            </div>

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
