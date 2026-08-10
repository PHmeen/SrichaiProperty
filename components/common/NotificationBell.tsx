'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher-client';
import { notificationChannelName } from '@/lib/notificationChannel';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: string;
  linkUrl: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const { data: sessionData, status } = useSession();
  const currentUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // id ของรายการที่กำลังถามยืนยันการลบอยู่ ('all' = กำลังยืนยันลบทั้งหมด)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | 'all' | null>(null);

  // ดึงข้อมูลการแจ้งเตือนจาก DB
  const loadData = React.useCallback(() => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // เชื่อมต่อ Pusher เพื่อรับการแจ้งเตือนใหม่แบบ real-time (แทนการ poll ทุก 10 วินาทีแบบเดิม)
  useEffect(() => {
    if (status !== 'authenticated' || !currentUserId) return;

    const pusher = getPusherClient();
    const channelName = notificationChannelName(currentUserId);
    const channel = pusher.subscribe(channelName);

    channel.bind('new-notification', (notification: NotificationItem) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);
    });

    // ซิงก์สถานะอ่านแล้ว/ลบ ข้ามแท็บ-อุปกรณ์ของผู้ใช้คนเดียวกัน (เช่น กดอ่านแล้วในมือถือ ให้เดสก์ท็อปอัปเดตตาม)
    channel.bind('notifications-changed', () => loadData());

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [status, currentUserId, loadData]);

  // ปิดเมื่อคลิกนอกพื้นที่
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // ทำเครื่องหมายอ่านแล้ว
  const markRead = (id?: string) => {
    fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { notificationId: id } : { markAll: true })
    }).then(() => {
      if (id) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    });
  };

  // ลบการแจ้งเตือน (id ระบุ = ลบทีละอัน, ไม่ระบุ = ลบทั้งหมด)
  const deleteNotification = (id?: string) => {
    const wasUnread = id ? notifications.find(n => n.id === id)?.isRead === false : false;
    fetch('/api/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(id ? { notificationId: id } : { deleteAll: true })
    }).then(() => {
      if (id) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
      setConfirmDeleteId(null);
    });
  };

  if (status !== 'authenticated') return null;

  return (
    <div className="relative font-sans" ref={ref}>
      {/* 🔔 ปุ่มกระดิ่ง */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer flex items-center justify-center"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* 📦 ป๊อบอัพการแจ้งเตือน */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden text-left">
          
          {/* Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between gap-2">
            <h3 className="font-extrabold text-xs flex items-center gap-1.5">
              <span>🔔</span> การแจ้งเตือน ({unreadCount})
            </h3>
            <div className="flex items-center gap-2.5 shrink-0">
              {unreadCount > 0 && (
                <button
                  onClick={() => markRead()}
                  className="text-[10px] font-bold text-blue-400 hover:text-white transition cursor-pointer"
                >
                  อ่านทั้งหมด
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setConfirmDeleteId('all')}
                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition cursor-pointer"
                >
                  ลบทั้งหมด
                </button>
              )}
            </div>
          </div>

          {/* แถบยืนยันการลบทั้งหมด */}
          {confirmDeleteId === 'all' && (
            <div className="px-3.5 py-2.5 bg-rose-50 border-b border-rose-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-rose-700">ลบการแจ้งเตือนทั้งหมด {notifications.length} รายการ?</span>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => deleteNotification()}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  ยืนยัน
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* รายการการแจ้งเตือน */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">
                ไม่มีรายการแจ้งเตือนในขณะนี้
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3.5 transition ${
                    !n.isRead ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'opacity-75'
                  }`}
                >
                  {confirmDeleteId === n.id ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-rose-700">ลบการแจ้งเตือนนี้?</span>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          ยืนยัน
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
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
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h4 className={`text-xs ${!n.isRead ? 'font-extrabold text-slate-900' : 'font-bold text-slate-700'}`}>
                            {n.title}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-medium shrink-0">
                            {new Date(n.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          {n.content}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteId(n.id)}
                        aria-label="ลบการแจ้งเตือนนี้"
                        className="shrink-0 p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
