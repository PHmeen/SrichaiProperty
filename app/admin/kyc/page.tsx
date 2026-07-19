'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AgentData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image: string | null;
  kyc_doc: string | null;
  status: string;
  created_at: string;
}

export default function AdminKycPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchAgents = (status: string) => {
    setLoading(true);
    fetch(`/api/admin/kyc?status=${status}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAgents(data.users);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAgents(activeTab);
  }, [activeTab]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะ ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} บัญชีนี้?`)) return;

    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert("อัปเดตสถานะสำเร็จ");
        fetchAgents(activeTab); // refresh list
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-xs antialiased">
      {/* 🔮 NAVIGATION SIDEBAR */}
      <aside className="w-56 bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl relative z-10">
        <div className="p-5 space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">
              S
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                SrichaiAdmin
              </h1>
              <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </span>
            </div>
          </div>

          <Link 
            href="/home" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30 active:scale-[0.98]"
          >
            🌐 เปิดดูหน้าเว็บไซต์จริง ↗
          </Link>

          <nav className="space-y-6 pt-3">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Overview</span>
              <Link href="/admin/dashboard" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-bold transition-all text-left">
                📊 แดชบอร์ดหลัก
              </Link>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Moderation (ตรวจสอบ)</span>
              
              <Link href="/admin/moderation" className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors text-left font-semibold">
                <span className="flex items-center gap-2">📝 ประกาศอสังหาฯ</span>
              </Link>

              <Link href="/admin/kyc" className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-800 text-white transition-colors text-left font-bold shadow-inner">
                <span className="flex items-center gap-2">🛡️ เอกสารยืนยันตัวตน (KYC)</span>
              </Link>

              <Link href="/admin/reports" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors text-left font-semibold">
                ⚠️ รายงานปัญหา (Reports)
              </Link>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Management</span>
              <Link href="/admin/users" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors text-left font-semibold">
                👥 ฐานข้อมูลผู้ใช้
              </Link>
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center shadow-inner">
              A
            </div>
            <div>
              <p className="text-white font-black text-xs">Admin Root</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Super Administrator</p>
            </div>
          </div>
          <button className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">
            🚪
          </button>
        </div>
      </aside>

      {/* 💼 WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
          <h2 className="text-lg font-extrabold text-slate-800">ตรวจสอบเอกสารยืนยันตัวตน (KYC Moderation)</h2>
          
          <div className="relative w-72">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
            <input 
              type="text" 
              placeholder="ค้นหารหัส ID, ชื่อผู้ใช้..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700"
            />
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              รอตรวจสอบบัญชีนายหน้า 
              {activeTab === 'pending' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px]">ใหม่</span>}
            </button>
            <button 
              onClick={() => setActiveTab('approved')}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'approved' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              ตรวจสอบแล้ว
            </button>
            <button 
              onClick={() => setActiveTab('rejected')}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'rejected' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              ไม่อนุมัติ (ตีกลับ)
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-slate-500 font-bold">กำลังโหลดข้อมูลผู้ใช้...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายการ{activeTab === 'pending' ? 'รอตรวจสอบ' : ''}</h3>
              <p className="text-slate-500 font-medium">ไม่มีข้อมูลนายหน้าในสถานะนี้</p>
            </div>
          ) : (
            <div className="space-y-6">
              {agents.map((agent) => (
                <div key={agent.id} className="bg-white rounded-2xl border-2 border-amber-500/20 shadow-sm overflow-hidden flex flex-col">
                  {/* Card Main Content */}
                  <div className="flex flex-col xl:flex-row p-6 gap-6">
                    {/* Left: Info */}
                    <div className="xl:w-1/3 flex flex-col gap-6 border-r border-slate-100 pr-6">
                      
                      <div className="flex items-center gap-2">
                         <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md border border-blue-100 tracking-wider">ขออัปเกรดเป็น AGENT (R2)</span>
                         <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 uppercase">User ID: {agent.id.slice(0, 8)}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        {agent.profile_image ? (
                           <img src={agent.profile_image} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm" />
                        ) : (
                           <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-black border-2 border-white shadow-sm">
                             {agent.first_name?.[0]}{agent.last_name?.[0]}
                           </div>
                        )}
                        <div>
                          <h3 className="text-lg font-extrabold text-slate-900">{agent.first_name} {agent.last_name}</h3>
                          <p className="text-slate-400 font-medium text-xs">@{agent.first_name.toLowerCase()}_agent</p>
                        </div>
                      </div>

                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 text-xs">
                          <span className="text-slate-500 font-bold">อีเมล (Email):</span>
                          <span className="text-slate-800 font-semibold">{agent.email}</span>
                        </div>
                        <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 text-xs">
                          <span className="text-slate-500 font-bold">เบอร์โทร (Phone):</span>
                          <span className="text-slate-800 font-semibold">{agent.phone || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-bold">วันที่ส่งข้อมูล:</span>
                          <span className="text-slate-800 font-semibold">{new Date(agent.created_at).toLocaleString('th-TH')}</span>
                        </div>
                      </div>

                      {/* Checklist */}
                      {activeTab === 'pending' && (
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
                          <h4 className="text-[10px] font-black text-amber-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                             <span>📋</span> Admin Checklist (ส่วนตรวจสอบ)
                          </h4>
                          <div className="space-y-2.5">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                              <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                              <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">รูปภาพเอกสารชัดเจน อ่านง่าย</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                              <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                              <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">ชื่อ-สกุล ตรงกับข้อมูลที่กรอกมา</span>
                            </label>
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                              <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                              <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">เอกสารยังไม่หมดอายุ</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Images */}
                    <div className="xl:w-2/3 flex gap-4 overflow-x-auto pb-2">
                       {/* KYC Doc Image */}
                       <div className="relative min-w-[320px] max-w-[400px] h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group">
                         <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-md z-10">ภาพถ่ายบัตรประชาชน</div>
                         {agent.kyc_doc ? (
                           <img src={agent.kyc_doc} alt="KYC Document" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                             <span className="text-4xl mb-2">📸</span>
                             <span className="text-xs font-bold">ไม่มีไฟล์เอกสาร</span>
                           </div>
                         )}
                       </div>

                       {/* Profile Image */}
                       <div className="relative min-w-[200px] max-w-[280px] h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group">
                         <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-md z-10">ภาพถ่ายหน้าตัวเอง</div>
                         {agent.profile_image ? (
                           <img src={agent.profile_image} alt="Selfie" className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                         ) : (
                           <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                             <span className="text-4xl mb-2">👤</span>
                             <span className="text-xs font-bold">ไม่มีรูปโปรไฟล์</span>
                           </div>
                         )}
                       </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  {activeTab === 'pending' && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-amber-600">รอตรวจสอบเอกสาร (Status: Pending)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleUpdateStatus(agent.id, 'rejected')}
                          className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-all text-xs flex items-center gap-2"
                        >
                          <span>✕</span> ไม่อนุมัติ (ตีกลับ)
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(agent.id, 'approved')}
                          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/30 active:scale-95 text-xs flex items-center gap-2"
                        >
                          <span>✓</span> อนุมัติบัญชีนายหน้า
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
