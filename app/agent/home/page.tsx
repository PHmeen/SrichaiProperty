'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';

interface AppointmentData {
  id: string;
  status: 'completed' | 'pending';
  date: string;
  time: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
}

export default function AgentHomePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentDate, setCurrentDate] = useState('');
  const [dbData, setDbData] = useState<{
    propertiesCount: number;
    pendingAptsCount: number;
    pendingApprovalCount?: number;
    isPro?: boolean;
    totalViews: number;
    pendingChatCount: number;
    appointments: AppointmentData[];
  } | null>(null);

  useEffect(() => {
    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const now = new Date();
    const formattedDate = `${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} (${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.)`;

    const timer = setTimeout(() => {
      setCurrentDate(formattedDate);
    }, 0);

    if (status === 'authenticated') {
      fetch('/api/agent/portal?type=home')
        .then(res => res.json())
        .then(data => setDbData(data))
        .catch(err => console.error('Error fetching home data:', err));
    }

    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user as { name?: string | null; status?: string | null };
  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md space-y-4">
          <div className="text-4xl">🕒</div>
          <h1 className="text-lg font-black">บัญชีอยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-xs text-slate-500">ทีมงานกำลังตรวจสอบข้อมูลของคุณ เมื่อเรียบร้อยจะแจ้งให้ทราบทันที</p>
          <button onClick={() => signOut({ callbackUrl: '/login/agent' })} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">ออกจากระบบ</button>
        </div>
      </div>
    );
  }

  // ตัวกรองตารางงานตามสถานะ
  const filteredApts = (dbData?.appointments || []).filter(apt => {
    if (activeTab === 'pending') return apt.status === 'pending';
    if (activeTab === 'completed') return apt.status === 'completed';
    return true;
  });

  const pendingApprovalCount = dbData?.pendingApprovalCount || 0;
  const pendingChatCount = dbData?.pendingChatCount || 0;
  const pendingAptsCount = dbData?.pendingAptsCount || 0;

  return (
    <div className="pt-16 min-h-screen bg-slate-50/50 text-slate-800 text-xs md:text-sm font-sans antialiased">
      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 text-left">
        
        {/* Banner แจ้งเตือนรออนุมัติ */}
        <PendingApprovalBanner pendingCount={pendingApprovalCount} />

        {/* Welcome Header */}
        <section className="bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-blue-900/10 space-y-2">
          <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold border border-white/10 inline-block">📅 {currentDate}</span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">สวัสดีคุณ{user?.name?.split(' ')[0] || 'นายหน้า'} 🚀</h2>
          <p className="text-white/80 text-xs leading-relaxed max-w-xl">
            ยินดีต้อนรับสู่ศูนย์บัญชาการนายหน้าศรีชัยพรอพเพอร์ตี้ ตรวจสอบรายการคิวนัดหมายและตอบแชทลูกค้าได้ทันที
          </p>
        </section>

        {/* 4 ปุ่มลัดพรีเมียม (Quick Actions) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/agent/dashboard" className="group bg-white hover:bg-amber-50/60 rounded-2xl p-4 border border-slate-100 hover:border-amber-400 shadow-2xs hover:shadow-md transition flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-100 group-hover:bg-amber-500 group-hover:text-white text-lg flex items-center justify-center shrink-0 transition">🏘️</span>
            <div className="min-w-0">
              <p className="font-black text-slate-900">จัดการบ้าน</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">ประกาศของฉัน</p>
            </div>
          </Link>

          <Link href="/agent/appointments" className="group bg-white hover:bg-blue-50/60 rounded-2xl p-4 border border-slate-100 hover:border-blue-400 shadow-2xs hover:shadow-md transition flex items-center gap-3 relative">
            <span className="w-10 h-10 rounded-xl bg-blue-100 group-hover:bg-blue-500 group-hover:text-white text-lg flex items-center justify-center shrink-0 transition">📋</span>
            <div className="min-w-0">
              <p className="font-black text-slate-900">คิวนัดหมาย</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">พาลูกค้าชมบ้าน</p>
            </div>
            {pendingAptsCount > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                {pendingAptsCount}
              </span>
            )}
          </Link>

          <Link href="/agent/chat" className="group bg-white hover:bg-emerald-50/60 rounded-2xl p-4 border border-slate-100 hover:border-emerald-400 shadow-2xs hover:shadow-md transition flex items-center gap-3 relative">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-500 group-hover:text-white text-lg flex items-center justify-center shrink-0 transition">💬</span>
            <div className="min-w-0">
              <p className="font-black text-slate-900">ข้อความแชท</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">ตอบแชทลูกค้า</p>
            </div>
            {pendingChatCount > 0 && (
              <span className="absolute top-2.5 right-2.5 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                {pendingChatCount}
              </span>
            )}
          </Link>

          <Link href="/agent/add-property" className="group bg-white hover:bg-purple-50/60 rounded-2xl p-4 border border-slate-100 hover:border-purple-400 shadow-2xs hover:shadow-md transition flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple-100 group-hover:bg-purple-500 group-hover:text-white text-lg flex items-center justify-center shrink-0 transition">➕</span>
            <div className="min-w-0">
              <p className="font-black text-slate-900">ลงประกาศ</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate">เพิ่มทรัพย์สินใหม่</p>
            </div>
          </Link>
        </section>

        {/* 4 Cards สถิติตัวเลขหลัก */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">ประกาศทั้งหมด</span>
            <strong className="text-xl font-black text-slate-900 block mt-1">{dbData?.propertiesCount || 0} รายการ</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">ยอดเข้าชมรวม</span>
            <strong className="text-xl font-black text-slate-900 block mt-1">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">แชทที่รอตอบ</span>
            <strong className={`text-xl font-black block mt-1 ${pendingChatCount > 0 ? 'text-red-500' : 'text-slate-900'}`}>{pendingChatCount} รายการ</strong>
          </div>
          <Link href="/agent/upgrade" className="bg-white hover:bg-amber-50/50 rounded-2xl p-4 border border-slate-100 hover:border-amber-400 shadow-2xs hover:shadow-md transition block group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">โควต้าลงประกาศ</span>
              <span className="text-[10px] font-black text-amber-600 group-hover:underline">อัปเกรด PRO →</span>
            </div>
            <strong className="text-xl font-black text-amber-600 block mt-1">
              {dbData?.isPro ? 'ไม่จำกัด 👑' : `${Math.max(0, 3 - (dbData?.propertiesCount || 0))} / 3`}
            </strong>
          </Link>
        </section>

        {/* 📅 ตารางนัดหมายพาลูกค้าชมบ้าน (Single Column Full Width Layout) */}
        <section className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">📅 ตารางนัดหมายพาลูกค้าชมบ้าน</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">รายการคิวนัดหมายจากฐานข้อมูลเรียลไทม์</p>
            </div>
            <Link href="/agent/appointments" className="text-blue-600 font-bold text-xs hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>

          {/* สวิตช์แถบกรอง */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100 flex gap-2">
            <button onClick={() => setActiveTab('all')} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${activeTab === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>ทั้งหมด ({dbData?.appointments.length || 0})</button>
            <button onClick={() => setActiveTab('pending')} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${activeTab === 'pending' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>รอนัดพบ ({dbData?.appointments.filter(a => a.status === 'pending').length || 0})</button>
            <button onClick={() => setActiveTab('completed')} className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${activeTab === 'completed' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>เสร็จสิ้นแล้ว ({dbData?.appointments.filter(a => a.status === 'completed').length || 0})</button>
          </div>

          {/* รายการนัดหมาย */}
          <div className="p-5 space-y-3">
            {filteredApts.length === 0 ? (
              <p className="py-10 text-center text-slate-400 font-bold">ไม่มีรายการนัดหมายในขณะนี้</p>
            ) : (
              filteredApts.map(apt => (
                <div key={apt.id} className="p-4 bg-slate-50/70 border border-slate-100 hover:border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-700">📅 {apt.date || 'ไม่ระบุวัน'} ({apt.time})</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                        {apt.status === 'completed' ? 'เสร็จสิ้นแล้ว' : 'รอนัดพบ'}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">🏠 {apt.propertyTitle}</h4>
                    <p className="text-slate-600 text-xs font-medium">👤 ลูกค้า: <strong>{apt.customerName}</strong></p>
                  </div>

                  <a href={`tel:${apt.customerPhone}`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs text-center transition shrink-0 shadow-2xs">
                    📞 โทรหา ({apt.customerPhone})
                  </a>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}