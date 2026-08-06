'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import SharedChatView, { SharedChatSession } from '@/components/common/SharedChatView';

interface ChatMessage {
  id: string | number;
  sender: 'user' | 'other';
  text: string;
  time: string;
}

interface ChatSession {
  id: string;
  name: string;
  avatar: string;
  isActive: boolean;
  lastMessage: string;
  time: string;
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
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);

  const socketRef = useRef<Socket | null>(null);

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

  // 2. เชื่อมต่อ Socket.io รับ-ส่งข้อความเรียลไทม์
  useEffect(() => {
    if (!selectedSessionId) return;

    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', selectedSessionId);
    });

    socket.on('receive-message', () => {
      fetchChatData();
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSessionId, fetchChatData]);

  // 3. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !selectedSessionId) return;

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: selectedSessionId, content: textToSend })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (socketRef.current?.connected) {
          socketRef.current.emit('send-message', {
            roomId: selectedSessionId,
            message: data.message
          });
        }
        fetchChatData();
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

  // 4. แปลงข้อมูล sessions ของลูกค้าให้อยู่ในรูปแบบ SharedChatSession
  const sharedSessions: SharedChatSession[] = sessions.map(s => ({
    id: s.id,
    name: s.name,
    avatar: s.avatar,
    isActive: s.isActive,
    lastMessage: s.lastMessage,
    time: s.time,
    propertyTitle: s.propertyTitle,
    propertyPrice: s.propertyPrice,
    messages: s.messages.map(m => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      time: m.time
    }))
  }));

  return (
    <SharedChatView
      role="customer"
      sessions={sharedSessions}
      selectedSessionId={selectedSessionId}
      onSelectSession={(id) => setSelectedSessionId(id)}
      onSendMessage={handleSendMessage}
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
