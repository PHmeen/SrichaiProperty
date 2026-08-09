'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// จัดรูปแบบข้อความเอกสารให้อ่านง่าย โดยไม่แสดงสัญลักษณ์ #, ** ดิบๆ
function formatDocument(text: string) {
  return text.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') return null;
    if (trimmed.startsWith('# ')) return { type: 'h1', text: trimmed.slice(2) };
    if (trimmed.startsWith('### ')) return { type: 'h3', text: trimmed.slice(4) };
    if (trimmed.startsWith('- ')) return { type: 'li', text: trimmed.slice(2) };
    return { type: 'p', text: trimmed };
  }).filter(Boolean) as { type: string; text: string }[];
}

function formatBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong>
      : part
  );
}

export default function PrivacyPolicyPage() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'customer' | 'agent'>('all');

  useEffect(() => {
    fetch('/api/legal?type=privacy')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.content) setContent(data.content);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">นโยบายความเป็นส่วนตัว</h1>
            <p className="text-xs text-slate-400 mt-0.5">การคุ้มครองข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</p>
          </div>
          <Link href="/home" className="px-3.5 py-1.5 bg-slate-100 font-bold text-xs rounded-xl text-slate-700 hover:bg-slate-200 transition">
            ← หน้าหลัก
          </Link>
        </div>

        <div className="flex gap-2 bg-slate-200/60 p-1.5 rounded-xl max-w-md">
          <button onClick={() => setActiveTab('all')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-600'}`}>ทั้งหมด</button>
          <button onClick={() => setActiveTab('customer')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'customer' ? 'bg-blue-600 shadow text-white' : 'text-slate-600'}`}>ผู้ซื้อ</button>
          <button onClick={() => setActiveTab('agent')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition ${activeTab === 'agent' ? 'bg-amber-500 shadow text-slate-950' : 'text-slate-600'}`}>นายหน้า</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 text-xs text-slate-700 leading-relaxed">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-800 font-medium">
                ไม่สามารถโหลดข้อมูลล่าสุดได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง หรือติดต่อทีมงาน
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-blue-900 font-medium">
              <strong>สรุปสาระสำคัญ:</strong> บริษัทจัดเก็บและใช้ข้อมูลส่วนบุคคลแยกตามกลุ่มผู้ใช้งาน ทั้งฝั่งลูกค้าผู้ซื้อบ้านและฝั่งนายหน้าผู้ฝากขาย ตามรายละเอียดด้านล่าง
            </div>

            {(activeTab === 'all' || activeTab === 'customer') && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-2">
                <h3 className="font-black text-blue-900 text-xs border-b pb-1">สำหรับลูกค้า / ผู้ซื้อ</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>ข้อมูลที่จัดเก็บ:</strong> ชื่อ-นามสกุล, อีเมล, เบอร์โทรศัพท์, และประวัตินัดหมายเข้าชมบ้าน</li>
                  <li><strong>วัตถุประสงค์:</strong> เพื่อส่งคำขอนัดหมายดูบ้าน และเปิดแชท/LINE ติดต่อนายหน้า</li>
                </ul>
              </div>
            )}

            {(activeTab === 'all' || activeTab === 'agent') && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2">
                <h3 className="font-black text-amber-900 text-xs border-b pb-1">สำหรับนายหน้า / ผู้ฝากขาย</h3>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li><strong>ข้อมูลที่จัดเก็บ:</strong> เอกสาร KYC, เบอร์โทรศัพท์, LINE ID, และสลิปการโอนเงิน PRO ฿599</li>
                  <li><strong>การแสดงผลสาธารณะ:</strong> LINE ID และเบอร์โทร จะแสดงในหน้าบ้านเพื่อให้ลูกค้ากดคุย LINE หรือโทรสอบถาม</li>
                </ul>
              </div>
            )}

            {content && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <h3 className="font-black text-slate-900 text-xs border-b pb-1 mb-1">เอกสารฉบับเต็ม</h3>
                {formatDocument(content).map((line, i) => {
                  if (line.type === 'h1') return <h4 key={i} className="font-black text-slate-900 text-sm pt-1">{formatBold(line.text)}</h4>;
                  if (line.type === 'h3') return <h5 key={i} className="font-bold text-slate-800 text-xs pt-2">{formatBold(line.text)}</h5>;
                  if (line.type === 'li') return <li key={i} className="ml-4 list-disc text-slate-600">{formatBold(line.text)}</li>;
                  return <p key={i} className="text-slate-600">{formatBold(line.text)}</p>;
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
