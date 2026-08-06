'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import SharedChatView, { SharedChatSession } from '@/components/common/SharedChatView';
import { AgentContact as Contact, AgentChatMessage as Message } from '@/types';

export type { Contact, Message };

/**
 * ==============================================================================
 * AGENT CHAT PAGE (หน้าแชทสำหรับเอเย่นต์ / นายหน้า)
 * ==============================================================================
 * เรียกใช้งาน SharedChatView ร่วมกับฝั่งลูกค้า เพื่อความสวยงาม เป็นเอกภาพ และไม่โค้ดซ้ำ
 */
export default function AgentChatPage() {
  const { status } = useSession();
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [isTypingState, setIsTypingState] = useState<{ [key: string]: boolean }>({});
  const [contacts, setContacts] = useState<Contact[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // 1. โหลดข้อมูลห้องแชทของนายหน้าจาก Database
  const fetchChatData = () => {
    fetch('/api/agent/portal?type=chat')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setContacts(data);
          if (data.length > 0) {
            setSelectedContactId(prev => prev || data[0].id);
          }
        }
      })
      .catch(err => console.error('Error fetching chat sessions:', err));
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChatData();
    }
  }, [status]);

  // 2. เชื่อมต่อ Socket.io รับ-ส่งข้อความแบบเรียลไทม์
  useEffect(() => {
    if (!selectedContactId) return;

    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', selectedContactId);
    });

    socket.on('receive-message', () => {
      fetchChatData();
    });

    socket.on('client-typing', (data: { isTyping: boolean }) => {
      setIsTypingState(prev => ({
        ...prev,
        [selectedContactId]: data.isTyping
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedContactId]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeContact = contacts.find(c => c.id === selectedContactId) || null;

  // 3. ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !activeContact) return;

    try {
      const response = await fetch('/api/agent/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeContact.id,
          content: textToSend
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const savedMessage = await response.json();

      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', {
          roomId: activeContact.id,
          message: savedMessage
        });
      }

      fetchChatData();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  // 4. แปลงข้อมูล contacts ของนายหน้าให้อยู่ในโครงสร้าง SharedChatSession
  const sharedSessions: SharedChatSession[] = contacts.map(c => ({
    id: c.id,
    name: c.name,
    avatarLetter: c.avatarLetter || c.name.charAt(0),
    isActive: true,
    lastMessage: c.lastMessageSnippet,
    time: c.lastMessageTime,
    propertyTitle: c.propertyName,
    propertyPrice: c.propertyPrice,
    propertyCode: c.propertyCode,
    messages: c.messages.map(m => ({
      id: m.id,
      sender: m.sender === 'client' ? 'other' : 'agent',
      text: m.content,
      time: m.time
    }))
  }));

  // ปุ่มลัดสำหรับเอเย่นต์ (Quick Actions)
  const quickActions = [
    {
      label: '📍 ส่งพิกัดจุดนัดพบ',
      action: () => handleSendMessage('📍 [พิกัดจุดนัดพบ] แผนที่เดินทางหน้าโครงการ: https://maps.google.com/?q=7.0089,100.4975')
    },
    {
      label: '📄 ส่งไฟล์เอกสารบ้าน',
      action: () => handleSendMessage('📄 [แนบเอกสาร] โบรชัวร์โครงการและแบบแปลนบ้าน.pdf')
    },
    {
      label: '📋 ขอเบอร์ติดต่อกลับ',
      action: () => handleSendMessage('📋 [ขอเบอร์ติดต่อกลับ] สะดวกรบกวนขอเบอร์โทรศัพท์ติดต่อกลับเพื่อคุยรายละเอียดเพิ่มเติมด้วยครับ')
    }
  ];

  return (
    <SharedChatView
      role="agent"
      sessions={sharedSessions}
      selectedSessionId={selectedContactId}
      onSelectSession={(id) => setSelectedContactId(id)}
      onSendMessage={handleSendMessage}
      isTyping={selectedContactId ? isTypingState[selectedContactId] : false}
      quickActions={quickActions}
    />
  );
}
