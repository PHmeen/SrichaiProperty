'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ModerationItem {
  id: string;
  title: string;
  code: string;
  price: string;
  seller: string;
  plan: string;
  isVerified?: boolean;
  sla: string;
  slaUrgent?: boolean;
  image?: string;
}

interface NewAgent {
  id: string;
  name: string;
  timeAgo: string;
  isNdidVerified: boolean;
  initials: string;
}

export default function AdminDashboardPage() {
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [newAgents, setNewAgents] = useState<NewAgent[]>([]);

  const [pendingCount, setPendingCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [proAgentsCount, setProAgentsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);

  const [loading, setLoading] = useState(true);

  // --- 1. Terminal Log State ---
  const [logs, setLogs] = useState<string[]>([
    '[12:45:02] INFO Admin_Root initiated secure session.',
    '[12:40:15] SUCCESS Listing PRJ-9921 approved by Admin_John.',
    '[12:35:50] SYSTEM Automated cron: Renewed 15 PRO listings.',
    '[12:30:11] ALERT Multiple failed logins detected from IP 192.168.x.x',
    '[12:15:22] DATA_MASK Agent AGT-889 updated profile. Sensitive fields locked by NUD policy.',
    '[11:55:10] SUCCESS REBA Document approved for AGT-112.',
  ]);

  const addLog = (newLog: string) => {
    setLogs(prev => [newLog, ...prev]);
  };

  // --- 2. ดึงข้อมูลจากฐานข้อมูลจริงเมื่อโหลดหน้าจอ ---
  const fetchDashboardData = () => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPendingCount(data.pendingCount);
          setOnlineCount(data.onlineCount);
          setAgentsCount(data.agentsCount);
          setProAgentsCount(data.proAgentsCount);
          setModerationItems(data.moderationItems);
          setNewAgents(data.newAgents);
          setReportsCount(data.reportsCount);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching admin dashboard data:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- 3. ฟังก์ชันส่งคำขออนุมัติไปยังฐานข้อมูลจริง (PATCH) ---
  const handleApprove = async (id: string, title: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[${new Date().toLocaleTimeString('th-TH')}] SUCCESS: Approved "${title}" by Admin_Root.`);
        alert(`อนุมัติคำขอ "${title}" และเผยแพร่ขึ้นฐานข้อมูลสำเร็จ`);
        fetchDashboardData(); // ดึงข้อมูลใหม่
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"));
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  // --- 4. ฟังก์ชันส่งคำขอปฏิเสธไปยังฐานข้อมูลจริง (PATCH) ---
  const handleReject = async (id: string, title: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' })
      });
      const data = await res.json();
      if (data.success) {
        addLog(`[${new Date().toLocaleTimeString('th-TH')}] REJECTED: Rejected "${title}" by Admin_Root.`);
        alert(`ปฏิเสธคำขอ "${title}" เรียบร้อยแล้ว`);
        fetchDashboardData(); // ดึงข้อมูลใหม่
      } else {
        alert("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"));
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-bold text-slate-500">
        🔄 กำลังดึงข้อมูลจากระบบฐานข้อมูลกลาง...
      </div>
    );
  }

  return (
    <>
      {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          {/* Search Box */}
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
            <input 
              type="text" 
              placeholder="ค้นหาประกาศ (PRJ-XXX), รหัสนายหน้า..." 
              className="w-full pl-8 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            />
          </div>

          {/* Admin Stats Status */}
          <div className="flex items-center gap-4">
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border border-slate-200">
              IP: 192.168.1.1 (Secure)
            </span>
            <button className="relative w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors">
              🔔
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Dashboard Content Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Title Area */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-none">ภาพรวมระบบ (System Overview)</h2>
            <p className="text-slate-400 text-[10px] font-bold mt-1.5 flex items-center gap-1.5">
              ข้อมูลอัปเดตแบบ Real-time <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">Live</span>
            </p>
          </div>

          {/* ==================================================== */}
          {/* 📊 4 KPI CARDS ROW                                   */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: รอตรวจสอบ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-red-200 transition-colors">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ประกาศรอตรวจสอบ</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{pendingCount}</span>
                  <span className="text-[9px] font-extrabold text-red-500">ต้องการอนุมัติ!</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-lg font-bold shadow-sm">
                ⚠️
              </div>
            </div>

            {/* Card 2: ประกาศออนไลน์ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ประกาศออนไลน์</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{onlineCount.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shadow-sm">
                🏠
              </div>
            </div>

            {/* Card 3: นายหน้าทั้งหมด */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">นายหน้าทั้งหมด (AGENTS)</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{agentsCount}</span>
                  <span className="text-[9px] font-extrabold text-emerald-500">↑ +12 สัปดาห์นี้</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold shadow-sm">
                👥
              </div>
            </div>

            {/* Card 4: ผู้ใช้ระดับ PRO */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-colors">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ผู้ใช้ระดับ PRO</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-slate-900">{proAgentsCount}</span>
                  <span className="text-[9px] font-extrabold text-slate-400">คิดเป็น {agentsCount ? ((proAgentsCount / agentsCount) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg font-bold shadow-sm">
                ⚡
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* 📝 LISTING MODERATION & TERMINAL LOGS GRID          */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ฝั่งซ้าย: คิวตรวจสอบประกาศ และนายหน้าใหม่ (lg:col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* คิวตรวจสอบประกาศ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      📋 คิวตรวจสอบประกาศ (Listing Moderation)
                    </h3>
                    <p className="text-slate-400 text-[9px] mt-0.5">*แสดงเฉพาะเรื่องตรวจเช็คความถูกต้องก่อนแสดงผลสู่สาธารณะ</p>
                  </div>
                  <Link href="/admin/moderation" className="text-blue-600 hover:text-blue-700 font-extrabold hover:underline">
                    ดูคิวทั้งหมด
                  </Link>
                </div>

                <div className="divide-y divide-slate-100">
                  {moderationItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      🎉 ไม่มีคำขอค้างในระบบ ตรวจสอบเรียบร้อยหมดแล้ว!
                    </div>
                  ) : (
                    moderationItems.map((item) => (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.title} 
                              className="w-11 h-11 rounded-lg object-cover shadow-sm border border-slate-100" 
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-base">
                              🖼️
                            </div>
                          )}
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              ID: {item.code} - <span className="text-blue-700 font-bold">{item.price}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-left sm:text-right">
                            <p className="font-bold text-slate-700 flex items-center gap-1">
                              {item.seller}
                              {item.isVerified && <span className="text-[9px]" title="ยืนยันตัวตนแล้ว">Verified ✔</span>}
                            </p>
                            <p className="text-[8px] text-amber-600 font-black uppercase mt-0.5">{item.plan}</p>
                          </div>

                          <div className="text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${
                              item.slaUrgent 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-red-50 text-red-600 border border-red-200'
                            }`}>
                              {item.sla}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-all">
                              🔍 พรีวิว
                            </button>
                            <button 
                              onClick={() => handleApprove(item.id, item.title)}
                              className="w-7 h-7 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md flex items-center justify-center font-bold transition-all shadow"
                              title="อนุมัติการเผยแพร่"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={() => handleReject(item.id, item.title)}
                              className="w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-md flex items-center justify-center font-bold transition-all shadow"
                              title="ปฏิเสธคำขอ"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* สมาชิกสมัครใหม่ */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center justify-between">
                    <span>👥 สมาชิกสมัครใหม่ (New Agents)</span>
                    <span className="text-[9px] text-slate-400 font-black uppercase">📃 NDID Compliant Data</span>
                  </h3>
                </div>

                <div className="p-4 divide-y divide-slate-100">
                  {newAgents.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-bold">
                      ไม่มีรายชื่อนายหน้าใหม่
                    </div>
                  ) : (
                    newAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                            {agent.initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {agent.name}
                              <span className="text-[9px] text-slate-400 font-semibold">{agent.timeAgo}</span>
                            </div>
                            <span className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5">
                              ✓ ยืนยันตัวตน NDID แล้ว
                            </span>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-all">
                          ดูโปรไฟล์
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* ฝั่งขวา: Audit Logs & Reports (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* System Audit Logs Window */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[280px]">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-white font-extrabold flex items-center gap-2">
                    💻 System Audit Logs
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {/* Console Log content */}
                <div className="flex-1 p-4 font-mono text-[9px] text-slate-300 space-y-1.5 overflow-y-auto leading-relaxed bg-[#0b0f19]">
                  {logs.map((log, idx) => {
                    let textClass = 'text-slate-400';
                    if (log.includes('SUCCESS')) textClass = 'text-emerald-400';
                    if (log.includes('ALERT')) textClass = 'text-red-400 font-bold';
                    if (log.includes('SYSTEM')) textClass = 'text-blue-400';
                    return (
                      <p key={idx} className={textClass}>
                        {log}
                      </p>
                    );
                  })}
                  <div className="flex items-center gap-1 pt-1.5">
                    <span className="text-slate-500 font-bold">admin@srichai:~#</span>
                    <span className="w-1.5 h-3 bg-slate-300 animate-pulse"></span>
                  </div>
                </div>
              </div>

              {/* รายงานปัญหา (User Reports) */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-red-700 font-extrabold flex items-center gap-1.5 text-xs">
                  ⚠️ รายงานปัญหา (User Reports)
                </h4>
                <p className="text-[10px] text-red-600 font-semibold leading-relaxed">
                  ระบบตรวจพบรายงานจากลูกค้า {reportsCount} รายการ กรณีนี้จำเป็นต้องผ่านการอนุมัติการตรวจสอบข้อมูลลูกค้าทั้งหมดก่อนบันทึกสถานะ (เพื่อการตรวจสอบความปลอดภัยระบบเท่านั้น)
                </p>
                <Link 
                  href="/admin/reports" 
                  className="w-full bg-white hover:bg-slate-50 border border-red-200 text-red-600 font-black py-2 rounded-lg flex items-center justify-center shadow-sm transition-colors text-center block"
                >
                  ตรวจสอบรายงาน
                </Link>
              </div>

            </div>

          </div>

        </div>
    </>
  );
}
