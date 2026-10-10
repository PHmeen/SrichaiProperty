'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Search, Users } from 'lucide-react';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { setActiveChatSession } from '@/lib/realtime/activeChatSession';
import SharedChatView, { SharedChatSession, OutgoingChatPayload } from '@/components/common/SharedChatView';
import { toast } from '@/components/ui/toast';

// ==============================================================================
// 1. TYPE DEFINITIONS (โครงสร้างข้อมูลข้อความและห้องแชทฝั่งลูกค้า)
// ==============================================================================

/** โครงสร้างข้อมูลของข้อความแชทแต่ละรายการ (Message Item) */
interface ChatMessage {
  id: string | number;           // รหัสประจำข้อความ
  sender: 'user' | 'other';      // ผู้ส่ง ('user' = ลูกค้าส่งเอง, 'other' = นายหน้าส่งมา)
  text: string;                  // ข้อความตัวหนังสือ
  time: string;                  // เวลาส่งข้อความ (เช่น 14:30)
  fileUrl?: string | null;       // ลิงก์รูปภาพ/ไฟล์แนบ (ถ้ามี)
  latitude?: number | null;      // ละติจูดพิกัดสถานที่ (ถ้ามี)
  longitude?: number | null;     // ลองจิจูดพิกัดสถานที่ (ถ้ามี)
  isRead?: boolean;              // สถานะอ่านแล้วหรือยัง
}

/** โครงสร้างข้อมูลของห้องแชทแต่ละห้อง (Chat Session Item) */
interface ChatSession {
  id: string;                    // รหัสประจำห้องแชท (UUID)
  name: string;                  // ชื่อคู่สนทนา (ชื่อนายหน้า)
  avatar: string;                // รูปโปรไฟล์นายหน้า
  lastMessage: string;           // ตัวอย่างข้อความล่าสุด
  time: string;                  // เวลาข้อความล่าสุด
  unreadCount?: number;          // จำนวนข้อความที่ยังไม่ได้อ่าน
  hasMoreMessages?: boolean;     // มีข้อความเก่ากว่านี้ให้โหลดหรือไม่
  propertyId?: string;           // รหัสอสังหาริมทรัพย์ที่สนใจ
  propertyTitle: string;         // ชื่ออสังหาริมทรัพย์ที่สนใจ
  propertyPrice: string;         // ราคาอสังหาริมทรัพย์
  propertyImage: string;         // รูปภาพอสังหาริมทรัพย์
  messages: ChatMessage[];       // รายการข้อความทั้งหมดในห้องนี้
}

// ==============================================================================
// 2. CHAT CONTENT COMPONENT (ส่วนประมวลผลตรรกะและจัดการแชทฝั่งลูกค้า)
// ==============================================================================
function ChatContent() {
  // ----------------------------------------------------------------------------
  // 2.1 State และ Hook หลักของ Next.js และ NextAuth
  // ----------------------------------------------------------------------------
  const { data: sessionData, status: sessionStatus } = useSession();
  const currentUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  
  // ดึงค่า sessionId จาก URL Query Parameter (เช่น /chat?sessionId=xxx)
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  // State สำหรับเก็บรายการห้องแชท, สถานะโหลดข้อมูล, และห้องแชทที่กำลังเลือกอยู่
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);
  const [syncedSessionId, setSyncedSessionId] = useState<string | null>(initialSessionId);

  // ซิงก์ sessionId หาก URL มีการเปลี่ยนพารามิเตอร์ขณะเปิดหน้านี้อยู่ (เช่น กดดูแชทจากการแจ้งเตือน)
  if (initialSessionId && initialSessionId !== syncedSessionId) {
    setSyncedSessionId(initialSessionId);
    setSelectedSessionId(initialSessionId);
  }

  // ----------------------------------------------------------------------------
  // 2.2 ฟังก์ชันดึงข้อมูลห้องแชทและข้อความจาก API (GET /api/chat/sessions)
  // ----------------------------------------------------------------------------
  const fetchChatData = useCallback(() => {
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          // หากมีห้องแชท และยังไม่ได้เลือกห้อง ให้เลือกห้องตรงตาม URL หรือห้องแรกเป็นหลัก
          if (data.sessions.length > 0) {
            const matched = data.sessions.find((s: ChatSession) => s.id === initialSessionId);
            setSelectedSessionId(prev => prev || (matched ? matched.id : data.sessions[0].id));
          }
        }
      })
      .catch(err => console.error('โหลดข้อมูลแชทล้มเหลว:', err))
      .finally(() => setLoading(false));
  }, [initialSessionId]);

  // เรียกโหลดข้อมูลแชทเมื่อล็อกอินเรียบร้อยแล้ว
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetchChatData();
  }, [sessionStatus, fetchChatData]);

  // ----------------------------------------------------------------------------
  // 2.3 เชื่อมต่อระบบ Real-Time WebSocket ผ่าน Pusher (useChatRealtime)
  // ----------------------------------------------------------------------------
  // ซิงก์ข้อความใหม่ สัญญาณการพิมพ์ (Typing) และการเปิดอ่านแบบ Real-time
  // บอกกระดิ่งแจ้งเตือนว่าตอนนี้เปิดห้องไหนอยู่ → จะได้ไม่เด้ง toast ของห้องนี้ (ออกจากหน้าแชท = ล้างค่า)
  useEffect(() => {
    setActiveChatSession(selectedSessionId);
    return () => setActiveChatSession(null);
  }, [selectedSessionId]);

  // ข้อความใหม่เข้าห้องที่เปิดอยู่ → ทำเครื่องหมายอ่านแล้วก่อน แล้วค่อยโหลดรายการใหม่
  // เดิมเรียกแค่ fetchChatData (อ่านแล้วถูกตั้งเฉพาะตอนกดเปิดห้อง) → ห้องที่เปิดค้างอยู่ขึ้น "ยังไม่อ่าน 1" ค้าง (BUG-19)
  const handleNewMessage = useCallback(() => {
    if (!selectedSessionId) { fetchChatData(); return; }
    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: selectedSessionId })
    })
      .catch(err => console.error('Mark read failed:', err))
      .finally(() => fetchChatData());
  }, [selectedSessionId, fetchChatData]);

  const { isTyping, connectionError, sendTyping } = useChatRealtime({
    enabled: sessionStatus === 'authenticated',
    sessionId: selectedSessionId,
    currentUserId,
    onNewMessage: handleNewMessage,
    onMessagesRead: fetchChatData
  });

  // ----------------------------------------------------------------------------
  // 2.4 ฟังก์ชันทำเครื่องหมายว่าอ่านข้อความแล้ว (PATCH /api/chat/messages)
  // ----------------------------------------------------------------------------
  const handleOpenSession = useCallback((sessionId: string) => {
    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
      .then(() => setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unreadCount: 0 } : s)))
      .catch(err => console.error('ทำเครื่องหมายอ่านแล้วล้มเหลว:', err));
  }, []);

  // ----------------------------------------------------------------------------
  // 2.5 ฟังก์ชันโหลดข้อความเก่าประวัติย้อนหลัง (Cursor Pagination)
  // ----------------------------------------------------------------------------
  const handleLoadOlderMessages = useCallback(async (sessionId: string, oldestMessageId: string | number) => {
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}&before=${oldestMessageId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(prev => prev.map(s => s.id === sessionId
          ? { ...s, messages: [...data.messages, ...s.messages], hasMoreMessages: data.hasMore }
          : s));
      }
    } catch (err) {
      console.error('โหลดข้อความเก่าล้มเหลว:', err);
    }
  }, []);

  // ----------------------------------------------------------------------------
  // 2.6 ฟังก์ชันลบข้อความเดียว (DELETE /api/chat/messages)
  // ----------------------------------------------------------------------------
  const handleDeleteMessage = useCallback(async (messageId: string | number) => {
    const res = await fetch(`/api/chat/messages?messageId=${messageId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      setSessions(prev => prev.map(s => ({ ...s, messages: s.messages.filter(m => m.id !== messageId) })));
      toast.success('ลบข้อความเรียบร้อยแล้ว');
    } else {
      toast.error(data.error || 'ไม่สามารถลบข้อความได้');
    }
  }, []);

  // ----------------------------------------------------------------------------
  // 2.7 ฟังก์ชันลบห้องแชททั้งห้อง (DELETE /api/chat/sessions)
  // ----------------------------------------------------------------------------
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setSelectedSessionId(prev => (prev === sessionId ? null : prev));
      toast.success('ลบห้องแชทเรียบร้อยแล้ว');
    } else {
      toast.error(data.error || 'ไม่สามารถลบห้องแชทได้');
    }
  }, []);

  // ----------------------------------------------------------------------------
  // 2.8 ฟังก์ชันส่งข้อความแชทใหม่ (POST /api/chat/messages)
  // ----------------------------------------------------------------------------
  // บันทึกข้อความลง DB, ยิง Pusher real-time, และสร้าง Notification แจ้งเตือนกระดิ่งหาฝั่งนายหน้า
  const handleSendMessage = async (payload: OutgoingChatPayload) => {
    if (!selectedSessionId) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          content: payload.text,
          fileUrl: payload.fileUrl,
          latitude: payload.latitude,
          longitude: payload.longitude
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // โหลดข้อมูลแชทเพื่อซิงก์ข้อความใหม่ทันที
        fetchChatData();
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งข้อความ');
    }
  };

  // ----------------------------------------------------------------------------
  // 2.9 แสดงหน้าจอ Loading ขณะกำลังดึงข้อมูลตั้งต้น
  // ----------------------------------------------------------------------------
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 2.9.1 แสดง Empty State แจ้งเตือนลูกค้าเมื่อยังไม่เคยเริ่มคุยกับนายหน้าคนใดเลย
  // ----------------------------------------------------------------------------
  if (sessions.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm text-center space-y-5">
          {/* ไอคอนกล่องข้อความ */}
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <MessageSquare className="w-8 h-8 shrink-0" />
          </div>

          {/* หัวข้อและคำแนะนำ */}
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900">ยังไม่มีบทสนทนาในกล่องข้อความ</h2>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              เริ่มคุยกับนายหน้าผู้ดูแลได้โดยตรงจากหน้าอสังหาริมทรัพย์ที่คุณสนใจ หรือเลือกดูนายหน้าเพื่อปรึกษาได้ทันที
            </p>
          </div>

          {/* ปุ่มทางลัดนำทาง */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              href="/search"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span>ค้นหาอสังหาริมทรัพย์</span>
            </Link>
            <Link
              href="/agents"
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Users className="w-4 h-4 text-slate-500 shrink-0" />
              <span>นายหน้าของเรา</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 2.10 แปลงรูปแบบข้อมูลให้อยู่ในโครงสร้าง SharedChatSession เพื่อส่งให้ UI Component
  // ----------------------------------------------------------------------------
  const sharedSessions: SharedChatSession[] = sessions.map(s => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    lastMessage: s.lastMessage,
    time: s.time,
    unreadCount: s.unreadCount,
    hasMoreMessages: s.hasMoreMessages,
    propertyId: s.propertyId,
    propertyTitle: s.propertyTitle,
    propertyPrice: s.propertyPrice,
    messages: s.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      time: m.time,
      fileUrl: m.fileUrl,
      latitude: m.latitude,
      longitude: m.longitude,
      isRead: m.isRead
    }))
  }));

  // Render UI หลักผ่าน SharedChatView (กำหนด role="customer" สำหรับฝั่งลูกค้า)
  return (
    <SharedChatView
      role="customer"
      sessions={sharedSessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={setSelectedSessionId}
      onSendMessage={handleSendMessage}
      onDeleteMessage={handleDeleteMessage}
      onDeleteSession={handleDeleteSession}
      onOpenSession={handleOpenSession}
      onTyping={sendTyping}
      onLoadOlderMessages={handleLoadOlderMessages}
      isTyping={isTyping}
      connectionError={connectionError}
    />
  );
}

// ==============================================================================
// 3. MAIN PAGE EXPORT (หน้าเพจแชทฝั่งลูกค้า /chat ซองด้วย Suspense ตามมาตรฐาน Next.js)
// ==============================================================================
export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-bold text-xs text-slate-500 gap-2">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span>กำลังโหลดระบบแชท...</span>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

