'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import SharedChatView, { SharedChatSession, OutgoingChatPayload } from '@/components/common/SharedChatView';

// ==============================================================================
// 1. โครงสร้างประเภทข้อมูล (TypeScript Interfaces)
// ==============================================================================

/** โครงสร้างข้อมูลข้อความแชทแต่ละรายการในห้องสนทนา */
interface ChatMessage {
  id: string | number;
  sender: 'user' | 'other';
  text: string;
  time: string;
  fileUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isRead?: boolean;
}

/** โครงสร้างข้อมูลห้องแชท (Chat Session) */
interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  hasMoreMessages?: boolean;
  propertyTitle: string;
  propertyPrice: string;
  messages: ChatMessage[];
}

/** โครงสร้างข้อมูลเทมเพลตข้อความตอบกลับด่วนของนายหน้า */
interface QuickReplyTemplate {
  id: string;
  title: string;
  content: string;
}

// กำหนด URL ของ Socket.io Real-time Server (ดึงจาก env หรือใช้ localhost:3001)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// ==============================================================================
// 2. คอมโพเนนต์หลักฝั่งนายหน้า (Agent Chat Content)
// ==============================================================================
// หน้าแชทฝั่งนายหน้า ใช้ API ชุดเดียวกับฝั่งลูกค้า (/api/chat/*)
// เนื่องจาก API แยกห้องแชทตาม customer_id / agent_id ของผู้ใช้ที่ล็อกอินอยู่อัตโนมัติ
function AgentChatContent() {
  // สถานะการเข้าสู่ระบบของนายหน้า (NextAuth Session)
  const { status } = useSession();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  // State สำหรับเก็บข้อมูลห้องแชท และห้องที่กำลังเลือกเปิดดูอยู่
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);
  const [syncedSessionId, setSyncedSessionId] = useState<string | null>(initialSessionId);

  // State สำหรับจำว่ามีใครกำลังพิมพ์อยู่หรือไม่ (แยกตาม roomId)
  const [isTypingState, setIsTypingState] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  // State สำหรับเก็บรายการเทมเพลตตอบกลับด่วนของนายหน้า
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);

  // Ref สำหรับเก็บ Socket Instance และห้องที่เข้าร่วมอยู่ปัจจุบัน
  const socketRef = useRef<Socket | null>(null);
  const joinedRoomRef = useRef<string | null>(null);

  // ----------------------------------------------------------------------------
  // 3. ฟังก์ชันดึงข้อมูลจาก API (Data Fetching Functions)
  // ----------------------------------------------------------------------------

  // ดึงรายการห้องแชททั้งหมดของนายหน้าคนนี้จากฐานข้อมูลจริง
  const fetchChatData = useCallback(() => {
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            // เลือกห้องตาม URL query parameter หรือเลือกห้องแรกตามลำดับ
            const matched = data.sessions.find((s: ChatSession) => s.id === initialSessionId);
            setSelectedSessionId(prev => prev || (matched ? matched.id : data.sessions[0].id));
          }
        }
      })
      .catch(err => console.error('Error fetching chat sessions:', err))
      .finally(() => setLoading(false));
  }, [initialSessionId]);

  // ดึงเทมเพลตข้อความตอบกลับด่วนของนายหน้าคนนี้จากฐานข้อมูลจริง
  const fetchTemplates = useCallback(() => {
    fetch('/api/agent/quick-replies')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.templates)) {
          setTemplates(data.templates);
        }
      })
      .catch(err => console.error('Error fetching quick-reply templates:', err));
  }, []);

  // ----------------------------------------------------------------------------
  // 4. Side Effects & Socket Real-time Listener
  // ----------------------------------------------------------------------------

  // เข้าหน้ามาแล้วต้องล็อกอินสำเร็จก่อน ถึงจะเริ่มโหลดข้อมูลห้องแชทและเทมเพลต
  useEffect(() => {
    if (status === 'authenticated') {
      fetchChatData();
      fetchTemplates();
    }
  }, [status, fetchChatData, fetchTemplates]);

  // ซิงก์ sessionId หาก URL มีการเปลี่ยนพารามิเตอร์ขณะเปิดหน้านี้อยู่ (เช่น กดดูแชทจากการแจ้งเตือน)
  if (initialSessionId && initialSessionId !== syncedSessionId) {
    setSyncedSessionId(initialSessionId);
    setSelectedSessionId(initialSessionId);
  }

  // เชื่อมต่อ Socket.io ครั้งเดียวตอนล็อกอินสำเร็จ พร้อมส่ง JWT token ยืนยันตัวตนกับ Socket Server
  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    (async () => {
      // 1) ขอ JWT Token สำหรับเชื่อมต่อ Socket จาก API
      const res = await fetch('/api/chat/socket-token');
      if (!res.ok) return;
      const { token } = await res.json();
      if (cancelled || !token) return;

      // 2) สร้าง Socket Connection แนบ JWT token
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
        auth: { token }
      });
      socketRef.current = socket;

      // เมื่อเชื่อมต่อสำเร็จ (หรือหลุดแล้วต่อกลับมาใหม่) ให้เข้าร่วมห้องเดิมทันที
      socket.on('connect', () => {
        if (joinedRoomRef.current) {
          socket.emit('join-room', joinedRoomRef.current);
        }
      });

      // เมื่อมีข้อความใหม่เข้ามา -> โหลดข้อมูลแชทอัปเดตหน้าจอทันที
      socket.on('receive-message', () => {
        fetchChatData();
      });

      // เมื่ออีกฝ่ายกำลังพิมพ์ข้อความ -> จำสถานะเฉพาะห้องที่กำลังเปิดอยู่
      socket.on('client-typing', (data: { isTyping: boolean }) => {
        if (joinedRoomRef.current) {
          setIsTypingState(prev => ({ ...prev, [joinedRoomRef.current as string]: data.isTyping }));
        }
      });

      socket.on('room-error', (data: { error: string }) => {
        console.error('Chat room error:', data.error);
      });
    })();

    // เมื่อออกจากหน้า ให้ตัดการเชื่อมต่อ Socket
    return () => {
      cancelled = true;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [status, fetchChatData]);

  // เมื่อเลือกสลับห้องแชท: สั่งออกจากห้องเดิม แล้วเข้าร่วมห้องใหม่ผ่าน Connection เดิม
  useEffect(() => {
    const socket = socketRef.current;
    if (!selectedSessionId) return;

    if (socket?.connected) {
      if (joinedRoomRef.current && joinedRoomRef.current !== selectedSessionId) {
        socket.emit('leave-room', joinedRoomRef.current);
      }
      socket.emit('join-room', selectedSessionId);
    }
    joinedRoomRef.current = selectedSessionId;
  }, [selectedSessionId]);

  // ----------------------------------------------------------------------------
  // 5. ฟังก์ชันจัดการการกระทำในแชท (Chat Actions & Event Handlers)
  // ----------------------------------------------------------------------------

  // เปิดห้องแชท -> ส่งคำขอไปอัปเดตว่าอ่านข้อความทั้งหมดในห้องนั้นแล้ว (is_read = true)
  const handleOpenSession = useCallback((sessionId: string) => {
    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
      .then(() => setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unreadCount: 0 } : s)))
      .catch(err => console.error('Mark read failed:', err));
  }, []);

  // แจ้งลูกค้าระยะไกลว่านายหน้ากำลังพิมพ์อยู่หรือไม่ (ส่งผ่าน Socket เท่านั้น ไม่บันทึกลง DB)
  const handleTyping = useCallback((typing: boolean) => {
    if (socketRef.current?.connected && selectedSessionId) {
      socketRef.current.emit('typing', { roomId: selectedSessionId, isTyping: typing });
    }
  }, [selectedSessionId]);

  // กดปุ่ม "โหลดข้อความเก่ากว่านี้" -> ดึงประวัติข้อความช่วงก่อนหน้ามาต่อด้านบน
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
      console.error('Load older messages failed:', err);
    }
  }, []);

  // ----------------------------------------------------------------------------
  // 6. ฟังก์ชันส่งข้อความและจัดการเทมเพลต (Send Message & Quick Reply)
  // ----------------------------------------------------------------------------

  // ส่งข้อความใหม่ (รองรับทั้งข้อความตัวหนังสือ ไฟล์แนบ และพิกัดแผนที่)
  const handleSendMessage = async (payload: OutgoingChatPayload) => {
    if (!selectedSessionId) return;

    try {
      // 1) บันทึกข้อความลงฐานข้อมูล PostgreSQL ผ่าน API
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
        // 2) บันทึกสำเร็จ -> กระจายข้อความผ่าน Socket ให้อีกฝ่ายเห็นทันที
        if (socketRef.current?.connected) {
          socketRef.current.emit('send-message', {
            roomId: selectedSessionId,
            message: data.message
          });
        }
        // 3) โหลดรายการห้องแชทใหม่ เพื่ออัปเดตข้อความล่าสุดฝั่งเราด้วย
        fetchChatData();
      } else {
        console.error('Error sending message:', data.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // ถามข้อมูลแล้วบันทึกเป็นเทมเพลตข้อความตอบกลับด่วนอันใหม่ลงฐานข้อมูล
  const handleAddTemplate = async () => {
    const title = prompt('กรุณาระบุชื่อหัวข้อเทมเพลต (เช่น "แจ้งเลื่อนนัดหมาย")');
    if (!title?.trim()) return;
    const content = prompt('กรุณาระบุข้อความที่ต้องการบันทึกเป็นเทมเพลต');
    if (!content?.trim()) return;

    try {
      const res = await fetch('/api/agent/quick-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchTemplates();
      } else {
        alert(data.error || 'เพิ่มเทมเพลตไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดขณะเพิ่มเทมเพลต');
    }
  };

  // ให้เลือกลบเทมเพลตข้อความตอบกลับด่วนออกจากฐานข้อมูล
  const handleDeleteTemplate = async () => {
    if (templates.length === 0) return;
    const list = templates.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    const answer = prompt(`กรุณาระบุหมายเลขเทมเพลตที่ต้องการลบ:\n${list}`);
    const idx = Number(answer) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= templates.length) return;

    try {
      const res = await fetch(`/api/agent/quick-replies?id=${templates[idx].id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchTemplates();
      } else {
        alert(data.error || 'ลบเทมเพลตไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดขณะลบเทมเพลต');
    }
  };

  // ----------------------------------------------------------------------------
  // 7. การแปลงข้อมูลและเตรียม UI Component (Data Formatting for UI)
  // ----------------------------------------------------------------------------

  // แปลงข้อมูลห้องแชทให้อยู่ในฟอร์แมตที่คอมโพเนนต์กลาง SharedChatView ใช้งานได้
  const sharedSessions: SharedChatSession[] = sessions.map(s => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    isActive: s.isActive,
    lastMessage: s.lastMessage,
    time: s.time,
    unreadCount: s.unreadCount,
    hasMoreMessages: s.hasMoreMessages,
    propertyTitle: s.propertyTitle,
    propertyPrice: s.propertyPrice,
    messages: s.messages.map(m => ({
      id: m.id,
      // API ส่งคืน 'user' เมื่อเป็นข้อความของผู้ส่ง ในหน้านี้เราคือนายหน้า จึงแปลงเป็น 'agent'
      sender: m.sender === 'user' ? 'agent' : 'other',
      text: m.text,
      time: m.time,
      fileUrl: m.fileUrl,
      latitude: m.latitude,
      longitude: m.longitude,
      isRead: m.isRead
    }))
  }));

  // สร้างรายการปุ่มลัด (Quick Actions) จากเทมเพลตใน DB พร้อมปุ่มเพิ่ม/ลบ
  const quickActions = [
    ...templates.map(t => ({
      label: t.title,
      action: () => handleSendMessage({ text: t.content })
    })),
    { label: 'เพิ่มเทมเพลตข้อความ', action: handleAddTemplate },
    ...(templates.length > 0 ? [{ label: 'ลบเทมเพลตข้อความ', action: handleDeleteTemplate }] : [])
  ];

  // แสดง Spinner โหลดหน้าจอขณะกำลังดึงข้อมูลครั้งแรก
  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 8. แสดงผล UI หน้าระบบสนทนา (Render View)
  // ----------------------------------------------------------------------------
  return (
    <SharedChatView
      role="agent"
      sessions={sharedSessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={(id) => {
        setSelectedSessionId(id);
        setIsTypingState({});
      }}
      onSendMessage={handleSendMessage}
      onOpenSession={handleOpenSession}
      onTyping={handleTyping}
      onLoadOlderMessages={handleLoadOlderMessages}
      isTyping={selectedSessionId ? isTypingState[selectedSessionId] : false}
      quickActions={quickActions}
    />
  );
}

// Export หน้าหลักของ Agent Chat พร้อม Suspense รองรับการใช้ useSearchParams
export default function AgentChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-xs text-slate-500">กำลังโหลดระบบสนทนา...</div>}>
      <AgentChatContent />
    </Suspense>
  );
}
