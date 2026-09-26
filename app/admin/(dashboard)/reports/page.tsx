'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast';
import {
  Search,
  Megaphone,
  ExternalLink,
  Ban,
  RefreshCw,
  Download,
  X,
  Clock
} from 'lucide-react';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReports = (status: string) => {
    fetch(`/api/admin/reports?status=${status}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReports(data.reports || []);
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('ไม่สามารถโหลดข้อมูลรายงานได้');
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchReports(activeTab);
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchReports(activeTab);
  };

  const handleAction = async (reportId: string, newStatus: string, action?: string, agentId?: string) => {
    let confirmMsg = `ต้องการปรับสถานะรายงานนี้เป็น ${newStatus === 'resolved' ? 'แก้ไขแล้ว' : 'ปัดตก'}?`;
    if (action === 'ban') confirmMsg = `คุณต้องการระงับบัญชี (BAN) นายหน้าคนนี้ถาวรหรือไม่?`;
    
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus, action, agentId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('ดำเนินการเรียบร้อยแล้ว');
        fetchReports(activeTab);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + (data.error || ''));
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการทำรายการ');
    }
  };

  // Filter reports by search
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase().trim();
    return reports.filter(r => {
      const ticketId = `tk-${r.id.slice(0, 8)}`.toLowerCase();
      const reason = (r.reason || '').toLowerCase();
      const details = (r.details || '').toLowerCase();
      const reporterName = (r.reporter?.name || '').toLowerCase();
      const agentName = (r.reportedAgent?.name || '').toLowerCase();
      const propTitle = (r.property?.title || '').toLowerCase();

      return (
        ticketId.includes(q) ||
        reason.includes(q) ||
        details.includes(q) ||
        reporterName.includes(q) ||
        agentName.includes(q) ||
        propTitle.includes(q)
      );
    });
  }, [reports, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['Ticket ID', 'เหตุผล', 'รายละเอียด', 'สถานะ', 'ผู้แจ้ง', 'ผู้ถูกรายงาน', 'ประกาศที่เกี่ยวข้อง', 'วันที่แจ้ง'];
    const rows = filteredReports.map(r => [
      `"TK-${r.id.slice(0, 8).toUpperCase()}"`,
      `"${r.reason || ''}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.reporter?.name || '-'}"`,
      `"${r.reportedAgent?.name || '-'}"`,
      `"${r.property?.title || '-'}"`,
      `"${new Date(r.createdAt).toLocaleString('th-TH')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `srichai_reports_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดไฟล์ CSV รายงานปัญหาเรียบร้อยแล้ว');
  };

  return (
    <>
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 relative z-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">ตรวจสอบรายงานปัญหา (Reports & Complaints)</h2>
          <p className="text-xs text-slate-500 font-medium">
            ตรวจสอบข้อร้องเรียนจากผู้ใช้เกี่ยวกับประกาศและพฤติกรรมนายหน้า
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 shadow-sm cursor-pointer"
            title="ส่งออกไฟล์ CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {/* Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto border border-slate-200">
            <button 
              onClick={() => { setActiveTab('pending'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>รอตรวจสอบ</span>
              {activeTab === 'pending' && reports.length > 0 && (
                <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none">
                  {reports.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('resolved'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                activeTab === 'resolved'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              แก้ไขเสร็จสิ้น (Resolved)
            </button>
            <button 
              onClick={() => { setActiveTab('dismissed'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                activeTab === 'dismissed'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ปัดตก (Dismissed)
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Ticket ID, ชื่อ, รายละเอียด..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 text-xs shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-500 font-bold text-xs">กำลังโหลดรายงานปัญหา...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Megaphone className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">ไม่พบรายงานปัญหา</h3>
            <p className="text-slate-500 text-xs">
              {searchQuery ? 'ไม่มีรายงานที่ตรงกับคำค้นหาของคุณ' : 'ไม่มีรายการแจ้งปัญหาตามสถานะที่คุณเลือกในขณะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isScam = (report.reason || '').toLowerCase().includes('scam') || (report.reason || '').includes('ฉ้อโกง');
              const ticketId = `TK-${report.id.slice(0, 8).toUpperCase()}`;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition"
                >
                  <div className="p-4 sm:p-6 flex flex-col xl:flex-row gap-6">
                    {/* Left Block: Users and Severity */}
                    <div className="xl:w-2/5 flex flex-col gap-3.5 border-b xl:border-b-0 xl:border-r border-slate-100 pb-5 xl:pb-0 xl:pr-6">
                      <div className="flex items-center justify-between">
                        <Badge status={report.reason} />
                        <span className="text-[10px] text-slate-500 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ticketId}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>แจ้งเมื่อ {new Date(report.createdAt).toLocaleString('th-TH')}</span>
                      </div>

                      {/* Reporter */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">ผู้แจ้ง (Reporter)</p>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {report.reporter?.name?.[0] || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 text-xs truncate">{report.reporter?.name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {report.reporter?.id.slice(0, 8)} • Buyer</p>
                          </div>
                        </div>
                      </div>

                      {/* Reported Agent */}
                      <div className="bg-red-50/40 p-3 rounded-xl border border-red-100">
                        <p className="text-[9px] font-black text-red-600 uppercase tracking-wider mb-1.5">ผู้ถูกรายงาน (Reported Agent)</p>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {report.reportedAgent?.name?.[0] || 'A'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-800 text-xs truncate">{report.reportedAgent?.name || 'ไม่ระบุ'}</p>
                            <p className="text-[10px] text-red-500/80 font-mono">ID: {report.reportedAgent?.id.slice(0, 8) || '-'} • Agent</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Block: Content Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-slate-800 font-extrabold text-xs mb-2">รายละเอียดปัญหาที่แจ้ง:</h4>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-700 text-xs font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                          {report.details}
                        </div>

                        {report.property && (
                          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">ประกาศที่เกี่ยวข้อง</p>
                              <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{report.property.title}</p>
                            </div>
                            <Link
                              href={`/property/${report.property.id}`}
                              target="_blank"
                              className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1 shrink-0 hover:underline"
                            >
                              <span>ดูประกาศ</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  {activeTab === 'pending' && (
                    <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 font-medium">
                        การดำเนินการจะส่งผลต่อสถานะ Ticket และการแจ้งเตือน
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleAction(report.id, 'dismissed')}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition text-xs cursor-pointer"
                        >
                          ปัดตก (Dismiss)
                        </button>
                        
                        <button 
                          onClick={() => handleAction(report.id, 'resolved')}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition text-xs cursor-pointer shadow-sm"
                        >
                          {isScam ? 'ตักเตือนและปิดเรื่อง' : 'ส่งคำเตือน (Warn)'}
                        </button>

                        {isScam && report.reportedAgent && (
                          <button 
                            onClick={() => handleAction(report.id, 'resolved', 'ban', report.reportedAgent?.id)}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3 text-white" />
                            <span>ระงับบัญชี (Ban)</span>
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
