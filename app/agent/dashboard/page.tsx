'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface PropertyData {
  id: string;
  title: string;
  price: string;
  type: string;
  status: 'approved' | 'pending';
  image: string;
  views: number;
  appointments: number;
}

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();
  const [filterType, setFilterType] = useState('all');
  const [dbData, setDbData] = useState<{
    properties: PropertyData[];
    totalPortfolioValue: string;
    pendingAptsCount: number;
    totalCount: number;
  } | null>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/agent/portal?type=dashboard')
        .then(res => res.json())
        .then(data => setDbData(data))
        .catch(err => console.error('Error fetching dashboard:', err));
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user as { name?: string | null; email?: string | null; status?: string | null };
  const userStatus = user?.status || 'pending';
  const userName = user?.name || 'นายหน้า ศรีชัย';

  // --- 1. หน้าจอรออนุมัติ (Pending) ---
  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto text-2xl text-slate-950">🕒</div>
          <h1 className="text-xl font-black">บัญชีอยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-slate-500 text-xs">ทีมงานจะใช้เวลาตรวจสอบ KYC 1-2 วันทำการ เพื่อความปลอดภัยของระบบ</p>
          <button onClick={() => signOut({ callbackUrl: '/login/agent' })} className="w-full bg-slate-900 text-white font-extrabold py-3.5 rounded-xl">ออกจากระบบ</button>
        </div>
      </div>
    );
  }

  const filteredProperties = (dbData?.properties || []).filter(p => {
    if (filterType === 'approved') return p.status === 'approved';
    if (filterType === 'pending') return p.status === 'pending';
    return true;
  });

  return (
    <div className="pt-16 min-h-screen text-slate-800 font-sans antialiased text-xs md:text-sm flex flex-col">

      {/* 2. Main Content Container */}
      <main className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6 flex-1">
        
        {/* Top Gold Promo Banner */}
        <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-3xl p-5 text-white border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-left">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20 text-lg">👑</div>
            <div className="space-y-1">
              <h4 className="font-black text-sm md:text-base">ยกระดับโปรไฟล์ด้วยแพ็กเกจ Verified PRO</h4>
              <p className="text-slate-400 text-[10px] md:text-xs">อัปเกรดวันนี้เพื่อลงประกาศได้ไม่จำกัดจำนวน และรับสิทธิพิเศษการดันโพสต์ฟรี!</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shrink-0">อัปเกรด (599.- / เดือน)</button>
        </section>

        {/* Page Title & Add Button */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h2 className="text-xl md:text-2xl font-black text-slate-900">ภาพรวมการทำงาน ({userName}) 👋</h2>
            <p className="text-slate-500 text-xs mt-1">แผงควบคุมสำหรับจัดการรายการประกาศอสังหาริมทรัพย์ของคุณในระบบ</p>
          </div>
          <Link href="/agent/add-property" className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition">
            + ลงประกาศใหม่ (เหลือ 1 สิทธิ์ฟรี)
          </Link>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ประกาศของคุณ</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">{dbData?.totalCount || 0} / 3</strong>
            <div className="mt-2 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(((dbData?.totalCount || 0) / 3) * 100, 100)}%` }} />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ยอดเข้าชมทั้งหมด</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">1,452 <span className="text-emerald-500 text-[10px]">↑ 14%</span></strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ลูกค้าเป้าหมาย (LEADS)</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">{dbData?.pendingAptsCount || 0}</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl md:text-2xl font-black text-blue-600 block mt-1">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
          </div>
        </section>

        {/* Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Properties Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">ประกาศอสังหาฯ ของฉัน</h3>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="pending">รอการตรวจสอบ</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-1">อสังหาริมทรัพย์</th>
                      <th className="py-3 px-3 text-center">สถิติ (30 วัน)</th>
                      <th className="py-3 px-3 text-center">สถานะ</th>
                      <th className="py-3 px-1 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProperties.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400 font-bold">ไม่พบบันทึกประกาศอสังหาริมทรัพย์</td>
                      </tr>
                    ) : (
                      filteredProperties.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/30 transition">
                          <td className="py-4 px-1 flex gap-3 items-center text-left">
                            <img src={p.image} alt="property" className="w-16 h-12 rounded-lg object-cover border shrink-0" />
                            <div>
                              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">{p.title}</h4>
                              <span className="text-blue-600 font-extrabold text-[11px] block mt-0.5">{p.price}</span>
                            </div>
                          </td>
                          <td className="py-4 px-3 text-center font-bold text-slate-500 text-[11px]">
                            <div><span className="text-slate-900">{p.views}</span> เข้าชม</div>
                            <div className="text-[10px] text-slate-400 mt-0.5"><span className="text-slate-800">{p.appointments}</span> นัดหมาย</div>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border inline-block ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                              {p.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                            </span>
                          </td>
                          <td className="py-4 px-1 text-right">
                            <div className="flex items-center justify-end gap-3 text-xs font-bold text-slate-600">
                              <button className="hover:text-blue-600 transition">📝 แก้ไข</button>
                              <button className="hover:text-red-500 transition">🗑️ ลบ</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Info status */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 text-left">
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm border-b pb-3">สถานะบัญชีปัจจุบัน</h4>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
                <span className="text-emerald-700 font-extrabold text-xs">✓ ยืนยันตัวตนแล้ว (Basic)</span>
              </div>
              <p className="text-slate-500 text-[10px] leading-relaxed">
                คุณได้รับการยืนยันตัวตนในฐานะพาร์ทเนอร์นายหน้าอย่างถูกต้อง สามารถเปลี่ยนแพ็กเกจเพิ่มสิทธิพิเศษด้านการบูสต์ได้ทุกเมื่อ
              </p>
              <button className="w-full py-3 bg-[#0f172a] hover:bg-[#1e293b] text-white font-extrabold rounded-xl text-xs transition">อัปเกรดเป็น Verified PRO</button>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
