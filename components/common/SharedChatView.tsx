'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  Home,
  Paperclip,
  MapPin,
  Send,
  Trash2,
  Flag,
  X,
  FileText,
  Loader2,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck
} from 'lucide-react';
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { toast } from '@/components/ui/toast';
import { compressImage } from '@/lib/utils/compressImage';

// ==============================================================================
// 1. INTERFACES & TYPES (กำหนดโครงสร้างข้อมูลหน้าจอแชทกลาง)
// ==============================================================================

/** โครงสร้างข้อความแชทที่ใช้งานใน SharedChatView */
export interface SharedChatMessage {
  id: string | number;
  sender: 'user' | 'other' | 'client' | 'agent';
  text: string;
  time: string;
  fileUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isRead?: boolean;
}

/** โครงสร้างห้องแชทแต่ละห้อง */
export interface SharedChatSession {
  id: string;
  name: string;
  avatar?: string;
  avatarLetter?: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  hasMoreMessages?: boolean;
  propertyId?: string;
  propertyTitle?: string;
  propertyPrice?: string;
  propertyCode?: string;
  messages: SharedChatMessage[];
}

/** ข้อมูลข้อความใหม่ที่กำลังจะส่งออก */
export interface OutgoingChatPayload {
  text?: string;
  fileUrl?: string;
  latitude?: number;
  longitude?: number;
}

/** Props สำหรับ SharedChatView Component */
export interface SharedChatViewProps {
  role?: 'customer' | 'agent';
  sessions: SharedChatSession[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onSendMessage: (payload: OutgoingChatPayload) => Promise<void> | void;
  onDeleteMessage?: (messageId: string | number) => Promise<void> | void;
  onDeleteSession?: (sessionId: string) => Promise<void> | void;
  onReportSession?: (sessionId: string, reason: string, details?: string) => Promise<void> | void;
  onOpenSession?: (sessionId: string) => void;
  onTyping?: (isTyping: boolean) => void;
  onLoadOlderMessages?: (sessionId: string, oldestMessageId: string | number) => Promise<void> | void;
  isTyping?: boolean;
  quickActions?: { label: string; action: () => void }[];
  connectionError?: boolean;
}

const TYPING_IDLE_MS = 2000;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

// ==============================================================================
// 2. HELPER COMPONENTS (รูปโปรไฟล์อวตาร)
// ==============================================================================

function UserAvatar({ sessionItem, size = 40 }: { sessionItem: SharedChatSession; size?: number }) {
  return (
    <div className="relative shrink-0">
      {sessionItem.avatar ? (
        <Image
          src={sessionItem.avatar}
          width={size}
          height={size}
          className="rounded-full object-cover shadow-2xs border border-slate-200"
          style={{ width: size, height: size }}
          alt={sessionItem.name}
          unoptimized
        />
      ) : (
        <div
          className="rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs shadow-2xs"
          style={{ width: size, height: size }}
        >
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
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  // บนจอมือถือ: หากมี selectedSessionId เปิดเข้ามาให้แสดงห้องแชททันที
  const [mobileShowMessages, setMobileShowMessages] = useState<boolean>(Boolean(selectedSessionId));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('สแปม / ข้อความหลอกลวง');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // อัปเดตให้แสดงข้อความบนมือถือเมื่อ prop selectedSessionId เปลี่ยน
  const [prevSelectedId, setPrevSelectedId] = useState(selectedSessionId);
  if (selectedSessionId !== prevSelectedId) {
    setPrevSelectedId(selectedSessionId);
    if (selectedSessionId) {
      setMobileShowMessages(true);
    }
  }

  // ----------------------------------------------------------------------------
  // 3.2 กรองข้อมูลห้องแชทตามคำค้นหา
  // ----------------------------------------------------------------------------
  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.propertyTitle && s.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.propertyCode && s.propertyCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  // ----------------------------------------------------------------------------
  // 3.3 Effects: สกรอลล์ไปข้อความล่าสุดอัตโนมัติ และ แจ้งเปิดอ่านห้องแชท
  // ----------------------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length, selectedSessionId]);

  useEffect(() => {
    if (activeSession && onOpenSession) {
      onOpenSession(activeSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // ----------------------------------------------------------------------------
  // 3.4 ฟังก์ชันจัดการสถานะ "กำลังพิมพ์..."
  // ----------------------------------------------------------------------------
  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
    if (!onTyping) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping(true);
    }
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
  // 3.5 ฟังก์ชันส่งข้อความ
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
  // 3.6 ฟังก์ชันอัปโหลดและส่งไฟล์แนบ/รูปภาพ
  // ----------------------------------------------------------------------------
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.82 });
      const formData = new FormData();
      formData.append('file', compressed.file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        await onSendMessage({ fileUrl: data.url });
      } else {
        toast.error(data.error || 'อัปโหลดไฟล์ไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดขณะอัปโหลดไฟล์');
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // 3.7 ฟังก์ชันดึงประวัติข้อความเก่าเพิ่มเติม
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
  // 3.8 ฟังก์ชันแชร์ตำแหน่งพิกัดปัจจุบัน
  // ----------------------------------------------------------------------------
  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('อุปกรณ์นี้ไม่รองรับการแชร์ตำแหน่ง');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await onSendMessage({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        toast.success('แชร์ตำแหน่งปัจจุบันเรียบร้อยแล้ว');
      },
      () => toast.error('ไม่สามารถเข้าถึงตำแหน่งของคุณได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง'),
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
      toast.success('ลบข้อความเรียบร้อยแล้ว');
    } else {
      const res = await fetch(`/api/chat/messages?messageId=${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('ลบข้อความเรียบร้อยแล้ว');
        window.location.reload();
      } else {
        toast.error('ไม่สามารถลบข้อความได้');
      }
    }
  };

  const handleDeleteChatSession = async () => {
    if (!activeSession || !confirm(`ลบห้องแชทกับ "${activeSession.name}" ทั้งหมดใช่หรือไม่?`)) return;
    setShowMenu(false);
    if (onDeleteSession) {
      await onDeleteSession(activeSession.id);
      toast.success('ลบห้องแชทเรียบร้อยแล้ว');
    } else {
      const res = await fetch(`/api/chat/sessions?sessionId=${activeSession.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('ลบห้องแชทเรียบร้อยแล้ว');
        window.location.reload();
      } else {
        toast.error('ไม่สามารถลบห้องแชทได้');
      }
    }
  };

  // ----------------------------------------------------------------------------
  // 3.10 ฟังก์ชันส่งรายงานพฤติกรรมไม่เหมาะสม
  // ----------------------------------------------------------------------------
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setIsSubmittingReport(true);
    try {
      if (onReportSession) {
        await onReportSession(activeSession.id, reportReason, reportDetails);
      } else {
        const res = await fetch('/api/chat/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: activeSession.id, reason: reportReason, details: reportDetails })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'ส่งรายงานไม่สำเร็จ');
        }
      }
      toast.success('ส่งรายงานเรียบร้อยแล้ว ทีมงานจะดำเนินการตรวจสอบทันที');
      setShowReportModal(false);
      setReportDetails('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      toast.error(message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ==============================================================================
  // 4. RENDER UI LAYOUT
  // ==============================================================================
  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col h-screen pt-14">
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex overflow-hidden gap-4 h-[calc(100vh-4rem)]">

        {/* =================================================================== */}
        {/* 4.1 SIDEBAR: รายการห้องแชทฝั่งซ้าย */}
        {/* =================================================================== */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden h-full shrink-0 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          {/* Header ค้นหาห้องแชท */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">{role === 'agent' ? 'กล่องข้อความเอเย่นต์' : 'กล่องข้อความ'}</h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{filteredSessions.length} รายการ</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ ทรัพย์..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400"
            />
          </div>

          {/* รายการห้องแชท */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">ยังไม่มีบทสนทนา</div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => { onSelectSession(session.id); setMobileShowMessages(true); }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${session.id === selectedSessionId ? 'bg-blue-50/80 border-blue-200/80 shadow-2xs' : 'hover:bg-slate-50/80 border-transparent'}`}
                >
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
                        <Home className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{session.propertyTitle || session.propertyCode}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4.2 MAIN CHAT ROOM: พื้นที่ห้องแชทฝั่งขวา */}
        {/* =================================================================== */}
        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex-col h-full overflow-hidden relative ${mobileShowMessages ? 'flex' : 'hidden md:flex'}`}>
          {activeSession ? (
            <>
              {/* Header ห้องแชท และข้อมูลทรัพย์ */}
              <div className="border-b border-slate-100 flex flex-col bg-slate-50/80 backdrop-blur-sm z-10 shrink-0">
                <div className="h-14 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setMobileShowMessages(false)}
                      className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition font-bold text-xs mr-1 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>ย้อนกลับ</span>
                    </button>
                    <UserAvatar sessionItem={activeSession} size={36} />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs md:text-sm leading-tight">{activeSession.name}</h3>
                    </div>
                  </div>

                  {/* ปุ่มเมนูตัวเลือก (รายงาน / ลบห้องแชท) */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2 hover:bg-slate-200/60 rounded-full text-slate-500 transition cursor-pointer"
                      title="เมนูตัวเลือก"
                    >
                      <MoreVertical className="w-4 h-4 shrink-0" />
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-lg w-44 py-1 z-50 text-xs">
                        <button
                          onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span>รายงานพฤติกรรม</span>
                        </button>
                        <button
                          onClick={handleDeleteChatSession}
                          className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer border-t border-slate-100"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>ลบห้องแชทนี้</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* การ์ดสรุปข้อมูลทรัพย์สินที่กำลังสอบถาม */}
                {(activeSession.propertyTitle || activeSession.propertyCode) && (
                  <div className="px-4 py-2 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between text-xs gap-3">
                    <div className="truncate pr-2">
                      <span className="text-[9px] text-slate-400 font-bold block">ทรัพย์ที่สนใจ</span>
                      <h5 className="font-extrabold text-slate-800 text-[11px] truncate flex items-center gap-1">
                        <Home className="w-3 h-3 shrink-0 text-slate-500" />
                        <span className="truncate">{activeSession.propertyTitle || activeSession.propertyCode}</span>
                      </h5>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      {activeSession.propertyPrice && <strong className="text-blue-600 font-extrabold text-xs block">{activeSession.propertyPrice}</strong>}
                      {role === 'customer' && activeSession.propertyId && (
                        <Link
                          href={`/book-appointment?propertyId=${activeSession.propertyId}`}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-lg text-[11px] transition shadow-xs flex items-center gap-1 shrink-0"
                        >
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>นัดหมายเข้าชม</span>
                        </Link>
                      )}
                    </div>
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
                    <button
                      onClick={handleLoadOlderMessages}
                      disabled={loadingOlder}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                    >
                      {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความเก่ากว่านี้'}
                    </button>
                  </div>
                )}

                {/* ลูปแสดงผลข้อความแชท */}
                {activeSession.messages.map((msg) => {
                  const isOutgoing = msg.sender === 'user' || msg.sender === 'agent';
                  return (
                    <div
                      key={msg.id}
                      className="relative group"
                      onMouseEnter={() => setHoveredMessageId(msg.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <Message align={isOutgoing ? 'end' : 'start'}>
                        {!isOutgoing && (
                          <MessageAvatar
                            src={activeSession.avatar}
                            fallback={activeSession.avatarLetter || activeSession.name.charAt(0)}
                          />
                        )}
                        <MessageContent>
                          <div className="relative group/bubble flex items-center gap-2">
                            {/* ปุ่มลบข้อความเมื่อโฮเวอร์ (เฉพาะผู้ส่ง) */}
                            {hoveredMessageId === msg.id && isOutgoing && (
                              <button
                                onClick={() => handleDeleteSingleMessage(msg.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition order-first"
                                title="ลบข้อความนี้"
                              >
                                <Trash2 className="w-3 h-3 shrink-0" />
                              </button>
                            )}

                            <Bubble variant={isOutgoing ? 'primary' : 'outline'}>
                              <BubbleContent className="space-y-1.5">
                                {/* รูปภาพแนบ */}
                                {msg.fileUrl && IMAGE_EXT_RE.test(msg.fileUrl) && (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                                    <Image
                                      src={msg.fileUrl}
                                      alt="ไฟล์แนบ"
                                      width={220}
                                      height={160}
                                      unoptimized
                                      className="rounded-lg object-cover max-w-[220px] max-h-[160px]"
                                    />
                                  </a>
                                )}

                                {/* ไฟล์เอกสารอื่น (เช่น PDF) */}
                                {msg.fileUrl && !IMAGE_EXT_RE.test(msg.fileUrl) && (
                                  <a
                                    href={msg.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 underline text-xs font-bold"
                                  >
                                    <FileText className="w-3.5 h-3.5 shrink-0" />
                                    <span>เปิดไฟล์แนบ</span>
                                  </a>
                                )}

                                {/* พิกัดตำแหน่งสถานที่ */}
                                {msg.latitude != null && msg.longitude != null && (
                                  <a
                                    href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 underline text-xs font-bold text-blue-600"
                                  >
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                    <span>ดูตำแหน่งบนแผนที่</span>
                                  </a>
                                )}

                                {/* เนื้อหาข้อความตัวหนังสือ */}
                                {msg.text && (
                                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
                                )}
                              </BubbleContent>
                            </Bubble>
                          </div>

                          {/* Footer เวลา และ สถานะการอ่าน */}
                          <MessageFooter className="flex items-center gap-1 text-[10px]">
                            <span>{msg.time}</span>
                            {isOutgoing && (
                              msg.isRead ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 font-bold ml-1" title="เปิดอ่านแล้ว">
                                  <CheckCheck className="w-3 h-3 shrink-0" />
                                  <span>อ่านแล้ว</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] text-slate-400 ml-1" title="ส่งแล้ว">
                                  <Check className="w-3 h-3 shrink-0" />
                                </span>
                              )
                            )}
                          </MessageFooter>
                        </MessageContent>
                      </Message>
                    </div>
                  );
                })}

                {/* สัญญาณข้อความ "กำลังพิมพ์..." */}
                {isTyping && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold px-2 py-1">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    <span>{activeSession.name} กำลังพิมพ์...</span>
                  </div>
                )}

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
                      <button
                        key={idx}
                        type="button"
                        onClick={qa.action}
                        className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                      >
                        {qa.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ฟอร์มป้อนข้อความและปุ่มแนบไฟล์ */}
                <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={handleFileSelected}
                  />

                  {/* ปุ่มแนบไฟล์/รูปภาพ */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer"
                    title="แนบไฟล์/รูปภาพ"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <Paperclip className="w-4 h-4 shrink-0" />
                    )}
                  </button>

                  {/* ปุ่มแชร์ตำแหน่งพิกัด GPS */}
                  <button
                    type="button"
                    onClick={handleShareLocation}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer"
                    title="แชร์ตำแหน่ง"
                  >
                    <MapPin className="w-4 h-4 shrink-0" />
                  </button>

                  {/* ช่องพิมพ์ข้อความ */}
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleMessageInputChange(e.target.value)}
                    placeholder="พิมพ์ข้อความของคุณที่นี่..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-slate-800 font-medium transition"
                  />

                  {/* ปุ่มส่งข้อความ */}
                  <button
                    type="submit"
                    disabled={sending || !messageInput.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
                  >
                    {sending ? (
                      <span>กำลังส่ง...</span>
                    ) : (
                      <>
                        <span>ส่ง</span>
                        <Send className="w-3.5 h-3.5 shrink-0" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">
              กรุณาเลือกบทสนทนาจากรายการทางซ้าย
            </div>
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
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <Flag className="w-4 h-4 shrink-0 text-slate-600" />
                <span>รายงานข้อความ / ผู้ใช้</span>
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4 shrink-0" />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ผู้ใช้ที่ถูกรายงาน:</label>
                <input
                  type="text"
                  disabled
                  value={activeSession.name}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-slate-600 font-medium"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">หัวข้อการรายงาน:</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none focus:border-blue-500"
                >
                  <option value="สแปม / ข้อความหลอกลวง">สแปม / ข้อความหลอกลวง</option>
                  <option value="ใช้ถ้อยคำไม่เหมาะสม / หยาบคาย">ใช้ถ้อยคำไม่เหมาะสม / หยาบคาย</option>
                  <option value="ข้อมูลอสังหาฯ ไม่ตรงความเป็นจริง">ข้อมูลอสังหาฯ ไม่ตรงความเป็นจริง</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">รายละเอียดเพิ่มเติม (ถ้ามี):</label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="อธิบายเหตุการณ์หรือข้อความที่ไม่เหมาะสม..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  {isSubmittingReport ? 'กำลังส่ง...' : 'ส่งรายงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
