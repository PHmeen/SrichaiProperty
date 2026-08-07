'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import StatCards from '@/components/admin/StatCards';
import ModerationList from '@/components/admin/ModerationList';

const REFRESH_INTERVAL_MS = 15000;

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

interface Toast {
  id: number;
  message: string;
  variant: 'success' | 'error';
}

export default function AdminDashboardPage() {
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [newAgents, setNewAgents] = useState<NewAgent[]>([]);

  const [pendingCount, setPendingCount] = useState(0);
  const [approvedListingsCount, setApprovedListingsCount] = useState(0);
  const [agentsCount, setAgentsCount] = useState(0);
  const [proAgentsCount, setProAgentsCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [adminIp, setAdminIp] = useState<string>('...');

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // --- Notification dropdown ---
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // --- Toast notifications (แทน alert()) ---
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, variant: Toast['variant'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // --- 1. Terminal Log State ---
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (newLog: string) => {
    setLogs(prev => [newLog, ...prev]);
  };

  // --- 2. ดึงข้อมูลจากฐานข้อมูลจริงเมื่อโหลดหน้าจอ (พร้อม polling เพื่อให้เป็น Real-time จริง) ---
  const fetchDashboardData = (isBackground = false) => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPendingCount(data.pendingCount);
          setApprovedListingsCount(data.approvedListingsCount);
          setAgentsCount(data.agentsCount);
          setProAgentsCount(data.proAgentsCount);
          setModerationItems(data.moderationItems);
          setNewAgents(data.newAgents);
          setReportsCount(data.reportsCount);
          setAdminIp(data.adminIp || 'unknown');
          if (data.systemLogs && data.systemLogs.length > 0) {
            setLogs(data.systemLogs);
          }
          setFetchError(null);
        } else {
          setFetchError(data.error);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching admin dashboard data:", err);
        if (!isBackground) setFetchError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const filteredModerationItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return moderationItems;
    return moderationItems.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.seller.toLowerCase().includes(q)
    );
  }, [moderationItems, searchQuery]);

  interface NotificationItem {
    id: string;
    icon: string;
    text: string;
    href: string;
    urgent?: boolean;
  }

  const notifications = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    moderationItems
      .filter(m => m.slaUrgent)
      .forEach(m => items.push({
        id: `sla-${m.id}`,
        icon: '⏱️',
        text: `ประกาศ "${m.title}" ใกล้เกินกำหนด SLA (${m.sla})`,
        href: '/admin/moderation',
        urgent: true
      }));

    if (reportsCount > 0) {
      items.push({
        id: 'reports',
        icon: '⚠️',
        text: `มีรายงานปัญหาจากลูกค้ารอตรวจสอบ ${reportsCount} รายการ`,
        href: '/admin/reports',
        urgent: true
      });
    }

    if (pendingCount > 0) {
      items.push({
        id: 'pending',
        icon: '📋',
        text: `มีประกาศรออนุมัติทั้งหมด ${pendingCount} รายการ`,
        href: '/admin/moderation'
      });
    }

    newAgents.slice(0, 3).forEach(a => items.push({
      id: `agent-${a.id}`,
      icon: '👤',
      text: `นายหน้าใหม่ "${a.name}" สมัครเข้าระบบ (${a.timeAgo})`,
      href: '/admin/users'
    }));

    return items;
  }, [moderationItems, reportsCount, pendingCount, newAgents]);

  const urgentNotificationCount = notifications.filter(n => n.urgent).length;

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
        showToast(`อนุมัติคำขอ "${title}" และเผยแพร่ขึ้นฐานข้อมูลสำเร็จ`, 'success');
        fetchDashboardData(); // ดึงข้อมูลใหม่
      } else {
        showToast("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", 'error');
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
        showToast(`ปฏิเสธคำขอ "${title}" เรียบร้อยแล้ว`, 'success');
        fetchDashboardData(); // ดึงข้อมูลใหม่
      } else {
        showToast("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถดำเนินการได้"), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล", 'error');
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
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg font-bold text-sm text-white ${t.variant === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
          {/* Search Box */}
          <div className="relative w-80">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ค้นหาประกาศ (ชื่อ, PRJ-XXX), รหัส/ชื่อนายหน้า..."
              aria-label="ค้นหาประกาศหรือนายหน้า"
              className="w-full pl-8 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            />
          </div>

          {/* Admin Stats Status */}
          <div className="flex items-center gap-4">
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[9px] font-black tracking-wide border border-slate-200">
              IP: {adminIp}
            </span>
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setShowNotifications(v => !v)}
                aria-label={`การแจ้งเตือน (${notifications.length} รายการ)`}
                className="relative w-8 h-8 rounded-full border border-slate-200 hover:bg-slate-50 flex items-center justify-center transition-colors"
              >
                🔔
                {urgentNotificationCount > 0 && (
                  <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 text-sm">🔔 การแจ้งเตือน</span>
                    <span className="text-[9px] text-slate-400 font-bold">{notifications.length} รายการ</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 font-bold text-sm">
                        ไม่มีการแจ้งเตือนใหม่
                      </div>
                    ) : (
                      notifications.map(n => (
                        <Link
                          key={n.id}
                          href={n.href}
                          onClick={() => setShowNotifications(false)}
                          className="flex items-start gap-2.5 p-3 hover:bg-slate-50 transition-colors"
                        >
                          <span className="text-base shrink-0">{n.icon}</span>
                          <span className={`text-xs font-semibold leading-relaxed ${n.urgent ? 'text-rose-600' : 'text-slate-700'}`}>
                            {n.text}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Error banner */}
          {fetchError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center justify-between">
              <span>⚠️ {fetchError}</span>
              <button onClick={() => fetchDashboardData()} className="underline font-black">ลองใหม่</button>
            </div>
          )}

          {/* Title Area */}
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-none">ภาพรวมระบบ (System Overview)</h2>
            <p className="text-slate-400 text-[10px] font-bold mt-1.5 flex items-center gap-1.5">
              ข้อมูลอัปเดตแบบ Real-time (ทุก {REFRESH_INTERVAL_MS / 1000} วินาที) <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse">Live</span>
            </p>
          </div>

          {/* ==================================================== */}
          {/* 📊 4 KPI CARDS ROW                                   */}
          {/* ==================================================== */}
          <StatCards
            pendingCount={pendingCount}
            approvedListingsCount={approvedListingsCount}
            agentsCount={agentsCount}
            proAgentsCount={proAgentsCount}
          />

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

                <ModerationList
                  items={filteredModerationItems}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
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
                        <Link
                          href="/admin/users"
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-all"
                        >
                          ดูโปรไฟล์
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* ฝั่งขวา: Audit Logs & Reports (lg:col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* System Audit Logs Window */}
              <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[340px]">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-extrabold text-xs">💻 System Audit Logs</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      LIVE DB ACTIVITY
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                </div>

                {/* Console Log content */}
                <div className="flex-1 p-3 font-mono text-xs text-slate-200 space-y-2 overflow-y-auto bg-[#0b0f19] custom-scrollbar">
                  {logs.map((log, idx) => {
                    // Extract time [HH:mm:ss], tag, and detail content
                    const match = log.match(/^\[(.*?)\]\s+([A-Z_]+)\s+(.*)$/);
                    
                    if (!match) {
                      return (
                        <div key={idx} className="text-slate-400 py-0.5">
                          {log}
                        </div>
                      );
                    }

                    const [, time, tag, detail] = match;

                    let tagStyle = 'bg-slate-800 text-slate-300 border-slate-700';
                    if (tag === 'LOGIN') tagStyle = 'bg-sky-950 text-sky-300 border-sky-800/60 font-bold';
                    if (tag === 'PAYMENT') tagStyle = 'bg-amber-950 text-amber-300 border-amber-800/60 font-bold';
                    if (tag === 'PROPERTY') tagStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800/60 font-bold';
                    if (tag === 'SUCCESS' || tag === 'APPROVED') tagStyle = 'bg-emerald-900 text-emerald-200 border-emerald-700 font-black';
                    if (tag === 'ALERT' || tag === 'REJECTED' || tag === 'FAIL') tagStyle = 'bg-rose-950 text-rose-300 border-rose-800/60 font-bold';
                    if (tag === 'SYSTEM') tagStyle = 'bg-purple-950 text-purple-300 border-purple-800/60 font-bold';

                    return (
                      <div key={idx} className="flex items-start gap-2.5 py-1 px-1.5 rounded hover:bg-slate-900/60 transition-colors border-b border-slate-900/40">
                        {/* 1. Time */}
                        <span className="text-[10px] font-semibold text-slate-500 shrink-0 pt-0.5 select-none">
                          {time}
                        </span>

                        {/* 2. Badge Tag */}
                        <span className={`px-1.5 py-0.5 text-[9px] rounded border shrink-0 uppercase tracking-wider ${tagStyle}`}>
                          {tag}
                        </span>

                        {/* 3. Detail Content */}
                        <span className="text-slate-200 text-xs font-normal leading-relaxed break-all">
                          {detail}
                        </span>
                      </div>
                    );
                  })}

                  <div className="flex items-center gap-1.5 pt-2 px-1 text-xs">
                    <span className="text-emerald-400 font-bold">admin@srichai:~#</span>
                    <span className="w-2 h-3.5 bg-emerald-400 animate-pulse"></span>
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
