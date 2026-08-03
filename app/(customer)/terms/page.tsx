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
      .then(data => { if (data.content) setContent(data.content); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">📜 ข้อกำหนดและเงื่อนไขการใช้งาน (Terms & Conditions)</h1>
            <p className="text-xs text-slate-400 mt-0.5">ข้อตกลงและเงื่อนไขการใช้บริการสำหรับผู้ซื้อและนายหน้า</p>
          </div>
          <Link href="/home" className="px-3.5 py-1.5 bg-slate-100 font-bold text-xs rounded-xl text-slate-700 hover:bg-slate-200 transition">
            ← หน้าหลัก
          </Link>
        </div>

        <div className="flex gap-2 bg-slate-200/60 p-1.5 rounded-xl max-w-md">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>🌐 ทั้งหมด</button>
          <button onClick={() => setActiveTab('customer')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'customer' ? 'bg-blue-600 shadow text-white' : 'text-slate-600'}`}>👤 ผู้ซื้อ</button>
          <button onClick={() => setActiveTab('agent')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'agent' ? 'bg-amber-500 shadow text-slate-950' : 'text-slate-600'}`}>🏠 นายหน้า</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 text-xs text-slate-700 leading-relaxed">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 font-medium">
              📌 <strong>คำแจ้งเตือน:</strong> การใช้งานถือว่ายอมรับข้อตกลงและเงื่อนไขของแพลตฟอร์ม Srichai Property โดยสมบูรณ์
            </div>

            {(activeTab === 'all' || activeTab === 'customer') && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-2">
                <h3 className="font-black text-blue-900 text-xs border-b pb-1">👤 ข้อกำหนดสำหรับลูกค้า / ผู้ซื้อบ้าน</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>นัดหมายเข้าชมบ้าน:</strong> ต้องระบุวันเวลาและเบอร์ติดต่อจริงเพื่อความสะดวกในการนัดหมายกับนายหน้า</li>
                  <li><strong>การติดต่อนายหน้า:</strong> กดปุ่มคุย LINE หรือ โทรศัพท์ เพื่อสอบถามรายละเอียดบ้านได้โดยตรง</li>
                </ul>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'agent') && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2">
                <h3 className="font-black text-amber-900 text-xs border-b pb-1">🏠 ข้อกำหนดสำหรับนายหน้า / ผู้ฝากขาย</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>ความถูกต้องของประกาศ:</strong> ต้องระบุข้อมูลและรูปภาพบ้านที่เป็นจริง ไม่อนุญาตให้ลงประกาศบิดเบือน</li>
                  <li><strong>สิทธิ์ Verified PRO (฿599):</strong> สิทธิ์โควต้าไม่จำกัด และสิทธิ์ดันโพสต์ 30 วัน เมื่อได้รับการอนุมัติสลิปจากแอดมิน</li>
                </ul>
              </div>
            )}

            {content && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono whitespace-pre-wrap text-[11px]">
                {content}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
