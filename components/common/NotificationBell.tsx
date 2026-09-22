'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react'; // ใช้ดึงข้อมูลผู้ใช้ปัจจุบันเพื่อรับการแจ้งเตือนของบัญชีนั้น
import { useRouter } from 'next/navigation'; // ใช้พาไปหน้าที่เกี่ยวข้องเมื่อกดเข้าไปดูการแจ้งเตือน
import { getPusherClient } from '@/lib/pusher-client'; // ใช้เชื่อมต่อ Pusher เพื่อรับการแจ้งเตือนแบบเรียลไทม์
import { notificationChannelName } from '@/lib/notificationChannel'; // ใช้สร้างชื่อ channel การแจ้งเตือนของผู้ใช้แต่ละคน
import { toast } from '@/components/ui/toast'; // แสดงผล Toast ป๊อปอัปเด้งเตือนสดทันที
import {
  Bell,
  Calendar,
  MessageSquare,
  Home,
  CreditCard,
  Star,
  Info,
  Trash2,
  CheckCheck,
  X
} from 'lucide-react';

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

/** ฟังก์ชันคืนค่าการตกแต่งและไอคอน Lucide ตามหมวดหมู่ */
function getCategoryMeta(type: string) {
  switch (type) {
    case 'appointment':
    case 'appointment_reminder':
      return {
        label: 'นัดหมาย',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        bg: 'bg-blue-100 text-blue-600',
        icon: <Calendar className="w-3.5 h-3.5 shrink-0" />
      };
    case 'chat':
      return {
        label: 'ข้อความ',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        bg: 'bg-amber-100 text-amber-600',
        icon: <MessageSquare className="w-3.5 h-3.5 shrink-0" />
      };
    case 'property':
    case 'property_pending':
      return {
        label: 'ประกาศ',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        bg: 'bg-emerald-100 text-emerald-600',
        icon: <Home className="w-3.5 h-3.5 shrink-0" />
      };
    case 'payment':
    case 'package':
      return {
        label: 'การเงิน',
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        bg: 'bg-purple-100 text-purple-600',
        icon: <CreditCard className="w-3.5 h-3.5 shrink-0" />
      };
    case 'review':
      return {
        label: 'รีวิว',
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        bg: 'bg-indigo-100 text-indigo-600',
        icon: <Star className="w-3.5 h-3.5 shrink-0" />
      };
    default:
      return {
        label: 'ระบบ',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        bg: 'bg-slate-100 text-slate-600',
        icon: <Info className="w-3.5 h-3.5 shrink-0" />
      };
  }
}

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
      })
      .catch(err => console.error('Error fetching notifications:', err));
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

      // ⚡ ยิง Toast เด้งเตือนสดที่มุมจอทันที เพื่อให้ลูกค้ารับรู้แบบ Real-time
      toast.info(item.content, {
        title: item.title,
        duration: 5500
      });
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
      {/* ปุ่มกระดิ่งการแจ้งเตือน พร้อมตัวเลขแจ้งเตือนแบบ Pulse Animation */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-xl text-slate-600 hover:text-blue-700 hover:bg-slate-100/80 active:scale-95 transition cursor-pointer flex items-center justify-center focus:outline-none"
        aria-label="การแจ้งเตือน"
      >
        <Bell className="w-5 h-5 shrink-0" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 text-white text-[9px] font-black items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* กล่องแสดงผลศูนย์การแจ้งเตือน Popover */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden text-left">
          {/* Header แสดงชื่อระบบและปุ่ม "อ่านทั้งหมด" */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-slate-800 text-blue-400 flex items-center justify-center">
                <Bell className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">ศูนย์การแจ้งเตือน</h3>
                <p className="text-[9px] text-slate-400">Srichai Property Notifications</p>
              </div>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={() => markRead()} 
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* แถบสลับแท็บ Filter 'ทั้งหมด' / 'ยังไม่อ่าน' และปุ่ม 'ลบทั้งหมด' */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg text-[11px]">
              <button 
                onClick={() => setTab('all')} 
                className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${tab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                ทั้งหมด ({notifications.length})
              </button>
              <button 
                onClick={() => setTab('unread')} 
                className={`px-2.5 py-0.5 rounded-md font-bold transition cursor-pointer ${tab === 'unread' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                ยังไม่อ่าน ({unreadCount})
              </button>
            </div>
            {notifications.length > 0 && (
              <button 
                onClick={() => setConfirmId('all')} 
                className="text-[11px] font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
              >
                <Trash2 className="w-3 h-3 shrink-0" />
                ลบทั้งหมด
              </button>
            )}
          </div>

          {/* ป๊อบอัพแถบยืนยันการลบการแจ้งเตือนทั้งหมด */}
          {confirmId === 'all' && (
            <div className="px-3.5 py-2 bg-rose-50 border-b border-rose-200 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-rose-800">ลบการแจ้งเตือนทั้งหมด?</span>
              <div className="flex gap-1">
                <button onClick={() => deleteItem()} className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-rose-700 transition">ยืนยัน</button>
                <button onClick={() => setConfirmId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-300 transition">ยกเลิก</button>
              </div>
            </div>
          )}

          {/* รายการแสดงผลการแจ้งเตือนแต่ละรายการ */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {list.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">ไม่มีรายการแจ้งเตือนในขณะนี้</div>
            ) : (
              list.map(n => {
                const cat = getCategoryMeta(n.type);
                return (
                  <div key={n.id} className={`p-3 transition group ${!n.isRead ? 'bg-blue-50/40 border-l-4 border-blue-600' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}>
                    {confirmId === n.id ? (
                      <div className="flex items-center justify-between text-[11px] py-1">
                        <span className="font-semibold text-rose-700">ลบรายการนี้?</span>
                        <div className="flex gap-1">
                          <button onClick={() => deleteItem(n.id)} className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-rose-700 transition">ยืนยัน</button>
                          <button onClick={() => setConfirmId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer hover:bg-slate-300 transition">ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${cat.bg}`}>
                          {cat.icon}
                        </div>
                        {/* ส่วนรายละเอียดการแจ้งเตือน พร้อมคลิกเพื่อนำทาง (Navigate) */}
                        <div 
                          onClick={() => { 
                            if (!n.isRead) markRead(n.id); 
                            if (n.linkUrl) { 
                              setOpen(false); 
                              router.push(n.linkUrl); 
                            } 
                          }} 
                          className="flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${cat.badge}`}>{cat.label}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{formatTime(n.createdAt)}</span>
                          </div>
                          <h4 className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</h4>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-snug">{n.content}</p>
                          {n.linkUrl && <span className="text-[10px] font-semibold text-blue-600 mt-1 inline-block hover:underline">ดูรายละเอียด &rarr;</span>}
                        </div>
                        {/* ปุ่มลบรายการนี้ */}
                        <button 
                          onClick={() => setConfirmId(n.id)} 
                          className="p-1 text-slate-300 hover:text-rose-600 shrink-0 cursor-pointer transition"
                          title="ลบการแจ้งเตือนนี้"
                          aria-label="ลบการแจ้งเตือนนี้"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-center text-[9px] text-slate-400">ศรีชัย พร็อพเพอร์ตี้ &bull; อัปเดตข้อมูลอัตโนมัติแบบเรียลไทม์</div>
        </div>
      )}
    </div>
  );
}
