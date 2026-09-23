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
      weekday: 'long',
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

  // Semantic timeline dot color helper
  const getActivityDotClass = (type: ActivityItem['type']) => {
    switch (type) {
      case 'listing':
        return 'bg-amber-500 ring-3 ring-amber-100';
      case 'payment':
        return 'bg-emerald-500 ring-3 ring-emerald-100';
      case 'appointment':
        return 'bg-sky-500 ring-3 ring-sky-100';
      case 'kyc':
      case 'user':
        return 'bg-indigo-500 ring-3 ring-indigo-100';
      case 'report':
        return 'bg-rose-500 ring-3 ring-rose-100';
      default:
        return 'bg-slate-400 ring-3 ring-slate-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-medium text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
        <p className="text-sm font-semibold">กำลังโหลดข้อมูลแดชบอร์ด...</p>
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
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
              t.variant === 'success' ? 'bg-slate-900 border border-slate-700' : 'bg-rose-600'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Top Header */}
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
            แดชบอร์ดผู้ดูแลระบบ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {formattedToday} · <span className="text-emerald-700 font-semibold">ระบบพร้อมใช้งาน</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 shadow-2xs"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-slate-800' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          <NotificationBell />
        </div>
      </header>

      {/* Workspace */}
      <div className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">

        {/* Error banner */}
        {fetchError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <span>{fetchError}</span>
            <button
              onClick={() => fetchDashboardData(false)}
              className="text-rose-700 underline font-bold hover:text-rose-900"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Action Strip with Purposeful Amber Accent (Alerts Admin about pending items) */}
        {totalPendingActionItems > 0 && (
          <div className="bg-amber-50/70 border border-amber-200/90 border-l-4 border-l-amber-500 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span className="font-extrabold text-amber-950">
                งานรอดำเนินการ {totalPendingActionItems} รายการ:
              </span>
              {pendingCount > 0 && (
                <Link
                  href="#moderation"
                  className="inline-flex items-center gap-1 bg-white border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-amber-100/50 transition-colors"
                >
                  ประกาศรอตรวจ ({pendingCount})
                </Link>
              )}
              {kycCount > 0 && (
                <Link
                  href="/admin/kyc"
                  className="inline-flex items-center gap-1 bg-white border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-colors"
                >
                  ยืนยันตัวตน KYC ({kycCount})
                </Link>
              )}
              {paymentsCount > 0 && (
                <Link
                  href="/admin/payments"
                  className="inline-flex items-center gap-1 bg-white border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors"
                >
                  สลิปชำระเงิน ({paymentsCount})
                </Link>
              )}
              {reportsCount > 0 && (
                <Link
                  href="/admin/reports"
                  className="inline-flex items-center gap-1 bg-white border border-rose-200 text-rose-900 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-rose-50 transition-colors"
                >
                  รายงานปัญหา ({reportsCount})
                </Link>
              )}
            </div>

            <Link
              href="/admin/moderation"
              className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shrink-0 transition-colors shadow-xs"
            >
              จัดการงานค้าง
            </Link>
          </div>
        )}

        {/* 5 KPI Cards with Semantic Color Accents */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ==================================================== */}
          {/* Left Column (8 cols): Moderation & Appointments      */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. คิวตรวจสอบประกาศ */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="moderation">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <span>ประกาศรอการตรวจสอบ</span>
                    {pendingCount > 0 && (
                      <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    ตรวจสอบความถูกต้องของข้อมูลก่อนเผยแพร่สู่เว็บไซต์
                  </p>
                </div>

                <Link
                  href="/admin/moderation"
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1"
                >
                  <span>คิวทั้งหมด</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Search & Filter */}
              <div className="px-4 sm:px-5 py-3 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาประกาศหรือชื่อนายหน้า..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-slate-400 placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setModerationFilter('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                      moderationFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ทั้งหมด ({moderationItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModerationFilter('urgent')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
                      moderationFilter === 'urgent'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-amber-800 hover:bg-amber-50'
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="appointments">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    นัดหมายเข้าชมบ้านล่าสุด
                  </h3>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                    ความเคลื่อนไหวการนัดดูบ้านระหว่างลูกค้าและตัวแทนนายหน้า
                  </p>
                </div>
                <Link
                  href="/admin/analytics"
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-bold"
                >
                  ดูรายงานนัดหมาย
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {recentAppointments.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    ไม่มีรายการนัดหมายในขณะนี้
                  </div>
                ) : (
                  recentAppointments.map(app => {
                    let statusLabel = 'รอดำเนินการ';
                    let statusClass = 'text-amber-800 bg-amber-50 border border-amber-200 font-bold';
                    if (app.status === 'approved') {
                      statusLabel = 'ยืนยันแล้ว';
                      statusClass = 'text-emerald-800 bg-emerald-50 border border-emerald-200 font-bold';
                    } else if (app.status === 'completed') {
                      statusLabel = 'เข้าชมแล้ว';
                      statusClass = 'text-blue-800 bg-blue-50 border border-blue-200 font-bold';
                    } else if (app.status === 'cancelled' || app.status === 'rejected') {
                      statusLabel = 'ยกเลิก';
                      statusClass = 'text-rose-800 bg-rose-50 border border-rose-200 font-bold';
                    }

                    return (
                      <div
                        key={app.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">{app.customerName}</span>
                            {app.customerPhone !== '-' && (
                              <span className="text-slate-500 text-xs sm:text-sm font-medium">({app.customerPhone})</span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-xs ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                          <p className="text-slate-700 text-xs sm:text-sm truncate">
                            อสังหาฯ: <span className="font-bold text-slate-900">{app.propertyTitle}</span> {app.propertyLocation && <span className="text-slate-500 font-normal">· {app.propertyLocation}</span>}
                          </p>
                          <p className="text-slate-500 text-xs sm:text-sm">
                            นายหน้าผู้ดูแล: <span className="font-semibold text-slate-800">{app.agentName}</span>
                          </p>
                        </div>

                        <div className="text-left sm:text-right shrink-0 text-slate-600 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="font-bold text-slate-900 text-sm sm:text-base">{app.appointmentDate}</div>
                          <div className="text-xs sm:text-sm text-slate-600 font-medium">{app.timeSlot}</div>
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
          <div className="lg:col-span-4 space-y-6">

            {/* 1. งานรออนุมัติสิทธิ์อื่นๆ (With Indigo Accent) */}
            <div className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-indigo-500 shadow-xs p-5 space-y-5">
              <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">
                งานรอตรวจสอบสิทธิ์
              </h3>

              {/* 1.1 KYC */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span>ยืนยันตัวตน KYC</span>
                    {pendingKycList.length > 0 && (
                      <span className="text-xs font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.2 rounded-full">
                        {pendingKycList.length}
                      </span>
                    )}
                  </span>
                  <Link href="/admin/kyc" className="text-blue-600 hover:text-blue-800 text-xs font-bold">
                    ดูทั้งหมด
                  </Link>
                </div>

                {pendingKycList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded-xl">
                    ไม่มีคำขอ KYC ค้างอยู่
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingKycList.slice(0, 3).map(kyc => (
                      <div
                        key={kyc.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 text-sm truncate">{kyc.name}</p>
                          <p className="text-slate-500 text-xs font-medium">{kyc.phone} · {kyc.timeAgo}</p>
                        </div>
                        <Link
                          href="/admin/kyc"
                          className="px-3 py-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          ตรวจ
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1.2 Payments */}
              <div className="space-y-2.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <span>สลิปชำระเงิน PRO</span>
                    {pendingPaymentsList.length > 0 && (
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                        {pendingPaymentsList.length}
                      </span>
                    )}
                  </span>
                  <Link href="/admin/payments" className="text-blue-600 hover:text-blue-800 text-xs font-bold">
                    ดูทั้งหมด
                  </Link>
                </div>

                {pendingPaymentsList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-center bg-slate-50 rounded-xl">
                    ไม่มีสลิปรอตรวจสอบ
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingPaymentsList.slice(0, 3).map(pay => (
                      <div
                        key={pay.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-extrabold text-emerald-700 text-sm sm:text-base">{pay.formattedAmount}</p>
                          <p className="text-slate-500 text-xs truncate font-medium">{pay.packageName} · {pay.timeAgo}</p>
                        </div>
                        <Link
                          href="/admin/payments"
                          className="px-3 py-1.5 border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold shrink-0 transition-colors"
                        >
                          ตรวจ
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 1.3 Reports (Rose Accent) */}
              {pendingReportsList.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-800 text-sm flex items-center gap-1.5">
                      <span>รายงานปัญหา</span>
                      <span className="text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.2 rounded-full">
                        {pendingReportsList.length}
                      </span>
                    </span>
                    <Link href="/admin/reports" className="text-rose-700 hover:text-rose-900 text-xs font-bold">
                      จัดการ
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {pendingReportsList.slice(0, 2).map(rep => (
                      <div key={rep.id} className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80">
                        <p className="font-bold text-rose-950 text-xs sm:text-sm truncate">{rep.reason}</p>
                        <p className="text-rose-700 text-xs mt-0.5 font-medium">{rep.reporterName} · {rep.timeAgo}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. กิจกรรมล่าสุดในระบบ (Timeline with Semantic Dots) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[460px]">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">
                  บันทึกกิจกรรมล่าสุด
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  อัปเดตอัตโนมัติ
                </span>
              </div>

              {/* Semantic Timeline */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    ไม่มีกิจกรรมล่าสุด
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3">
                      {/* Semantic Dot Indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full ${getActivityDotClass(act.type)} mt-1.5 shrink-0`}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {act.title}
                          </span>
                          <span className="text-xs text-slate-400 font-medium shrink-0">
                            {act.timeAgo}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-0.5 line-clamp-2">
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
