'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface AppointmentData {
  id: string;
  status: 'completed' | 'pending';
  time: string;
  title: string;
  detail: string;
  note: string;
  propertyTitle: string;
  propertyCode: string;
  customerName: string;
}

export default function AgentHomePage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWorkTab, setActiveWorkTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [currentDate, setCurrentDate] = useState('');
  const [dbData, setDbData] = useState<{
    propertiesCount: number;
    pendingAptsCount: number;
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
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user as { name?: string | null; email?: string | null; status?: string | null };
  const userStatus = user?.status || 'pending';
  const userName = user?.name || 'นายหน้า ศรีชัย';

  // --- 1. หน้าจอแจ้งเตือนระหว่างรออนุมัติ (Pending) ---
  if (userStatus === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-100 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto shadow-md">
            <span className="text-2xl text-slate-950">🕒</span>
          </div>
          <h1 className="text-xl font-black text-slate-800">บัญชีอยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-slate-500 text-xs leading-relaxed">
            ทีมงาน (Admin) กำลังตรวจสอบข้อมูลยืนยันตัวตนของคุณ จะใช้เวลาประมาณ 1-2 วันทำการ เมื่ออนุมัติแล้วจะส่งอีเมลแจ้งเตือนคุณทันที
          </p>
          <button 
            onClick={() => signOut({ callbackUrl: '/login/agent' })}
            className="w-full bg-slate-900 text-white font-extrabold py-3.5 px-6 rounded-xl hover:bg-slate-950 transition shadow"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  // ตัวกรองตารางงาน
  const filteredApts = (dbData?.appointments || []).filter(apt => {
    if (activeWorkTab === 'pending') return apt.status === 'pending';
    if (activeWorkTab === 'completed') return apt.status === 'completed';
    return true;
  });

  return (
    <div className="pt-16 min-h-screen text-slate-800 font-sans antialiased text-xs md:text-sm flex flex-col">

      {/* 2. Main Content Container */}
      <main className="max-w-6xl w-full mx-auto p-4 md:p-8 space-y-6 flex-1">
        
        {/* Welcome Banner */}
        <section className="bg-gradient-to-r from-blue-700 to-blue-800 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg shadow-blue-900/10">
          <div className="space-y-2">
            <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold">📅 {currentDate}</span>
            <h2 className="text-2xl font-black tracking-tight">สวัสดีคุณ{userName.split(' ')[0]} 🚀</h2>
            <p className="text-white/80 text-[11px] leading-relaxed">
              ระบบพบลูกค้าใหม่ที่มีแนวโน้มสนใจอสังหาฯ ในพื้นที่ตรงกับพอร์ตโฟลิโอของคุณจำนวน 3 รายการ
            </p>
          </div>
          <div className="w-full md:w-80">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสอสังหาฯ, ชื่อลูกค้า..." 
              className="w-full bg-white/10 rounded-2xl px-4 py-2 text-white placeholder-white/60 font-semibold text-xs border border-white/20 outline-none"
            />
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ประกาศที่เปิดขาย</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">{dbData?.propertiesCount || 0} รายการ</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">ยอดวิวรวม (30 วัน)</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">1.4K <span className="text-emerald-500 text-[11px]">↑ 12%</span></strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">แชทที่รอตอบ</span>
            <strong className="text-xl md:text-2xl font-black text-red-500 block mt-1">2 รายการ</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">โควต้าคงเหลือ</span>
            <strong className="text-xl md:text-2xl font-black text-slate-800 block mt-1">1 / 3</strong>
          </div>
        </section>

        {/* 2 Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Schedule */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">📅 ตารางงานนัดหมายเข้าชมบ้าน</h3>
              </div>

              {/* Filtering Tabs */}
              <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-100 flex gap-2">
                <button onClick={() => setActiveWorkTab('all')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeWorkTab === 'all' ? 'bg-[#0f172a] text-white' : 'bg-white border text-slate-600'}`}>ทั้งหมด ({dbData?.appointments.length || 0})</button>
                <button onClick={() => setActiveWorkTab('pending')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeWorkTab === 'pending' ? 'bg-[#0f172a] text-white' : 'bg-white border text-slate-600'}`}>รอการดำเนินการ ({dbData?.appointments.filter(a => a.status === 'pending').length || 0})</button>
                <button onClick={() => setActiveWorkTab('completed')} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${activeWorkTab === 'completed' ? 'bg-[#0f172a] text-white' : 'bg-white border text-slate-600'}`}>เสร็จสิ้น ({dbData?.appointments.filter(a => a.status === 'completed').length || 0})</button>
              </div>

              {/* List */}
              <div className="p-5 space-y-4">
                {filteredApts.length === 0 ? (
                  <p className="text-slate-400 text-center font-bold py-6">ไม่มีตารางงานนัดหมายในช่วงนี้</p>
                ) : (
                  filteredApts.map(apt => (
                    <div key={apt.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${apt.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                          {apt.status === 'completed' ? '✓' : '🕒'}
                        </div>
                        <div className="w-0.5 bg-slate-100 flex-1 my-1" />
                      </div>
                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 space-y-2 text-left">
                        <span className="text-[10px] font-bold text-slate-400 block">{apt.time} ({apt.status === 'completed' ? 'เสร็จสิ้นแล้ว' : 'นัดหมายรอพบ'})</span>
                        <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">{apt.title}</h4>
                        <p className="text-slate-500 text-[11px] font-semibold">{apt.detail}</p>
                        <div className={`border-l-2 pl-3 py-0.5 mt-2 ${apt.status === 'completed' ? 'border-emerald-500 bg-emerald-50/10' : 'border-blue-500 bg-blue-50/10'}`}>
                          <p className="text-slate-600 italic text-[10px] leading-relaxed">{apt.note}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-4">
              <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">VERIFIED PRO 👑</span>
              <h3 className="text-base font-black tracking-tight">ขยายธุรกิจแบบไร้ขีดจำกัด</h3>
              <p className="text-slate-400 text-[10px] leading-relaxed">ดันประกาศและฟีเจอร์พรีเมียมเฉพาะตัวแทนที่อัปเกรดเพื่อรับยอดเข้าชมและฐานลูกค้าที่กว้างขวางขึ้น</p>
              <button className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition">ดูรายละเอียด (599.-/เดือน)</button>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm border-b pb-3">📚 ข่าวสาร & คลังความรู้</h4>
              <div className="space-y-3.5 text-left">
                <div className="pb-2 border-b">
                  <span className="text-[9px] font-extrabold text-red-500">ประกาศระบบ (สำคัญ)</span>
                  <h5 className="font-bold text-slate-800 text-[11px] mt-0.5">ข้อควรระวัง: พ.ร.บ. PDPA กับการถ่ายรูปติดบุคคลอื่น</h5>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-blue-600">เทคนิคปิดดีลขาย</span>
                  <h5 className="font-bold text-slate-800 text-[11px] mt-0.5">แจกสคริปต์ตอบแชทชนะใจ พลิกวิกฤตเมื่อลูกค้าต่อราคา</h5>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

    </div>
  );
}
