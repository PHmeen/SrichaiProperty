'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Message, MessageAvatar, MessageContent, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';

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

export interface SharedChatSession {
  id: string;
  name: string;
  avatar?: string;
  avatarLetter?: string;
  isActive?: boolean;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  hasMoreMessages?: boolean;
  propertyTitle?: string;
  propertyPrice?: string;
  propertyCode?: string;
  messages: SharedChatMessage[];
}

export interface OutgoingChatPayload {
  text?: string;
  fileUrl?: string;
  latitude?: number;
  longitude?: number;
}

interface SharedChatViewProps {
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
}

const TYPING_IDLE_MS = 2000;

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif)$/i;

// คอมโพเนนต์แสดงผลอวตารผู้สนทนา
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
      {sessionItem.isActive && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
    </div>
  );
}

/**
 * ==============================================================================
 * SHARED CHAT VIEW COMPONENT (ปรับปรุงโค้ดกระชับ ไม่ซ้ำซ้อน)
 * ==============================================================================
 */
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
  quickActions = []
}: SharedChatViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // เมนู ลบ/รายงาน
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('สแปม / ข้อความหลอกลวง');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredSessions = sessions.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.propertyTitle && s.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.propertyCode && s.propertyCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages.length, selectedSessionId]);

  // แจ้งว่าเปิดห้องนี้แล้ว (ให้หน้าเรียก API mark-as-read)
  useEffect(() => {
    if (activeSession && onOpenSession) {
      onOpenSession(activeSession.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  // แจ้งสถานะ "กำลังพิมพ์..." แบบ debounce (หยุดพิมพ์ 2 วิ = ถือว่าเลิกพิมพ์)
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

  // ส่งข้อความตัวหนังสือ
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

  // แนบไฟล์/รูปภาพ: อัปโหลดผ่าน /api/upload แล้วส่งเป็นข้อความ
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

  // โหลดข้อความเก่ากว่านี้ในห้องเดียวกัน
  const handleLoadOlderMessages = async () => {
    if (!activeSession || !onLoadOlderMessages || activeSession.messages.length === 0 || loadingOlder) return;
    setLoadingOlder(true);
    try {
      await onLoadOlderMessages(activeSession.id, activeSession.messages[0].id);
    } finally {
      setLoadingOlder(false);
    }
  };

  // แชร์ตำแหน่งปัจจุบัน
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

  // ลบข้อความเดียว
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

  // ลบห้องแชท
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

  // รายงานผู้ใช้
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

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col h-screen pt-14">
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex overflow-hidden gap-4 h-[calc(100vh-4rem)]">
        
        {/* SIDEBAR (รายการแชทซ้าย) */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col overflow-hidden h-full shrink-0 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">{role === 'agent' ? 'กล่องข้อความเอเย่นต์' : 'กล่องข้อความ'}</h2>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{filteredSessions.length} รายการ</span>
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหาชื่อ หรือ ทรัพย์..." className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400" />
          </div>

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
                      <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold mt-1 truncate max-w-full">🏠 {session.propertyTitle || session.propertyCode}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN CHAT ROOM (ขวา) */}
        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-slate-200/80 flex-col h-full overflow-hidden relative ${mobileShowMessages ? 'flex' : 'hidden md:flex'}`}>
          {activeSession ? (
            <>
              {/* Header */}
              <div className="border-b border-slate-100 flex flex-col bg-slate-50/80 backdrop-blur-sm z-10 shrink-0">
                <div className="h-14 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setMobileShowMessages(false)} className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition font-bold text-xs mr-1">← ย้อนกลับ</button>
                    <UserAvatar sessionItem={activeSession} size={36} />
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs md:text-sm leading-tight">{activeSession.name}</h3>
                      <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> กำลังออนไลน์
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-slate-200/60 rounded-full text-slate-500 font-bold text-base transition cursor-pointer" title="เมนูตัวเลือก">⋮</button>
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-white border border-slate-200 rounded-xl shadow-lg w-44 py-1 z-50 text-xs">
                        <button onClick={() => { setShowMenu(false); setShowReportModal(true); }} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer">🚩 รายงานพฤติกรรม</button>
                        <button onClick={handleDeleteChatSession} className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-rose-600 font-medium flex items-center gap-2 cursor-pointer border-t border-slate-100">🗑️ ลบห้องแชทนี้</button>
                      </div>
                    )}
                  </div>
                </div>

                {(activeSession.propertyTitle || activeSession.propertyCode) && (
                  <div className="px-4 py-2 bg-[#f8fafc] border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="truncate pr-2">
                      <span className="text-[9px] text-slate-400 font-bold block">ทรัพย์ที่สนใจ</span>
                      <h5 className="font-extrabold text-slate-800 text-[11px] truncate">🏠 {activeSession.propertyTitle || activeSession.propertyCode}</h5>
                    </div>
                    {activeSession.propertyPrice && <strong className="text-blue-600 font-extrabold text-xs block">{activeSession.propertyPrice}</strong>}
                  </div>
                )}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                {activeSession.hasMoreMessages && onLoadOlderMessages && (
                  <div className="flex justify-center pb-2">
                    <button onClick={handleLoadOlderMessages} disabled={loadingOlder} className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-600 rounded-full text-[10px] font-bold border border-slate-200 transition cursor-pointer">
                      {loadingOlder ? 'กำลังโหลด...' : 'โหลดข้อความเก่ากว่านี้'}
                    </button>
                  </div>
                )}
                {activeSession.messages.map((msg) => {
                  const isOutgoing = msg.sender === 'user' || msg.sender === 'agent';
                  return (
                    <div key={msg.id} className="relative group" onMouseEnter={() => setHoveredMessageId(msg.id)} onMouseLeave={() => setHoveredMessageId(null)}>
                      <Message align={isOutgoing ? 'end' : 'start'}>
                        {!isOutgoing && <MessageAvatar src={activeSession.avatar} fallback={activeSession.avatarLetter || activeSession.name.charAt(0)} />}
                        <MessageContent>
                          <div className="relative group/bubble flex items-center gap-2">
                            {hoveredMessageId === msg.id && (
                              <button onClick={() => handleDeleteSingleMessage(msg.id)} className={`text-[10px] p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ${isOutgoing ? 'order-first' : 'order-last'}`} title="ลบข้อความนี้">🗑️</button>
                            )}
                            <Bubble variant={isOutgoing ? 'primary' : 'outline'}>
                              <BubbleContent>
                                {msg.fileUrl && IMAGE_EXT_RE.test(msg.fileUrl) ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <Image src={msg.fileUrl} alt="ไฟล์แนบ" width={200} height={150} unoptimized className="rounded-lg object-cover max-w-[200px] max-h-[150px]" />
                                  </a>
                                ) : msg.fileUrl ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline">📄 เปิดไฟล์แนบ</a>
                                ) : msg.latitude != null && msg.longitude != null ? (
                                  <a href={`https://www.google.com/maps?q=${msg.latitude},${msg.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 underline">📍 ดูตำแหน่งบนแผนที่</a>
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
                {isTyping && <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold px-2 py-1"><span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />{activeSession.name} กำลังพิมพ์...</div>}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-slate-100 bg-white space-y-2 shrink-0">
                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((qa, idx) => (
                      <button key={idx} type="button" onClick={qa.action} className="px-2.5 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 transition cursor-pointer">{qa.label}</button>
                    ))}
                  </div>
                )}
                <form onSubmit={handleFormSubmit} className="flex gap-2 items-center">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="hidden" onChange={handleFileSelected} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer" title="แนบไฟล์/รูปภาพ">{uploading ? '⏳' : '📎'}</button>
                  <button type="button" onClick={handleShareLocation} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer" title="แชร์ตำแหน่ง">📍</button>
                  <input type="text" value={messageInput} onChange={(e) => handleMessageInputChange(e.target.value)} placeholder="พิมพ์ข้อความของคุณที่นี่..." className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-xs text-slate-800 font-medium transition" />
                  <button type="submit" disabled={sending || !messageInput.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer disabled:cursor-not-allowed shrink-0">{sending ? 'กำลังส่ง...' : 'ส่ง 📤'}</button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">กรุณาเลือกบทสนทนาจากรายการทางซ้าย</div>
          )}
        </div>
      </div>

      {/* Modal รายงาน */}
      {showReportModal && activeSession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm">🚩 รายงานข้อความ / ผู้ใช้</h3>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
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
