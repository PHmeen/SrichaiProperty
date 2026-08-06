'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}

export default function NotificationBell() {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

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
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <h3 className="font-extrabold text-xs flex items-center gap-1.5">
              <span>🔔</span> การแจ้งเตือน ({unreadCount})
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markRead()}
                className="text-[10px] font-bold text-blue-400 hover:text-white transition cursor-pointer"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

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
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`p-3.5 transition cursor-pointer hover:bg-slate-50 ${
                    !n.isRead ? 'bg-blue-50/50 border-l-4 border-blue-600' : 'opacity-75'
                  }`}
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
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
