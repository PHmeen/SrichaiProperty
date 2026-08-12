'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';

// ==============================================================================
// 1. INTERFACES & TYPES (กำหนดโครงสร้างข้อมูลหน้าจอแชทกลาง)
// ==============================================================================

/** โครงสร้างข้อความแชทที่ใช้งานใน SharedChatView */
export interface SharedChatMessage {
  id: string | number;                         // รหัสประจำข้อความ
  sender: 'user' | 'other' | 'client' | 'agent';// ผู้ส่งข้อความ ('user'/'client' = ฝั่งผู้ใช้งาน, 'other'/'agent' = คู่สนทนา)
  text: string;                                // เนื้อหาข้อความ
  time: string;                                // เวลาแสดงผล (เช่น 14:30)
  fileUrl?: string | null;                     // ลิงก์รูปภาพหรือไฟล์แนบ
  latitude?: number | null;                    // ละติจูดพิกัดตำแหน่ง (ถ้ามี)
  longitude?: number | null;                   // ลองจิจูดพิกัดตำแหน่ง (ถ้ามี)
  isRead?: boolean;                            // สถานะอ่านแล้วหรือยัง
}

/** โครงสร้างห้องแชทแต่ละห้อง */
export interface SharedChatSession {
  id: string;                                  // รหัสประจำห้องแชท (UUID)
  name: string;                                // ชื่อคู่สนทนา
  avatar?: string;                             // รูปโปรไฟล์
  avatarLetter?: string;                       // ตัวอักษรย่อสำหรับโปรไฟล์ (กรณีไม่มีรูป)
  lastMessage: string;                         // ตัวอย่างข้อความล่าสุด
  time: string;                                // เวลาข้อความล่าสุด
  unreadCount?: number;                        // จำนวนข้อความที่ยังไม่อ่าน
  hasMoreMessages?: boolean;                   // มีข้อความประวัติเก่าให้โหลดหรือไม่
  propertyTitle?: string;                      // ชื่อทรัพย์อสังหาริมทรัพย์ที่สนใจ
  propertyPrice?: string;                      // ราคาขาย/เช่า
  propertyCode?: string;                       // รหัสทรัพย์สิน
  messages: SharedChatMessage[];               // รายการข้อความในห้องนี้
}

/** ข้อมูลข้อความใหม่ที่กำลังจะส่งออก */
export interface OutgoingChatPayload {
  text?: string;                               // ข้อความตัวหนังสือ
  fileUrl?: string;                            // ลิงก์ไฟล์แนบ
  latitude?: number;                           // พิกัดละติจูด
  longitude?: number;                          // พิกัดลองจิจูด
}

/** Props สำหรับ SharedChatView Component */
interface SharedChatViewProps {
  role?: 'customer' | 'agent';                 // บทบาทของผู้ใช้งานขณะนี้ ('customer' หรือ 'agent')
  sessions: SharedChatSession[];               // รายการห้องแชททั้งหมด
  selectedSessionId: string | null;            // รหัสห้องแชทที่กำลังเลือกอยู่
  onSelectSession: (id: string) => void;       // Event เลือกห้องแชท
  onSendMessage: (payload: OutgoingChatPayload) => Promise<void> | void; // Event ส่งข้อความ
  onDeleteMessage?: (messageId: string | number) => Promise<void> | void; // Event ลบข้อความเดียว
  onDeleteSession?: (sessionId: string) => Promise<void> | void;          // Event ลบห้องแชททั้งห้อง
  onReportSession?: (sessionId: string, reason: string, details?: string) => Promise<void> | void; // Event รายงานผู้ใช้
  onOpenSession?: (sessionId: string) => void; // Event เปิดห้องแชท (สำหรับทำเครื่องหมายอ่านแล้ว)
  onTyping?: (isTyping: boolean) => void;      // Event ส่งสัญญาณกำลังพิมพ์ข้อความ
  onLoadOlderMessages?: (sessionId: string, oldestMessageId: string | number) => Promise<void> | void; // Event โหลดข้อความเก่า
  isTyping?: boolean;                          // สถานะว่าคู่สนทนากำลังพิมพ์อยู่หรือไม่
  quickActions?: { label: string; action: () => void }[]; // ปุ่มคำสั่งด่วน (Quick Actions)
  connectionError?: boolean;                   // สถานะขัดข้องการเชื่อมต่อ Real-time
}

// เวลาหน่วงสถานะหยุดพิมพ์: ถ้าผู้ใช้ไม่พิมพ์ต่อภายใน 2 วินาที ระบบจะส่งสัญญาณ "หยุดพิมพ์" ให้อีกฝ่ายอัตโนมัติ
const TYPING_IDLE_MS = 2000;

// Regular Expression ตรวจสอบนามสกุลไฟล์ท้าย URL ว่าเป็นไฟล์รูปภาพหรือไม่ (ใช้เลือกว่าจะ render เป็น <Image> หรือลิงก์ดาวน์โหลดไฟล์)
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

// ==============================================================================
// 2. HELPER COMPONENTS & ICONS (ไอคอนและรูปโปรไฟล์อวตาร)
// ==============================================================================

/** คอมโพเนนต์แสดงผลไอคอน SVG เวกเตอร์แบบ Clean Outline */
function Icon({ path, className = 'w-4 h-4' }: { path: string; className?: string }) {
  return (
    <svg className={`${className} stroke-[1.8]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

/** พาธของไอคอน SVG หมวดหมู่ต่างๆ */
const ICONS = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  attach: 'M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 014.95 4.95l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
  pin: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  send: 'M6 12L3.269 3.126A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.876L5.999 12zm0 0h7.5',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  flag: 'M3 21V4m0 0h11l-1.5 3.5L18 11H3',
  close: 'M6 18L18 6M6 6l12 12',
  file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  spinner: 'M12 3v3m0 12v3m9-9h-3M6 12H3m15.364-6.364l-2.121 2.121M8.757 15.243l-2.121 2.121m12.728 0l-2.121-2.121M8.757 8.757L6.636 6.636',
  dots: 'M6 12h.01M12 12h.01M18 12h.01'
};

/** คอมโพเนนต์แสดงผลรูปโปรไฟล์อวตารผู้สนทนา */
function UserAvatar({ sessionItem, size = 40 }: { sessionItem: SharedChatSession; size?: number }) {
  return (
    <div className="relative shrink-0">
      {sessionItem.avatar ? (
        <Image src={sessionItem.avatar} width={size} height={size} className="rounded-full object-cover shadow-2xs border border-slate-200" style={{ width: size, height: size }} alt={sessionItem.name} unoptimized />
      ) : (
        <div className="rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs shadow-2xs" style={{ width: size, height: size }}>
          {sessionItem.avatarLetter || sessionItem.name.charAt(0)}
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// 3. MAIN SHARED CHAT VIEW COMPONENT (หน้าจอโต้ตอบแชทกลาง)
// ==============================================================================
export default function SharedChatView({
  role = 'customer',
  sessions,
  selectedSessionId,
  onSelectSession,
  onSendMessage,
  onDeleteMessage,
  onDeleteSession,
  onReportSession,
  onOpenSession,
  onTyping,
  onLoadOlderMessages,
  isTyping = false,
  quickActions = [],
  connectionError = false
}: SharedChatViewProps) {
  // ----------------------------------------------------------------------------
  // 3.1 States สำหรับฟอร์ม ค้นหา การอัปโหลด และสถานะ UI
  // ----------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');           // คำค้นหาห้องแชท
  const [messageInput, setMessageInput] = useState('');         // ข้อความที่กำลังพิมพ์
  const [sending, setSending] = useState(false);                 // สถานะกำลังส่งข้อความ
  const [uploading, setUploading] = useState(false);             // สถานะกำลังอัปโหลดไฟล์
  const [loadingOlder, setLoadingOlder] = useState(false);       // สถานะกำลังโหลดข้อความเก่า
  // ควบคุมว่าจอมือถือ (จอแคบ) กำลังแสดง "รายการห้องแชท" หรือ "ห้องแชทที่เลือก" อยู่
  // (บนจอ desktop แสดงทั้งสองฝั่งพร้อมกันเสมอ ไม่ใช้ state ตัวนี้)
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);           // อ้างอิง Element เลือกไฟล์
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // ตัวจับเวลาสถานะหยุดพิมพ์
  const isTypingRef = useRef(false);                             // ธงเช็กสถานะกำลังพิมพ์

  // States สำหรับป๊อบอัพเมนูรายงานความไม่เหมาะสม
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('สแปม / ข้อความหลอกลวง');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);           // อ้างอิงจุดล่างสุดสำหรับ Auto Scroll

  // ----------------------------------------------------------------------------
  // 3.2 กรองข้อมูลห้องแชทตามคำค้นหา (ค้นจากชื่อคู่สนทนา หรือ ชื่อทรัพย์)
  // ----------------------------------------------------------------------------
  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.propertyTitle && s.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.propertyCode && s.propertyCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ห้องแชทที่กำลังถูกเลือกเปิดดูอยู่ในขณะนี้
  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  // ----------------------------------------------------------------------------
  // 3.3 Effects: สกรอลล์ไปข้อความล่าสุดอัตโนมัติ และ แจ้งเปิดอ่านห้องแชท
  // ----------------------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length, selectedSessionId]);

  // แจ้งไปยัง Parent Component ว่าเปิดห้องแชทนี้แล้ว (เพื่อให้ระบบอัปเดตอ่านแล้ว)
  useEffect(() => {
    if (activeSession && onOpenSession) {
      onOpenSession(activeSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // ----------------------------------------------------------------------------
  // 3.4 ฟังก์ชันจัดการสถานะ "กำลังพิมพ์..." (Typing Indicator Debounce 2 วินาที)
  // ----------------------------------------------------------------------------
  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
    if (!onTyping) return;

    // เพิ่งเริ่มพิมพ์ (จากสถานะไม่ได้พิมพ์) -> แจ้งอีกฝ่ายว่า "กำลังพิมพ์" ทันที (ส่งครั้งเดียว ไม่ส่งซ้ำทุกตัวอักษร)
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
    // รีเซ็ตตัวจับเวลาทุกครั้งที่พิมพ์ต่อ (debounce) แล้วตั้งใหม่ให้ยิงสถานะ "หยุดพิมพ์" เมื่อไม่มีการพิมพ์ต่อภายใน TYPING_IDLE_MS
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTyping(false);
    }, TYPING_IDLE_MS);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // ----------------------------------------------------------------------------
  // 3.5 ฟังก์ชันส่งข้อความตัวหนังสือหลัก (Submit Handler)
  // ----------------------------------------------------------------------------
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || sending) return;
    const txt = messageInput;
    setMessageInput('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTyping?.(false);
    }
    setSending(true);
    try {
      await onSendMessage({ text: txt });
    } finally {
      setSending(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 3.6 ฟังก์ชันอัปโหลดและส่งไฟล์แนบ/รูปภาพ (Upload File -> /api/upload)
  // ----------------------------------------------------------------------------
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        await onSendMessage({ fileUrl: data.url });
      } else {
        alert(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดขณะอัปโหลดไฟล์');
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 3.7 ฟังก์ชันดึงประวัติข้อความเก่าเพิ่มเติม (Load Older Messages)
  // ----------------------------------------------------------------------------
  const handleLoadOlderMessages = async () => {
    if (!activeSession || !onLoadOlderMessages || activeSession.messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      await onLoadOlderMessages(activeSession.id, activeSession.messages[0].id);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 3.8 ฟังก์ชันแชร์ตำแหน่งพิกัดปัจจุบัน (GPS Geolocation -> Google Maps)
  // ----------------------------------------------------------------------------
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      alert('อุปกรณ์นี้ไม่รองรับการแชร์ตำแหน่ง');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await onSendMessage({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => alert('ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ----------------------------------------------------------------------------
  // 3.9 ฟังก์ชันลบข้อความเดียวและการลบห้องแชท
  // ----------------------------------------------------------------------------
  const handleDeleteSingleMessage = async (msgId: string | number) => {
    if (!confirm('ลบข้อความนี้ใช่หรือไม่?')) return;
    if (onDeleteMessage) {
      await onDeleteMessage(msgId);
    } else {
      const res = await fetch(`/api/chat/messages?messageId=${msgId}`, { method: 'DELETE' });
      if (res.ok) window.location.reload();
      else alert('ไม่สามารถลบข้อความได้');
    }
  };

  const handleDeleteChatSession = async () => {
    if (!activeSession || !confirm(`ลบห้องแชทกับ "${activeSession.name}" ทั้งหมดใช่หรือไม่?`)) return;
    setShowMenu(false);
    if (onDeleteSession) {
      await onDeleteSession(activeSession.id);
    } else {
      const res = await fetch(`/api/chat/sessions?sessionId=${activeSession.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('ลบห้องแชทเรียบร้อยแล้ว');
        window.location.reload();
      } else alert('ไม่สามารถลบห้องแชทได้');
    }
  };

  // ----------------------------------------------------------------------------
  // 3.10 ฟังก์ชันส่งรายงานพฤติกรรมไม่เหมาะสม (Report Form Submit)
  // ----------------------------------------------------------------------------
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setIsSubmittingReport(true);
    try {
      if (onReportSession) {
        await onReportSession(activeSession.id, reportReason, reportDetails);
      } else {
        await fetch('/api/chat/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id, reason: reportReason, details: reportDetails })
        });
      }
      alert('ส่งรายงานเรียบร้อยแล้ว');
      setShowReportModal(false);
      setReportDetails('');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ==============================================================================
  // 4. RENDER UI LAYOUT (ส่วนการแสดงผลอินเทอร์เฟซทั้งหมด)
  // ==============================================================================
  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col h-screen pt-14">
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex overflow-hidden gap-4 h-[calc(100vh-4rem)]">
        
        {/* =================================================================== */}
        {/* 4.1 SIDEBAR: รายการห้องแชทฝั่งซ้าย (Chat Sessions List) */}
        {/* =================================================================== */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden h-full shrink-0 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          {/* Header ค้นหาห้องแชท */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">{role === 'agent' ? 'กล่องข้อความเอเย่นต์' : 'กล่องข้อความ'}</h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{filteredSessions.length} รายการ</span>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อ หรือ ทรัพย์..." className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400" />
          </div>

          {/* รายการห้องแชท */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">ยังไม่มีบทสนทนา</div>
            ) : (
              filteredSessions.map((session) => (
                <div key={session.id} onClick={() => { onSelectSession(session.id); setMobileShowMessages(true); }} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${session.id === selectedSessionId ? 'bg-blue-50/80 border-blue-200/80 shadow-2xs' : 'hover:bg-slate-50/80 border-transparent'}`}>
                  <UserAvatar sessionItem={session} size={40} />
                  <div className="flex-1 overflow-hidden text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-slate-900 truncate">{session.name}</h4>
                      <span className="text-[9px] text-slate-400 font-bold">{session.time}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-slate-500 truncate text-[11px] font-normal flex-1">{session.lastMessage}</p>
                      {!!session.unreadCount && (
                        <span className="shrink-0 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">{session.unreadCount}</span>
                      )}
                    </div>
                    {(session.propertyTitle || session.propertyCode) && (
                      <span className="inline-flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold mt-1 truncate max-w-full">
                        <Icon path={ICONS.home} className="w-2.5 h-2.5 shrink-0" />
                        {session.propertyTitle || session.propertyCode}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4.2 MAIN CHAT ROOM: พื้นที่ห้องแชทฝั่งขวา (Active Chat Room) */}
        {/* =================================================================== */}
        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex-col h-full overflow-hidden relative ${mobileShowMessages ? 'flex' : 'hidden md:flex'}`}>
          {activeSession ? (
            <>
              {/* Header ห้องแชท และข้อมูลทรัพย์ */}
              <div className="border-b border-slate-100 flex flex-col bg-slate-50/80 backdrop-blur-sm z-10 shrink-0">
                <div className="h-14 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMobileShowMessages(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition font-bold text-xs mr-1">← ย้อนกลับ</button>
                    <UserAvatar sessionItem={activeSession} size={36} />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs md:text-sm leading-tight">{activeSession.name}</h3>
                    </div>
                  </div>

                  {/* ปุ่มเมนูตัวเลือก (รายงาน / ลบห้องแชท) */}
                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-slate-200/60 rounded-full text-slate-500 transition cursor-pointer" title="เมนูตัวเลือก">
                      <Icon path={ICONS.dots} className="w-4 h-4" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-lg w-44 py-1 z-50 text-xs">
                        <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer">
                          <Icon path={ICONS.flag} className="w-3.5 h-3.5" /> รายงานพฤติกรรม
                        </button>
                        <button onClick={handleDeleteChatSession} className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer border-t border-slate-100">
                          <Icon path={ICONS.trash} className="w-3.5 h-3.5" /> ลบห้องแชทนี้
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* การ์ดสรุปข้อมูลทรัพย์สินที่กำลังสอบถาม */}
                {(activeSession.propertyTitle || activeSession.propertyCode) && (
                  <div className="px-4 py-2 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="text-[9px] text-slate-400 font-bold block">ทรัพย์ที่สนใจ</span>
                      <h5 className="font-extrabold text-slate-800 text-[11px] truncate flex items-center gap-1">
                        <Icon path={ICONS.home} className="w-3 h-3 shrink-0" /> {activeSession.propertyTitle || activeSession.propertyCode}
                      </h5>
                    </div>
                    {activeSession.propertyPrice && <strong className="text-blue-600 font-extrabold text-xs block">{activeSession.propertyPrice}</strong>}
                  </div>
                )}
              </div>

              {/* แบนเนอร์เตือนหากการเชื่อมต่อ Real-time มีปัญหา */}
              {connectionError && (
                <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-[10px] font-bold text-center shrink-0">
                  การเชื่อมต่อแชทเรียลไทม์มีปัญหา ข้อความอาจไม่อัปเดตอัตโนมัติ กรุณารีเฟรชหน้า
                </div>
              )}

              {/* พื้นที่แสดงบอลลูนข้อความ (Messages List) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                {/* ปุ่มโหลดข้อความประวัติย้อนหลัง */}
                {activeSession.hasMoreMessages && onLoadOlderMessages && (
                  <div className="flex justify-center pb-2">
                    <button onClick={handleLoadOlderMessages} disabled={loadingOlder} className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200 transition cursor-pointer">
                      {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความเก่ากว่านี้'}
                    </button>
                  </div>
                )}
                
                {/* ลูปแสดงผลข้อความแชท */}
                {activeSession.messages.map((msg) => {
                  // ข้อความ "ขาออก" (ฝั่งเราเป็นคนส่ง) จะชิดขวา ส่วนข้อความ "ขาเข้า" (คู่สนทนาส่งมา) จะชิดซ้าย
                  // 'user'/'agent' = เราเป็นคนส่ง (ไม่ว่าจะเปิดหน้านี้จากฝั่งลูกค้าหรือนายหน้า), 'other'/'client' = อีกฝ่ายส่งมา
                  const isOutgoing = msg.sender === 'user' || msg.sender === 'agent';
                  return (
                    <div key={msg.id} className="relative group" onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                      <Message align={isOutgoing ? 'end' : 'start'}>
                        {!isOutgoing && <MessageAvatar src={activeSession.avatar} fallback={activeSession.avatarLetter || activeSession.name.charAt(0)} />}
                        <MessageContent>
                          <div className="relative group/bubble flex items-center gap-2">
                            {/* ปุ่มลบข้อความเมื่อโฮเวอร์ (แสดงเฉพาะข้อความที่กำลังชี้เมาส์ค้างอยู่) */}
                            {/* order-first/order-last สลับตำแหน่งปุ่มให้อยู่ "นอกบับเบิล" เสมอ:
                                ข้อความขาออก (ชิดขวา) ปุ่มจะอยู่ซ้ายของบับเบิล, ข้อความขาเข้า (ชิดซ้าย) ปุ่มจะอยู่ขวาของบับเบิล */}
                            {hoveredMessageId === msg.id && (
                              <button onClick={() => handleDeleteSingleMessage(msg.id)} className={`p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ${isOutgoing ? 'order-first' : 'order-last'}`} title="ลบข้อความนี้">
                                <Icon path={ICONS.trash} className="w-3 h-3" />
                              </button>
                            )}
                            <Bubble variant={isOutgoing ? 'primary' : 'outline'}>
                              <BubbleContent>
                                {/* เลือกรูปแบบการแสดงผลตามชนิดของข้อความ เรียงลำดับความสำคัญ:
                                    1) ไฟล์แนบที่เป็นรูปภาพ (.jpg/.png/.webp/.gif) -> แสดงเป็นรูปภาพย่อคลิกเปิดดูขนาดเต็มได้
                                    2) ไฟล์แนบชนิดอื่น (เช่น PDF) -> แสดงเป็นลิงก์ "เปิดไฟล์แนบ"
                                    3) พิกัดตำแหน่ง (มีทั้ง latitude และ longitude) -> แสดงลิงก์เปิด Google Maps
                                    4) ข้อความตัวหนังสือธรรมดา -> แสดงข้อความตรงๆ */}
                                {msg.fileUrl && IMAGE_EXT_RE.test(msg.fileUrl) ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Image src={msg.fileUrl} alt="ไฟล์แนบ" width={200} height={150} unoptimized className="rounded-lg object-cover max-w-[200px] max-h-[150px]" />
                                  </a>
                                ) : msg.fileUrl ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline"><Icon path={ICONS.file} className="w-3.5 h-3.5" /> เปิดไฟล์แนบ</a>
                                ) : msg.latitude != null && msg.longitude != null ? (
                                  <a href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline"><Icon path={ICONS.pin} className="w-3.5 h-3.5" /> ดูตำแหน่งบนแผนที่</a>
                                ) : (
                                  msg.text
                                )}
                              </BubbleContent>
                            </Bubble>
                          </div>
                          <MessageFooter>{msg.time}</MessageFooter>
                        </MessageContent>
                      </Message>
                    </div>
                  );
                })}

                {/* สัญญาณข้อความ "กำลังพิมพ์..." */}
                {isTyping && <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold px-2 py-1"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />{activeSession.name} กำลังพิมพ์...</div>}
                
                {/* Element สำหรับสั่งสกรอลล์ลงด้านล่างสุด */}
                <div ref={messagesEndRef} />
              </div>

              {/* =================================================================== */}
              {/* 4.3 INPUT AREA: แถบพิมพ์ข้อความและส่งไฟล์ด้านล่าง */}
              {/* =================================================================== */}
              <div className="p-3 border-t border-slate-100 bg-white space-y-2 shrink-0">
                {/* แถบคำสั่งด่วน (Quick Actions) */}
                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((qa, idx) => (
                      <button key={idx} type="button" onClick={qa.action} className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition cursor-pointer">{qa.label}</button>
                    ))}
                  </div>
                )}
                
                {/* ฟอร์มป้อนข้อความและปุ่มแนบไฟล์ */}
                <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileSelected} />
                  
                  {/* ปุ่มแนบไฟล์/รูปภาพ */}
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer" title="แนบไฟล์/รูปภาพ">
                    <Icon path={uploading ? ICONS.spinner : ICONS.attach} className={`w-4 h-4 ${uploading ? 'animate-spin' : ''}`} />
                  </button>

                  {/* ปุ่มแชร์ตำแหน่งพิกัด GPS */}
                  <button type="button" onClick={handleShareLocation} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer" title="แชร์ตำแหน่ง">
                    <Icon path={ICONS.pin} className="w-4 h-4" />
                  </button>

                  {/* ช่องพิมพ์ข้อความ */}
                  <input type="text" value={messageInput} onChange={(e) => handleMessageInputChange(e.target.value)} placeholder="พิมพ์ข้อความของคุณที่นี่..." className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-slate-800 font-medium transition" />
                  
                  {/* ปุ่มส่งข้อความ */}
                  <button type="submit" disabled={sending || !messageInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5">
                    {sending ? 'กำลังส่ง...' : <>ส่ง <Icon path={ICONS.send} className="w-3.5 h-3.5" /></>}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">กรุณาเลือกบทสนทนาจากรายการทางซ้าย</div>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4.4 REPORT MODAL: ป๊อบอัพส่งรายงานพฤติกรรมไม่เหมาะสม */}
      {/* =================================================================== */}
      {showReportModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5"><Icon path={ICONS.flag} className="w-4 h-4" /> รายงานข้อความ / ผู้ใช้</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600"><Icon path={ICONS.close} className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleReportSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ผู้ใช้ที่ถูกรายงาน:</label>
                <input type="text" disabled value={activeSession.name} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-medium" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">หัวข้อการรายงาน:</label>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none focus:border-blue-500">
                  <option value="สแปม / ข้อความหลอกลวง">สแปม / ข้อความหลอกลวง</option>
                  <option value="ใช้ถ้อยคำไม่เหมาะสม / หยาบคาย">ใช้ถ้อยคำไม่เหมาะสม / หยาบคาย</option>
                  <option value="ข้อมูลอสังหาฯ ไม่ตรงความเป็นจริง">ข้อมูลอสังหาฯ ไม่ตรงความเป็นจริง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดเพิ่มเติม (ถ้ามี):</label>
                <textarea rows={3} value={reportDetails} onChange={(e) => setReportDetails(e.target.value)} placeholder="อธิบายเหตุการณ์หรือข้อความที่ไม่เหมาะสม..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition">ยกเลิก</button>
                <button type="submit" disabled={isSubmittingReport} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs">{isSubmittingReport ? 'กำลังส่ง...' : 'ส่งรายงาน'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
