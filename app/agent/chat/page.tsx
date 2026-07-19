'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  sender: 'client' | 'agent';
  content: string;
  time: string;
  isRead?: boolean;
}

interface Contact {
  id: string;
  name: string;
  avatarLetter: string;
  avatarUrl?: string;
  status: 'online' | 'offline';
  lastMessageSnippet: string;
  lastMessageTime: string;
  propertyCode: string;
  propertyName: string;
  propertyPrice: string;
  propertyImage: string;
  unreadCount: number;
  hasAppointment: boolean;
  appointmentDetails?: {
    date: string;
    location: string;
  };
  messages: Message[];
}

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased text-xs md:text-sm flex flex-col">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm px-4 md:px-8 py-3 flex items-center justify-between">
        <Link href="/agent/home" className="flex items-center gap-2 font-black text-slate-900 text-sm">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">S</div>
          SrichaiProperty Agent Portal
        </Link>
        <div className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/50">
          <Link href="/agent/home" className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900">หน้าแรก</Link>
          <Link href="/agent/dashboard" className="px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900">แผงควบคุม</Link>
          <Link href="/agent/chat" className="px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-900 shadow-sm flex items-center gap-1">
            แชทลูกค้า <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">2</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-slate-900">{userName}</span>
        </div>
      </nav>

      {/* Main Workspace Layout */}
      <main className="max-w-6xl w-full mx-auto p-4 md:p-8 flex-1 flex flex-col md:flex-row gap-6 min-h-[calc(100vh-140px)]">
        
        {/* Left Column: Contact List */}
        <section className="w-full md:w-80 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col space-y-4 shrink-0">
          <h3 className="font-extrabold text-slate-900 text-sm md:text-base px-1">รายการติดต่อ</h3>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ หรือ รหัสบ้าน..." 
            className="w-full bg-[#f8fafc] border rounded-2xl px-4 py-2 text-xs font-semibold text-slate-800 outline-none"
          />

          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredContacts.length === 0 ? (
              <p className="text-slate-400 text-center font-bold py-6">ไม่มีรายชื่อผู้ติดต่อ</p>
            ) : (
              filteredContacts.map(c => {
                const isActive = c.id === selectedContactId;
                return (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className={`flex gap-3 p-3 rounded-2xl cursor-pointer border text-left ${isActive ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-transparent hover:bg-slate-50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">{c.avatarLetter}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-900 text-xs truncate">{c.name}</span>
                        <span className="text-[9px] text-slate-400 font-bold">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-[10px] truncate mt-0.5 text-slate-500">{c.lastMessageSnippet}</p>
                      <span className="bg-slate-100 text-slate-500 text-[8px] font-extrabold px-1.5 py-0.2 rounded mt-1.5 inline-block">{c.propertyCode}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Active Chat Portal */}
        <section className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
                <div className="text-left">
                  <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">{activeContact.name}</h4>
                  <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> กำลังออนไลน์
                  </span>
                </div>
              </div>

              {/* Property Card */}
              <div className="px-4 py-3 bg-[#f8fafc]/80 border-b flex items-center justify-between gap-4 shrink-0 text-left">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block">ทรัพย์ที่สนใจ ({activeContact.propertyCode})</span>
                  <h5 className="font-extrabold text-slate-800 text-[11px] truncate">{activeContact.propertyName}</h5>
                </div>
                <div className="text-right shrink-0">
                  <strong className="text-blue-600 font-extrabold text-xs block">{activeContact.propertyPrice}</strong>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[250px] flex flex-col justify-end">
                {activeContact.messages.map(m => {
                  const isClient = m.sender === 'client';
                  return (
                    <div key={m.id} className={`flex gap-3 ${isClient ? 'justify-start text-left' : 'justify-end text-right'}`}>
                      <div className="max-w-[70%]">
                        <div className={`p-3 rounded-2xl text-[11px] font-semibold leading-relaxed shadow-sm ${isClient ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                          {m.content}
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 px-1">{m.time}</div>
                      </div>
                    </div>
                  );
                })}

                {isTypingState[selectedContactId] && (
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold px-2 shrink-0">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                    </span>
                    {activeContact.name} กำลังพิมพ์...
                  </div>
                )}
              </div>

              {/* Actions & Inputs */}
              <div className="p-4 border-t bg-white space-y-3 shrink-0">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => sendQuickAction('location')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📍 ส่งพิกัดจุดนัดพบ</button>
                  <button onClick={() => sendQuickAction('document')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📄 ส่งไฟล์เอกสารบ้าน</button>
                  <button onClick={() => sendQuickAction('callback')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📋 ขอเบอร์ติดต่อกลับ</button>
                </div>

                <div className="relative bg-[#f8fafc] border rounded-2xl p-1.5 flex items-center shadow-inner">
                  <input 
                    type="text" 
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                    placeholder={`ตอบกลับ${activeContact.name.split(' ')[0]}... ข้อมูลบันทึกตามมาตรฐาน PDPA`}
                    className="w-full bg-transparent border-none outline-none pl-3 pr-12 text-slate-800 placeholder-slate-400 font-semibold text-xs py-2"
                  />
                  <button onClick={() => handleSendMessage()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs transition">ส่ง 📤</button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">กรุณาเลือกผู้ติดต่อเพื่อเริ่มแชท</div>
          )}
        </section>

      </main>

    </div>
  );
}
