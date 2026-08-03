'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';
import ChatList from '@/components/agent/ChatList';
import ChatRoom from '@/components/agent/ChatRoom';
import { AgentContact as Contact, AgentChatMessage as Message } from '@/types';

export type { Contact, Message };

export default function AgentChatPage() {
  const { data: session, status } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [isTypingState, setIsTypingState] = useState<{ [key: string]: boolean }>({});
  const [contacts, setContacts] = useState<Contact[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch Chat Data from Database
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/agent/portal?type=chat')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setContacts(data);
            if (data.length > 0) {
              setSelectedContactId(data[0].id);
            }
          }
        })
        .catch(err => console.error('Error fetching chat sessions:', err));
    }
  }, [status]);

  // 2. Connect to Socket.io Server for Real-time
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

    socket.on('receive-message', (message: Message) => {
      setContacts(prev => prev.map(c => {
        if (c.id === selectedContactId) {
          if (c.messages.some(m => m.id === message.id || (m.content === message.content && m.time === message.time))) {
            return c;
          }
          return {
            ...c,
            lastMessageSnippet: message.content,
            lastMessageTime: message.time,
            messages: [...c.messages, message]
          };
        }
        return c;
      }));
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

  const user = session?.user as { name?: string | null; email?: string | null; status?: string | null };
  const userName = user?.name || 'สมชาย ใจดี';

  const activeContact = contacts.find(c => c.id === selectedContactId) || null;

  // 3. Send Message Handler (Saves to DB and sends via Socket.io)
  const handleSendMessage = async (textToSend?: string) => {
    const finalTxt = textToSend || newMessageText;
    if (!finalTxt.trim() || !activeContact) return;

    try {
      // Save Message into PostgreSQL Database via POST route
      const response = await fetch('/api/agent/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeContact.id,
          content: finalTxt
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const savedMessage = await response.json();

      // Emit to Socket.io Server for real-time delivery
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', {
          roomId: activeContact.id,
          message: savedMessage
        });
      } else {
        // Local state update if socket server is offline
        setContacts(prev => prev.map(c => {
          if (c.id === activeContact.id) {
            return {
              ...c,
              lastMessageSnippet: savedMessage.content,
              lastMessageTime: savedMessage.time,
              messages: [...c.messages, savedMessage]
            };
          }
          return c;
        }));
      }

      if (!textToSend) {
        setNewMessageText('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const sendQuickAction = (actionType: 'location' | 'document' | 'callback') => {
    if (actionType === 'location') {
      handleSendMessage('📍 [พิกัดจุดนัดพบ] แผนที่เดินทางหน้าโครงการ: https://maps.google.com/?q=7.0089,100.4975');
    } else if (actionType === 'document') {
      handleSendMessage('📄 [แนบเอกสาร] โบรชัวร์โครงการและแบบแปลนบ้าน.pdf');
    } else if (actionType === 'callback') {
      handleSendMessage(`📋 [ขอเบอร์ติดต่อกลับ] สะดวกรบกวนขอเบอร์โทรศัพท์ติดต่อกลับเพื่อคุยรายละเอียดเพิ่มเติมด้วยครับ`);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.propertyCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

 
return (
  <div className="h-full w-full p-4 md:p-6">

    <div className="h-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">

      <ChatList
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredContacts={filteredContacts}
        selectedContactId={selectedContactId}
        setSelectedContactId={setSelectedContactId}
      />

      <ChatRoom
        activeContact={activeContact}
        selectedContactId={selectedContactId}
        isTypingState={isTypingState}
        newMessageText={newMessageText}
        setNewMessageText={setNewMessageText}
        handleSendMessage={handleSendMessage}
        sendQuickAction={sendQuickAction}
      />

    </div>

  </div>
);



}
