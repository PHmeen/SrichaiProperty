'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import SharedChatView, { SharedChatSession, OutgoingChatPayload } from '@/components/common/SharedChatView';

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
  propertyImage: string;
  messages: ChatMessage[];
}

/**
 * ==============================================================================
 * CUSTOMER CHAT CONTENT (หน้าต่างแชทฝั่งผู้ใช้งาน / ลูกค้า)
 * ==============================================================================
 * เรียกใช้งาน SharedChatView ร่วมกันกับฝั่งเอเย่นต์
 */
function ChatContent() {
  const { data: sessionData, status: sessionStatus } = useSession();
  const currentUserId = (sessionData?.user as { id?: string } | undefined)?.id;
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);

  // 1. โหลดข้อมูลห้องแชทของลูกค้า
  const fetchChatData = useCallback(() => {
    fetch('/api/chat/sessions')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.sessions)) {
          setSessions(data.sessions);
          if (data.sessions.length > 0) {
            const matched = data.sessions.find((s: ChatSession) => s.id === initialSessionId);
            setSelectedSessionId(prev => prev || (matched ? matched.id : data.sessions[0].id));
          }
        }
      })
      .catch(err => console.error('โหลดข้อมูลแชทล้มเหลว:', err))
      .finally(() => setLoading(false));
  }, [initialSessionId]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    fetchChatData();
  }, [sessionStatus, fetchChatData]);

  // 2. เชื่อมต่อ Pusher และ subscribe channel ของห้องแชทที่กำลังเปิดอยู่ (ยืนยันสิทธิ์ผ่าน /api/pusher/auth
  // ด้วย NextAuth session cookie โดยอัตโนมัติ ไม่ต้องขอ JWT token เองแบบ Socket.io เดิม)
  const { isTyping, connectionError, sendTyping } = useChatRealtime({
    enabled: sessionStatus === 'authenticated',
    sessionId: selectedSessionId,
    currentUserId,
    onNewMessage: fetchChatData,
    onMessagesRead: fetchChatData
  });

  // 4. ทำเครื่องหมายว่าอ่านข้อความในห้องที่เปิดอยู่แล้ว
  const handleOpenSession = useCallback((sessionId: string) => {
    fetch('/api/chat/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
      .then(() => setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, unreadCount: 0 } : s)))
      .catch(err => console.error('Mark read failed:', err));
  }, []);

  // 5b. โหลดข้อความเก่ากว่านี้ในห้องที่เลือก (cursor pagination ตาม message id ที่เก่าที่สุดที่มีอยู่)
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

  // 6. ฟังก์ชันส่งข้อความ (ข้อความตัวหนังสือ / ไฟล์แนบ / ตำแหน่ง)
  const handleSendMessage = async (payload: OutgoingChatPayload) => {
    if (!selectedSessionId) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, content: payload.text, fileUrl: payload.fileUrl, latitude: payload.latitude, longitude: payload.longitude })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // API ยิง event ผ่าน Pusher ให้อีกฝ่ายเห็นทันทีอยู่แล้ว (ดู /api/chat/messages)
        fetchChatData();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการส่งข้อความ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการส่งข้อความ');
    }
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 6. แปลงข้อมูล sessions ของลูกค้าให้อยู่ในรูปแบบ SharedChatSession
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
      sender: m.sender,
      text: m.text,
      time: m.time,
      fileUrl: m.fileUrl,
      latitude: m.latitude,
      longitude: m.longitude,
      isRead: m.isRead
    }))
  }));

  return (
    <SharedChatView
      role="customer"
      sessions={sharedSessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={setSelectedSessionId}
      onSendMessage={handleSendMessage}
      onOpenSession={handleOpenSession}
      onTyping={sendTyping}
      onLoadOlderMessages={handleLoadOlderMessages}
      isTyping={isTyping}
      connectionError={connectionError}
    />
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-xs text-slate-500">🔄 กำลังโหลดระบบแชท...</div>}>
      <ChatContent />
    </Suspense>
  );
}
