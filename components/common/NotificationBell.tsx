
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import { notificationChannelName } from '@/lib/notificationChannel';

// ==============================================================================
// 1. TYPE DEFINITIONS & HELPERS (โครงสร้างการแจ้งเตือนและฟังก์ชันช่วยเหลือ)
// ==============================================================================

/** โครงสร้างรายการการแจ้งเตือน (Notification Item) จากตาราง `notifications` ในฐานข้อมูล */
interface NotificationItem {
  id: string;          // รหัสการแจ้งเตือน (UUID)
  title: string;       // หัวข้อการแจ้งเตือนสไตล์ทางการ
  content: string;     // เนื้อหารายละเอียดการแจ้งเตือน
  isRead: boolean;     // สถานะอ่านแล้วหรือยัง
  type: string;        // ประเภทการแจ้งเตือน (appointment, chat, property, payment, review, default)
  linkUrl: string | null; // ลิงก์นำทางเมื่อคลิก (เช่น /chat?sessionId=...)
  createdAt: string;   // เวลาที่สร้างรายการ
}

/** ฟังก์ชันแปลงเวลาให้อยู่ในรูปแบบภาษาไทยกระชับ สุภาพ อ่านง่าย */
function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `วันนี้ ${time} น.`;
    return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${time} น.`;
  } catch {
    return '';
  }
}

/** ตารางแมปหมวดหมู่ประเภทการแจ้งเตือน สี Badges และ SVG Icons มาตรฐานสากล */
const CATEGORIES: Record<string, { label: string; badge: string; bg: string; icon: string }> = {
  appointment: { label: 'นัดหมาย', badge: 'bg-blue-50 text-blue-700 border-blue-200', bg: 'bg-blue-100 text-blue-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  chat: { label: 'ข้อความ', badge: 'bg-amber-50 text-amber-800 border-amber-200', bg: 'bg-amber-100 text-amber-600', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  property: { label: 'ประกาศ', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', bg: 'bg-emerald-100 text-emerald-600', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  property_pending: { label: 'ประกาศ', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', bg: 'bg-emerald-100 text-emerald-600', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  payment: { label: 'การชำระเงิน', badge: 'bg-purple-50 text-purple-800 border-purple-200', bg: 'bg-purple-100 text-purple-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  package: { label: 'การชำระเงิน', badge: 'bg-purple-50 text-purple-800 border-purple-200', bg: 'bg-purple-100 text-purple-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  review: { label: 'รีวิว', badge: 'bg-indigo-50 text-indigo-800 border-indigo-200', bg: 'bg-indigo-100 text-indigo-600', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  default: { label: 'ระบบ', badge: 'bg-slate-100 text-slate-700 border-slate-200', bg: 'bg-slate-100 text-slate-600', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }
};

// ==============================================================================
// 2. MAIN NOTIFICATION BELL COMPONENT (ปุ่มกระดิ่งและศูนย์แจ้งเตือน)
// ==============================================================================
export default function NotificationBell() {
  const { data: sessionData, status } = useSession();
  const userId = (sessionData?.user as { id?: string })?.id;
  const router = useRouter();

  // States สำหรับนับจำนวนยังไม่อ่าน รายการแจ้งเตือน สถานะการเปิด/ปิด Popover และการเลือกแท็บ
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [confirmId, setConfirmId] = useState<string | 'all' | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------------------------------
  // 2.1 ดึงรายการการแจ้งเตือนจากตารางฐานข้อมูล PostgreSQL (GET /api/notifications)
  // ----------------------------------------------------------------------------
  const loadData = useCallback(() => {
    if (status !== 'authenticated') return;
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUnreadCount(data.unreadCount || 0);
          setNotifications(data.notifications || []);
        }
      });
  }, [status]);

  useEffect(() => { loadData(); }, [loadData]);

  // ----------------------------------------------------------------------------
  // 2.2 เชื่อมต่อระบบ Pusher WebSocket รับการแจ้งเตือนแบบ Real-time ทันที
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(notificationChannelName(userId));
    
    // ฟัง Event เมื่อมีข้อความแชทใหม่ หรือกิจกรรมใหม่ส่งเข้ามา
    channel.bind('new-notification', (item: NotificationItem) => {
      setNotifications(prev => [item, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    });

    // ฟัง Event เมื่อมีการเปลี่ยนสถานะอ่าน/ลบรายการจากเครื่องหรือแท็บอื่น
    channel.bind('notifications-changed', loadData);

    return () => { channel.unbind_all(); pusher.unsubscribe(notificationChannelName(userId)); };
  }, [status, userId, loadData]);

  // ----------------------------------------------------------------------------
  // 2.3 ปิด Popover แจ้งเตือนเมื่อคลิกภายนอกพื้นที่ (Click Outside Handler)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmId(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ----------------------------------------------------------------------------
  // 2.4 ฟังก์ชันทำเครื่องหมายอ่านแล้ว (PATCH /api/notifications)
  // ----------------------------------------------------------------------------
  const markRead = (id?: string) => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { notificationId: id } : { markAll: true })
    }).then(() => {
      if (id) {
        setUnreadCount(v => Math.max(0, v - 1));
        setNotifications(list => list.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
        setUnreadCount(0);
        setNotifications(list => list.map(n => ({ ...n, isRead: true })));
      }
    });
  };

  // ----------------------------------------------------------------------------
  // 2.5 ฟังก์ชันลบการแจ้งเตือนจากตารางฐานข้อมูลจริง (DELETE /api/notifications)
  // ----------------------------------------------------------------------------
  const deleteItem = (id?: string) => {
    const isUnread = id ? notifications.find(n => n.id === id)?.isRead === false : false;
    fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { notificationId: id } : { deleteAll: true })
    }).then(() => {
      if (id) {
        setNotifications(list => list.filter(n => n.id !== id));
        if (isUnread) setUnreadCount(v => Math.max(0, v - 1));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      setConfirmId(null);
    });
  };

  // กรองรายการแจ้งเตือนตามแท็บที่เลือก ('all' = ทั้งหมด, 'unread' = ยังไม่อ่าน)
  const list = useMemo(() => tab === 'unread' ? notifications.filter(n => !n.isRead) : notifications, [notifications, tab]);

  // หากผู้ใช้ยังไม่ได้ล็อกอิน จะไม่แสดงปุ่มกระดิ่ง
  if (status !== 'authenticated') return null;

  // ==============================================================================
  // 3. RENDER UI LAYOUT (ปุ่มกระดิ่งและ Popover ศูนย์การแจ้งเตือน)
  // ==============================================================================
  return (
    <div className="relative font-sans" ref={ref}>
      {/* 🔔 ปุ่มกระดิ่งการแจ้งเตือน พร้อมตัวเลขแจ้งเตือนสีส้มแบบ Pulse Animation */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100/80 active:scale-95 transition cursor-pointer flex items-center justify-center focus:outline-none"
      >
        <svg className="w-5 h-5 stroke-[1.8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 text-white text-[9px] font-black items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* 📦 กล่องแสดงผลศูนย์การแจ้งเตือน Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden text-left">
          {/* Header แสดงชื่อระบบและปุ่ม "อ่านทั้งหมด" */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-slate-800 text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">ศูนย์การแจ้งเตือน</h3>
                <p className="text-[9px] text-slate-400">Srichai Property Notifications</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markRead()} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300">อ่านทั้งหมด</button>
            )}
          </div>

          {/* แถบสลับแท็บ Filter 'ทั้งหมด' / 'ยังไม่อ่าน' และปุ่ม 'ลบทั้งหมด' */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg text-[11px]">
              <button onClick={() => setTab('all')} className={`px-2.5 py-0.5 rounded-md font-bold ${tab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>ทั้งหมด ({notifications.length})</button>
              <button onClick={() => setTab('unread')} className={`px-2.5 py-0.5 rounded-md font-bold ${tab === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>ยังไม่อ่าน ({unreadCount})</button>
            </div>
            {notifications.length > 0 && (
              <button onClick={() => setConfirmId('all')} className="text-[11px] font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ลบทั้งหมด
              </button>
            )}
          </div>

          {/* ป๊อบอัพแถบยืนยันการลบการแจ้งเตือนทั้งหมด */}
          {confirmId === 'all' && (
            <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-rose-800">ลบการแจ้งเตือนทั้งหมด?</span>
              <div className="flex gap-1">
                <button onClick={() => deleteItem()} className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold">ยืนยัน</button>
                <button onClick={() => setConfirmId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* รายการแสดงผลการแจ้งเตือนแต่ละรายการ */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {list.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">ไม่มีรายการแจ้งเตือนในขณะนี้</div>
            ) : (
              list.map(n => {
                const cat = CATEGORIES[n.type] || CATEGORIES.default;
                return (
                  <div key={n.id} className={`p-3 transition group ${!n.isRead ? 'bg-blue-50/40 border-l-4 border-blue-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                    {confirmId === n.id ? (
                      <div className="flex items-center justify-between text-[11px] py-1">
                        <span className="font-semibold text-rose-700">ลบรายการนี้?</span>
                        <div className="flex gap-1">
                          <button onClick={() => deleteItem(n.id)} className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold">ยืนยัน</button>
                          <button onClick={() => setConfirmId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cat.bg}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={cat.icon} /></svg>
                        </div>
                        {/* ส่วนรายละเอียดการแจ้งเตือน พร้อมคลิกเพื่อนำทาง (Navigate) */}
                        <div onClick={() => { if (!n.isRead) markRead(n.id); if (n.linkUrl) { setOpen(false); router.push(n.linkUrl); } }} className="flex-1 min-w-0 cursor-pointer">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded border uppercase ${cat.badge}`}>{cat.label}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{formatTime(n.createdAt)}</span>
                          </div>
                          <h4 className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-snug">{n.content}</p>
                          {n.linkUrl && <span className="text-[10px] font-semibold text-blue-600 mt-1 inline-block">ดูรายละเอียด →</span>}
                        </div>
                        {/* ปุ่มลบรายการนี้ */}
                        <button onClick={() => setConfirmId(n.id)} className="p-1 text-slate-300 hover:text-rose-600 shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-center text-[9px] text-slate-400">ศรีชัย พร็อพเพอร์ตี้ • อัปเดตข้อมูลอัตโนมัติแบบเรียลไทม์</div>
        </div>
      )}
    </div>
  );
}


