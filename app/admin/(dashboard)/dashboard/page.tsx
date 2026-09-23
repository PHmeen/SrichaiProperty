'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import StatCards from '@/components/admin/StatCards';
import ModerationList from '@/components/admin/ModerationList';
import NotificationBell from '@/components/common/NotificationBell';
import {
  Search,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 20000;

interface ModerationItem {
  id: string;
  title: string;
  code: string;
  price: string;
  seller: string;
  sellerPhone?: string;
  plan: string;
  isVerified?: boolean;
  sla: string;
  slaUrgent?: boolean;
  image?: string;
  createdTimeAgo?: string;
}

interface PendingKycItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  lineId: string;
  hasDoc: boolean;
  timeAgo: string;
}

interface PendingPaymentItem {
  id: string;
  amount: number;
  formattedAmount: string;
  paymentMethod: string;
  slipUrl: string | null;
  packageName: string;
  propertyTitle: string;
  timeAgo: string;
}

interface PendingReportItem {
  id: string;
  reason: string;
  reporterName: string;
  propertyTitle: string | null;
  reportedAgent: string | null;
  timeAgo: string;
}

interface RecentAppointmentItem {
  id: string;
  customerName: string;
  customerPhone: string;
  agentName: string;
  propertyTitle: string;
  propertyLocation: string;
  appointmentDate: string;
  timeSlot: string;
  status: string;
  timeAgo: string;
}

interface ActivityItem {
  id: string;
  type: 'listing' | 'kyc' | 'payment' | 'appointment' | 'report' | 'user' | 'login';
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  badgeText: string;
}

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Counts
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedListingsCount, setApprovedListingsCount] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [proAgentsCount, setProAgentsCount] = useState(0);
  const [kycCount, setKycCount] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [pendingAppointmentsCount, setPendingAppointmentsCount] = useState(0);

  // Lists
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [pendingKycList, setPendingKycList] = useState<PendingKycItem[]>([]);
  const [pendingPaymentsList, setPendingPaymentsList] = useState<PendingPaymentItem[]>([]);
  const [pendingReportsList, setPendingReportsList] = useState<PendingReportItem[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointmentItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [moderationFilter, setModerationFilter] = useState<'all' | 'urgent'>('all');

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, variant: Toast['variant'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Current Thai Date formatted
  const formattedToday = useMemo(() => {
    return new Intl.DateTimeFormat('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(new Date());
  }, []);

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback((isBackground = false) => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPendingCount(data.pendingCount ?? 0);
          setApprovedListingsCount(data.approvedListingsCount ?? 0);
          setAgentsCount(data.agentsCount ?? 0);
          setProAgentsCount(data.proAgentsCount ?? 0);
          setKycCount(data.kycCount ?? 0);
          setPaymentsCount(data.paymentsCount ?? 0);
          setReportsCount(data.reportsCount ?? 0);
          setPendingAppointmentsCount(data.pendingAppointmentsCount ?? 0);

          setModerationItems(data.moderationItems || []);
          setPendingKycList(data.pendingKycList || []);
          setPendingPaymentsList(data.pendingPaymentsList || []);
          setPendingReportsList(data.pendingReportsList || []);
          setRecentAppointments(data.recentAppointments || []);
          setActivities(data.activities || []);

          setFetchError(null);
        } else {
          setFetchError(data.error);
        }
        setLoading(false);
        setIsRefreshing(false);
      })
      .catch(err => {
        console.error("Error fetching admin dashboard data:", err);
        if (!isBackground) setFetchError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
        setIsRefreshing(false);
      });
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchDashboardData(false);
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Moderation filtering
  const filteredModerationItems = useMemo(() => {
    let result = moderationItems;

    if (moderationFilter === 'urgent') {
      result = result.filter(item => item.slaUrgent);
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return result;

    return result.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.seller.toLowerCase().includes(q)
    );
  }, [moderationItems, moderationFilter, searchQuery]);

  // Approve listing
  const handleApprove = async (id: string, title: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`อนุมัติประกาศ "${title}" เรียบร้อยแล้ว`, 'success');
        fetchDashboardData(true);
      } else {
        showToast("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", 'error');
    }
  };

  // Reject listing
  const handleReject = async (id: string, title: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`ส่งกลับคำขอ "${title}" เรียบร้อยแล้ว`, 'success');
        fetchDashboardData(true);
      } else {
        showToast("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", 'error');
    }
  };

  const totalPendingActionItems = pendingCount + kycCount + paymentsCount + reportsCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-medium text-slate-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
        <p className="text-xs">กำลังโหลดข้อมูลแดชบอร์ด...</p>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80 max-w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2.5 rounded-lg shadow-md text-xs font-semibold text-white ${
              t.variant === 'success' ? 'bg-slate-900' : 'bg-rose-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-none">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-[11px] text-slate-500 mt-1">
            {formattedToday} · ระบบพร้อมใช้งาน
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-slate-700' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          <NotificationBell />
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">

        {/* Error banner */}
        {fetchError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
            <span>{fetchError}</span>
            <button
              onClick={() => fetchDashboardData(false)}
              className="text-rose-700 underline font-semibold hover:text-rose-900"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Simple Action Strip (Only when there are pending items) */}
        {totalPendingActionItems > 0 && (
          <div className="bg-slate-100/80 border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">งานรอดำเนินการ {totalPendingActionItems} รายการ:</span>
              {pendingCount > 0 && (
                <Link href="#moderation" className="text-slate-700 hover:text-slate-900 underline font-medium">
                  ประกาศรอตรวจ ({pendingCount})
                </Link>
              )}
              {kycCount > 0 && (
                <Link href="/admin/kyc" className="text-slate-700 hover:text-slate-900 underline font-medium">
                  ยืนยันตัวตน KYC ({kycCount})
                </Link>
              )}
              {paymentsCount > 0 && (
                <Link href="/admin/payments" className="text-slate-700 hover:text-slate-900 underline font-medium">
                  สลิปชำระเงิน ({paymentsCount})
                </Link>
              )}
              {reportsCount > 0 && (
                <Link href="/admin/reports" className="text-slate-700 hover:text-slate-900 underline font-medium">
                  รายงานปัญหา ({reportsCount})
                </Link>
              )}
            </div>

            <Link
              href="/admin/moderation"
              className="self-start sm:self-auto px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium shrink-0 transition-colors"
            >
              จัดการงานค้าง
            </Link>
          </div>
        )}

        {/* 5 KPI Cards */}
        <StatCards
          pendingCount={pendingCount}
          approvedListingsCount={approvedListingsCount}
          kycCount={kycCount}
          paymentsCount={paymentsCount}
          pendingAppointmentsCount={pendingAppointmentsCount}
          agentsCount={agentsCount}
          proAgentsCount={proAgentsCount}
        />

        {/* Grid Layout (12 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* ==================================================== */}
          {/* Left Column (8 cols): Moderation & Appointments      */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 space-y-5">

            {/* 1. คิวตรวจสอบประกาศ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs" id="moderation">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    ประกาศรอตรวจสอบ ({pendingCount})
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    ตรวจความถูกต้องก่อนเปิดเผยแพร่สู่สาธารณะ
                  </p>
                </div>

                <Link
                  href="/admin/moderation"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
                >
                  <span>คิวทั้งหมด</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Search & Filter */}
              <div className="px-4 py-2.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาประกาศหรือชื่อนายหน้า..."
                    className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setModerationFilter('all')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      moderationFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilter('urgent')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      moderationFilter === 'urgent'
                        ? 'bg-amber-700 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    ด่วน SLA ({moderationItems.filter(i => i.slaUrgent).length})
                  </button>
                </div>
              </div>

              {/* Moderation List */}
              <ModerationList
                items={filteredModerationItems}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            </div>

            {/* 2. การนัดหมายเข้าชมบ้านล่าสุด */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs" id="appointments">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">
                    นัดหมายเข้าชมบ้านล่าสุด
                  </h3>
                  <p className="text-slate-400 text-[11px]">
                    รายการนัดหมายระหว่างลูกค้าและตัวแทนนายหน้า
                  </p>
                </div>
                <Link
                  href="/admin/analytics"
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  ดูรายงานนัดหมาย
                </Link>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {recentAppointments.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    ไม่มีรายการนัดหมาย
                  </div>
                ) : (
                  recentAppointments.map(app => {
                    let statusLabel = 'รอดำเนินการ';
                    let statusClass = 'text-slate-600 bg-slate-100';
                    if (app.status === 'approved') {
                      statusLabel = 'ยืนยันแล้ว';
                      statusClass = 'text-emerald-700 bg-emerald-50';
                    } else if (app.status === 'completed') {
                      statusLabel = 'เข้าชมแล้ว';
                      statusClass = 'text-blue-700 bg-blue-50';
                    } else if (app.status === 'cancelled' || app.status === 'rejected') {
                      statusLabel = 'ยกเลิก';
                      statusClass = 'text-rose-700 bg-rose-50';
                    }

                    return (
                      <div
                        key={app.id}
                        className="p-3.5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{app.customerName}</span>
                            {app.customerPhone !== '-' && (
                              <span className="text-slate-400 text-[11px]">({app.customerPhone})</span>
                            )}
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-slate-600 truncate">
                            {app.propertyTitle} {app.propertyLocation && <span className="text-slate-400">· {app.propertyLocation}</span>}
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            นายหน้า: {app.agentName}
                          </p>
                        </div>

                        <div className="text-right shrink-0 text-slate-500 sm:self-center">
                          <div className="font-medium text-slate-800">{app.appointmentDate}</div>
                          <div className="text-[11px] text-slate-400">{app.timeSlot}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* ==================================================== */}
          {/* Right Column (4 cols): Pending Hub & Activities      */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 space-y-5">

            {/* 1. งานรออนุมัติสิทธิ์อื่นๆ */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-xs pb-2 border-b border-slate-100">
                งานรอตรวจสอบอื่นๆ
              </h3>

              {/* 1.1 KYC */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    ยืนยันตัวตน KYC ({pendingKycList.length})
                  </span>
                  <Link href="/admin/kyc" className="text-blue-600 hover:text-blue-800 text-[11px]">
                    ดูทั้งหมด
                  </Link>
                </div>

                {pendingKycList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded">
                    ไม่มีคำขอ KYC ค้างอยู่
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {pendingKycList.slice(0, 3).map(kyc => (
                      <div
                        key={kyc.id}
                        className="p-2 rounded bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{kyc.name}</p>
                          <p className="text-slate-400 text-[11px]">{kyc.timeAgo}</p>
                        </div>
                        <Link
                          href="/admin/kyc"
                          className="px-2 py-0.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium shrink-0"
                        >
                          ตรวจ
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1.2 Payments */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    สลิปชำระเงินแพ็กเกจ ({pendingPaymentsList.length})
                  </span>
                  <Link href="/admin/payments" className="text-blue-600 hover:text-blue-800 text-[11px]">
                    ดูทั้งหมด
                  </Link>
                </div>

                {pendingPaymentsList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded">
                    ไม่มีสลิปรอตรวจสอบ
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {pendingPaymentsList.slice(0, 3).map(pay => (
                      <div
                        key={pay.id}
                        className="p-2 rounded bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-900">{pay.formattedAmount}</p>
                          <p className="text-slate-400 text-[11px] truncate">{pay.packageName}</p>
                        </div>
                        <Link
                          href="/admin/payments"
                          className="px-2 py-0.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-medium shrink-0"
                        >
                          ตรวจ
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1.3 Reports */}
              {pendingReportsList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">
                      รายงานปัญหา ({pendingReportsList.length})
                    </span>
                    <Link href="/admin/reports" className="text-blue-600 hover:text-blue-800 text-[11px]">
                      จัดการ
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {pendingReportsList.slice(0, 2).map(rep => (
                      <div key={rep.id} className="p-2 rounded bg-slate-50 text-xs">
                        <p className="font-medium text-slate-800 truncate">{rep.reason}</p>
                        <p className="text-slate-400 text-[11px]">{rep.reporterName} · {rep.timeAgo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. กิจกรรมล่าสุดในระบบ (Timeline เรียบง่าย สไตล์ Audit Log) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[420px]">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs">
                  บันทึกกิจกรรมล่าสุด
                </h3>
                <span className="text-[10px] text-slate-400">
                  อัปเดตอัตโนมัติ
                </span>
              </div>

              {/* Minimal Timeline */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    ไม่มีกิจกรรมล่าสุด
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-1">
                          <span className="font-medium text-slate-800 truncate">
                            {act.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {act.timeAgo}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed truncate">
                          {act.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
