'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReportData {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    role: string;
  } | null;
  reportedAgent: {
    id: string;
    name: string;
    role: string;
  } | null;
  property: {
    id: string;
    title: string;
  } | null;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');

  const fetchReports = (status: string) => {
    fetch(`/api/admin/reports?status=${status}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReports(data.reports);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab]);

  const handleAction = async (reportId: string, newStatus: string, action?: string, agentId?: string) => {
    let confirmMsg = `ต้องการปรับสถานะรายงานนี้เป็น ${newStatus === 'resolved' ? 'แก้ไขแล้ว' : 'ปัดตก'}?`;
    if (action === 'ban') confirmMsg = `⚠️ คุณต้องการ "ระงับบัญชี (BAN)" นายหน้าคนนี้ถาวรหรือไม่?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus, action, agentId })
      });
      const data = await res.json();
      if (data.success) {
        alert("ดำเนินการเรียบร้อยแล้ว");
        fetchReports(activeTab);
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการทำรายการ");
    }
  };

  return (
    <>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
          <h2 className="text-lg font-extrabold text-slate-800">ตรวจสอบรายงานปัญหา (Reports & Complaints)</h2>
          <div className="relative w-72">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
            <input type="text" placeholder="ค้นหา Ticket ID, ชื่อผู้ใช้..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700" />
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button 
              onClick={() => { setActiveTab('pending'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              รอตรวจสอบ {activeTab === 'pending' && reports.length > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-[8px]">{reports.length}</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('resolved'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'resolved' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              กำลังดำเนินการ / ดำเนินการเสร็จสิ้น
            </button>
            <button 
              onClick={() => { setActiveTab('dismissed'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'dismissed' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              ปัดตก (Dismissed)
            </button>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-20">
               <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-slate-500 font-bold">กำลังโหลดรายงานปัญหา...</p>
             </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">📢</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายงานปัญหา</h3>
              <p className="text-slate-500 font-medium">ไม่มีรายการแจ้งปัญหาตามสถานะที่คุณเลือก</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report, idx) => {
                const isScam = report.reason.toLowerCase().includes('scam') || report.reason.includes('ฉ้อโกง');
                return (
                  <div key={report.id} className="bg-white rounded-2xl border-l-4 border-red-500 shadow-sm overflow-hidden flex flex-col border border-slate-200/60">
                    <div className="p-6 flex flex-col xl:flex-row gap-6">
                      
                      {/* Left Block: Users and Severity */}
                      <div className="xl:w-2/5 flex flex-col gap-4 border-r border-slate-100 pr-6">
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border ${
                            isScam ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            ⚠️ {report.reason}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">Ticket: RP-00{idx + 1}</span>
                        </div>

                        {/* Reporter */}
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">ผู้แจ้ง (Reporter)</p>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                              {report.reporter?.name[0] || 'U'}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs">{report.reporter?.name || 'Unknown'}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">ID: {report.reporter?.id.slice(0, 8)} • Buyer</p>
                            </div>
                          </div>
                        </div>

                        {/* Reported Agent */}
                        <div className="bg-red-50/20 p-3 rounded-xl border border-red-100/40">
                          <p className="text-[9px] font-black text-red-500/70 uppercase tracking-wider mb-2">ผู้ถูกรายงาน (Reported)</p>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs uppercase">
                              {report.reportedAgent?.name[0] || 'A'}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs">{report.reportedAgent?.name || 'Unknown'}</p>
                              <p className="text-[9px] text-red-400 font-bold uppercase">ID: {report.reportedAgent?.id.slice(0, 8)} • Agent</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Content Details */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-slate-800 font-extrabold text-sm mb-2">รายละเอียดปัญหาที่แจ้ง:</h4>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative mb-4">
                             <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                               &quot;{report.details}&quot;
                             </p>
                          </div>

                          {report.property && (
                            <p className="text-slate-500 font-bold text-xs flex items-center gap-1.5">
                               🔗 อ้างอิงประกาศ: 
                               <Link href={`/property/${report.property.id}`} className="text-blue-600 hover:underline font-extrabold">
                                  {report.property.title}
                               </Link>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    {activeTab === 'pending' && (
                      <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
                        <div>
                          <button className="px-4 py-2 bg-white border border-slate-200 text-blue-600 font-extrabold rounded-lg hover:bg-slate-50 transition text-[10px]">
                            💬 {isScam ? 'ตรวจสอบประวัติและหลักฐาน' : 'ตรวจสอบแชทหลักฐาน'}
                          </button>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button 
                            onClick={() => handleAction(report.id, 'dismissed')}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-extrabold rounded-lg hover:bg-slate-100 transition text-[10px]"
                          >
                            ปัดตก (Dismiss)
                          </button>
                          
                          <button 
                            onClick={() => handleAction(report.id, 'resolved')}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg transition text-[10px]"
                          >
                            {isScam ? 'ตักเตือน' : 'ส่งคำเตือน (Warn)'}
                          </button>

                          {isScam && report.reportedAgent && (
                            <button 
                              onClick={() => handleAction(report.id, 'resolved', 'ban', report.reportedAgent?.id)}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg transition text-[10px] shadow-lg shadow-red-500/20 active:scale-95"
                            >
                              🚫 แบนบัญชี
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
    </>
  );
}
