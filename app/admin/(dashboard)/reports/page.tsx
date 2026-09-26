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
  Clock,
  AlertTriangle,
  AlertOctagon,
  Info,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Filter
} from 'lucide-react';

interface ResolutionInfo {
  summary: string;
  author: string;
  resolvedAt: string;
}

interface ReportData {
  id: string;
  reason: string;
  details: string;
  status: string;
  createdAt: string;
  resolution?: ResolutionInfo | null;
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
    status: string;
    agentId?: string | null;
  } | null;
}

type Severity = 'critical' | 'medium' | 'low';

function getReportSeverity(reason: string, details?: string): Severity {
  const text = `${reason} ${details || ''}`.toLowerCase();
  if (
    text.includes('ฉ้อโกง') ||
    text.includes('scam') ||
    text.includes('หลอกโอน') ||
    text.includes('สวมรอย') ||
    text.includes('มิจฉาชีพ') ||
    text.includes('ปลอม')
  ) {
    return 'critical';
  }
  if (
    text.includes('ข้อมูลเท็จ') ||
    text.includes('false') ||
    text.includes('หลอก') ||
    text.includes('ขายไปแล้ว') ||
    text.includes('สแปม') ||
    text.includes('spam') ||
    text.includes('ไม่ตรงปก')
  ) {
    return 'medium';
  }
  return 'low';
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'medium' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Resolution Modal State
  const [resolvingReport, setResolvingReport] = useState<ReportData | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'resolved' | 'warn' | 'ban' | 'dismissed'>('resolved');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  const fetchReports = (status: string) => {
    fetch(`/api/admin/reports?status=${status}&t=${Date.now()}`)
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

  // Open Resolution Modal
  const handleOpenResolveModal = (report: ReportData, defaultAction: 'resolved' | 'warn' | 'ban' | 'dismissed') => {
    setResolvingReport(report);
    setResolutionAction(defaultAction);
    setResolutionSummary('');
  };

  // Confirm Resolution
  const handleConfirmResolution = async () => {
    if (!resolvingReport) return;
    setSubmittingResolution(true);

    const targetStatus = resolutionAction === 'dismissed' ? 'dismissed' : 'resolved';
    const actionParam = resolutionAction === 'ban' ? 'ban' : undefined;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: resolvingReport.id,
          status: targetStatus,
          action: actionParam,
          agentId: resolvingReport.reportedAgent?.id,
          reporterId: resolvingReport.reporter?.id,
          resolutionSummary: resolutionSummary.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('บันทึกผลการยุติเรื่องและอัปเดตสถานะเรียบร้อยแล้ว');
        setResolvingReport(null);
        fetchReports(activeTab);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + (data.error || ''));
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการทำรายการ');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // One-click Suspend / Restore Property Listing
  const handleTogglePropertySuspension = async (reportId: string, propertyId: string, currentStatus: string) => {
    const isCurrentlySuspended = currentStatus === 'rejected';
    const action = isCurrentlySuspended ? 'restore_property' : 'suspend_property';
    const promptMsg = isCurrentlySuspended
      ? 'ยืนยันการคืนค่าประกาศ ให้กลับมาแสดงผลบนเว็บไซต์ตามปกติหรือไม่?'
      : 'ยืนยันการระงับประกาศทันทีหรือไม่? ประกาศนี้จะถูกถอดออกจากหน้าเว็บทันทีระหว่างรอการตรวจสอบ';

    if (!confirm(promptMsg)) return;

    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action, propertyId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(isCurrentlySuspended ? 'คืนค่าประกาศสำเร็จ' : 'ระงับประกาศเรียบร้อยแล้ว');
        fetchReports(activeTab);
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // Severity Counts
  const severityCounts = useMemo(() => {
    let critical = 0, medium = 0, low = 0;
    reports.forEach(r => {
      const sev = getReportSeverity(r.reason, r.details);
      if (sev === 'critical') critical++;
      else if (sev === 'medium') medium++;
      else low++;
    });
    return { all: reports.length, critical, medium, low };
  }, [reports]);

  // Filter reports by search & severity
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      // Severity Filter
      if (severityFilter !== 'all') {
        const sev = getReportSeverity(r.reason, r.details);
        if (sev !== severityFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const ticketId = `tk-${r.id.slice(0, 8)}`.toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const details = (r.details || '').toLowerCase();
        const reporterName = (r.reporter?.name || '').toLowerCase();
        const agentName = (r.reportedAgent?.name || '').toLowerCase();
        const propTitle = (r.property?.title || '').toLowerCase();
        const resText = (r.resolution?.summary || '').toLowerCase();

        return (
          ticketId.includes(q) ||
          reason.includes(q) ||
          details.includes(q) ||
          reporterName.includes(q) ||
          agentName.includes(q) ||
          propTitle.includes(q) ||
          resText.includes(q)
        );
      }

      return true;
    });
  }, [reports, searchQuery, severityFilter]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['Ticket ID', 'ความรุนแรง', 'เหตุผล', 'รายละเอียด', 'สถานะ', 'ผู้แจ้ง', 'ผู้ถูกรายงาน', 'ประกาศที่เกี่ยวข้อง', 'ผลการยุติเรื่อง', 'วันที่แจ้ง'];
    const rows = filteredReports.map(r => [
      `"TK-${r.id.slice(0, 8).toUpperCase()}"`,
      `"${getReportSeverity(r.reason, r.details).toUpperCase()}"`,
      `"${r.reason || ''}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${r.reporter?.name || '-'}"`,
      `"${r.reportedAgent?.name || '-'}"`,
      `"${r.property?.title || '-'}"`,
      `"${(r.resolution?.summary || '').replace(/"/g, '""')}"`,
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
            จัดการข้อร้องเรียน จัดลำดับความรุนแรง ระงับประกาศทันที และบันทึกประวัติการยุติเรื่อง
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
        {/* Controls: Tabs, Severity & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
          {/* Status Tabs */}
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

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            {/* Severity Filter */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-xs text-xs font-semibold text-slate-600">
              <span className="px-2 py-1 text-slate-400 font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ความรุนแรง:</span>
              </span>
              <button
                type="button"
                onClick={() => setSeverityFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  severityFilter === 'all'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                ทั้งหมด ({severityCounts.all})
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('critical')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  severityFilter === 'critical'
                    ? 'bg-red-50 text-red-700 font-bold border border-red-200'
                    : 'text-slate-600 hover:text-red-700 hover:bg-red-50/50'
                }`}
              >
                <AlertOctagon className="w-3 h-3 text-red-600" />
                <span>ร้ายแรง ({severityCounts.critical})</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('medium')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  severityFilter === 'medium'
                    ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                    : 'text-slate-600 hover:text-amber-700 hover:bg-amber-50/50'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>ปานกลาง ({severityCounts.medium})</span>
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('low')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                  severityFilter === 'low'
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/50'
                }`}
              >
                <Info className="w-3 h-3 text-blue-600" />
                <span>ทั่วไป ({severityCounts.low})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Ticket, ชื่อ, คำร้อง..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 text-xs shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
              {searchQuery || severityFilter !== 'all' 
                ? 'ไม่มีรายงานที่ตรงกับตัวกรองของคุณ' 
                : 'ไม่มีรายการแจ้งปัญหาตามสถานะที่คุณเลือกในขณะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const severity = getReportSeverity(report.reason, report.details);
              const ticketId = `TK-${report.id.slice(0, 8).toUpperCase()}`;

              return (
                <div
                  key={report.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition"
                >
                  <div className="p-4 sm:p-6 flex flex-col xl:flex-row gap-6">
                    {/* Left Block: Users and Severity */}
                    <div className="xl:w-2/5 flex flex-col gap-3 border-b xl:border-b-0 xl:border-r border-slate-100 pb-5 xl:pb-0 xl:pr-6">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          {severity === 'critical' && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 shrink-0">
                              <AlertOctagon className="w-3 h-3 text-red-600" />
                              <span>ระดับ: ร้ายแรง (Critical)</span>
                            </span>
                          )}
                          {severity === 'medium' && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>ระดับ: ปานกลาง (Medium)</span>
                            </span>
                          )}
                          {severity === 'low' && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1 shrink-0">
                              <Info className="w-3 h-3 text-blue-600" />
                              <span>ระดับ: ทั่วไป (Low)</span>
                            </span>
                          )}
                        </div>

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

                    {/* Right Block: Content Details & Property Actions */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-slate-800 font-extrabold text-xs">
                            เหตุผล: <span className="text-red-600 font-black">{report.reason}</span>
                          </h4>
                          <Badge status={report.reason} />
                        </div>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-slate-700 text-xs font-medium leading-relaxed mb-4 whitespace-pre-wrap">
                          {report.details}
                        </div>

                        {/* Associated Property with One-click Hide/Suspend Listing */}
                        {report.property && (
                          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">ประกาศที่เกี่ยวข้อง</p>
                                {report.property.status === 'rejected' ? (
                                  <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[9px] font-extrabold">
                                    ถูกระงับการแสดงผลอยู่
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-extrabold">
                                    กำลังแสดงผลบนเว็บ
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-800 truncate">{report.property.title}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Link
                                href={`/property/${report.property.id}`}
                                target="_blank"
                                className="text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs hover:underline"
                              >
                                <span>ดูประกาศ</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>

                              {/* One-click Hide / Suspend Toggle */}
                              {report.property.status === 'rejected' ? (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePropertySuspension(report.id, report.property!.id, report.property!.status)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                  title="คืนค่าให้ประกาศแสดงผลตามปกติ"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>คืนค่าประกาศ</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleTogglePropertySuspension(report.id, report.property!.id, report.property!.status)}
                                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
                                  title="ระงับประกาศออกจากหน้าเว็บทันทีเพื่อสืบสวน"
                                >
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>ระงับประกาศทันที</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Resolution Summary (If resolved or dismissed) */}
                        {report.resolution?.summary && (
                          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 mt-3 text-xs space-y-1">
                            <div className="flex items-center justify-between text-emerald-900 font-extrabold text-[11px]">
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>บันทึกผลการยุติเรื่อง (Resolution Summary)</span>
                              </span>
                              <span className="text-slate-500 font-normal">
                                โดย: {report.resolution.author} • {new Date(report.resolution.resolvedAt).toLocaleString('th-TH')}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium whitespace-pre-wrap">{report.resolution.summary}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  {activeTab === 'pending' && (
                    <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 font-medium">
                        การดำเนินการจะส่งผลต่อสถานะ Ticket บันทึก Resolution Log และแจ้งเตือนผู้ใช้
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleOpenResolveModal(report, 'dismissed')}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-100 transition text-xs cursor-pointer"
                        >
                          ปัดตก (Dismiss)
                        </button>
                        
                        <button 
                          onClick={() => handleOpenResolveModal(report, 'warn')}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition text-xs cursor-pointer shadow-sm"
                        >
                          ส่งคำเตือน & ปิดเรื่อง
                        </button>

                        <button 
                          onClick={() => handleOpenResolveModal(report, 'resolved')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs cursor-pointer shadow-sm flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>ยุติเรื่อง (Resolved)</span>
                        </button>

                        {severity === 'critical' && report.reportedAgent && (
                          <button 
                            onClick={() => handleOpenResolveModal(report, 'ban')}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5 text-white" />
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

        {/* ------------------------------------------------------------------------------
         * RESOLUTION LOG MODAL
         * ------------------------------------------------------------------------------ */}
        {resolvingReport && (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>บันทึกผลการยุติเรื่อง (Resolution Log)</span>
                </h3>
                <button
                  onClick={() => setResolvingReport(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                <p className="font-extrabold text-slate-800">
                  หมายเลข Ticket: <span className="font-mono text-blue-700">TK-{resolvingReport.id.slice(0, 8).toUpperCase()}</span>
                </p>
                <p className="text-slate-600">เรื่อง: <span className="font-bold text-red-600">{resolvingReport.reason}</span></p>
                <p className="text-slate-500">ผู้แจ้ง: {resolvingReport.reporter?.name || '-'} | นายหน้า: {resolvingReport.reportedAgent?.name || '-'}</p>
              </div>

              {/* Action Selection */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  เลือกผลการดำเนินการ:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border font-bold cursor-pointer transition flex items-center gap-2 ${
                    resolutionAction === 'resolved' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resolutionAction"
                      checked={resolutionAction === 'resolved'}
                      onChange={() => setResolutionAction('resolved')}
                      className="accent-emerald-600"
                    />
                    <span>แก้ไขเสร็จสิ้น (Resolved)</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border font-bold cursor-pointer transition flex items-center gap-2 ${
                    resolutionAction === 'warn' ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resolutionAction"
                      checked={resolutionAction === 'warn'}
                      onChange={() => setResolutionAction('warn')}
                      className="accent-amber-600"
                    />
                    <span>ตักเตือนนายหน้า (Warn)</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border font-bold cursor-pointer transition flex items-center gap-2 ${
                    resolutionAction === 'dismissed' ? 'bg-slate-100 text-slate-800 border-slate-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resolutionAction"
                      checked={resolutionAction === 'dismissed'}
                      onChange={() => setResolutionAction('dismissed')}
                      className="accent-slate-600"
                    />
                    <span>ปัดตกคำร้อง (Dismiss)</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border font-bold cursor-pointer transition flex items-center gap-2 ${
                    resolutionAction === 'ban' ? 'bg-red-50 text-red-800 border-red-300' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}>
                    <input
                      type="radio"
                      name="resolutionAction"
                      checked={resolutionAction === 'ban'}
                      onChange={() => setResolutionAction('ban')}
                      className="accent-red-600"
                    />
                    <span>ระงับบัญชีถาวร (Ban)</span>
                  </label>
                </div>
              </div>

              {/* Resolution Summary Textarea */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  บันทึกสรุปผลการจัดการเคส (Audit Trail / แจ้งเตือนผู้ร้องเรียน):
                </label>
                <textarea
                  rows={3}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="เช่น ประสานงานนายหน้าและแจ้งให้ปรับราคาให้ถูกต้องเรียบร้อยแล้ว หรือ ตรวจสอบหลักฐานไม่พบความผิดปกติ..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setResolvingReport(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResolution}
                  disabled={submittingResolution}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submittingResolution ? 'กำลังบันทึก...' : 'บันทึกและปิดเรื่อง'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

