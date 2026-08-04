'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

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

function ChatContent() {
  const { status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const initialSessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialSessionId);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileShowMessages, setMobileShowMessages] = useState(Boolean(initialSessionId));

  const socketRef = useRef<Socket | null>(null);

  // โหลดข้อมูลห้องแชท
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

  // เชื่อมต่อ Socket.io รับ-ส่งข้อความเรียลไทม์
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

  // ฟังก์ชันส่งข้อความ
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedSessionId || sending) return;

    const textToSend = messageInput;
    setMessageInput('');
    setSending(true);

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
    } finally {
      setSending(false);
    }
  };

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || null;

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col h-screen pt-14">
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex overflow-hidden gap-4 h-[calc(100vh-4rem)]">
        
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full flex-shrink-0 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-extrabold text-slate-900">กล่องข้อความ</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">ยังไม่มีบทสนทนา</div>
            ) : (
              sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => {
                    setSelectedSessionId(session.id);
                    setMobileShowMessages(true);
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition ${session.id === selectedSessionId ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="relative shrink-0">
                    <Image src={session.avatar} width={40} height={40} className="w-10 h-10 rounded-full object-cover shadow-sm border" alt={session.name} unoptimized />
                    {session.isActive && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
                  </div>
                  <div className="flex-1 overflow-hidden text-xs">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="font-bold text-slate-900 truncate">{session.name}</h4>
                      <span className="text-[9px] text-slate-400 font-bold">{session.time}</span>
                    </div>
                    <p className="text-slate-500 truncate">{session.lastMessage}</p>
                    {session.propertyTitle && (
                      <span className="inline-block text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold mt-1 truncate max-w-full">
                        🏠 {session.propertyTitle}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex-col h-full overflow-hidden relative ${mobileShowMessages ? 'flex' : 'hidden md:flex'}`}>
          
          {activeSession ? (
            <>
              <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/80 backdrop-blur-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setMobileShowMessages(false)}
                    className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer font-bold flex items-center mr-1"
                  >
                    ← ย้อนกลับ
                  </button>
                  <div className="relative shrink-0">
                    <Image src={activeSession.avatar} width={40} height={40} className="w-10 h-10 rounded-full object-cover shadow-sm border" alt={activeSession.name} unoptimized />
                    {activeSession.isActive && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs leading-tight">
                      {activeSession.name}
                    </h3>
                    <p className="text-[10px] text-blue-600 font-bold">
                      🏠 สนใจ: {activeSession.propertyTitle} ({activeSession.propertyPrice})
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {activeSession.messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    <div className={`p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-bold">{msg.time}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center flex-shrink-0">
                <input 
                  type="text" 
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="พิมพ์ข้อความของคุณที่นี่..." 
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800 font-medium" 
                />
                <button 
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  {sending ? 'กำลังส่ง...' : 'ส่ง'}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-bold text-xs">
              กรุณาเลือกบทสนทนาจากรายการทางซ้าย
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-xs text-slate-500">🔄 กำลังโหลดระบบแชท...</div>}>
      <ChatContent />
    </Suspense>
  );
}

