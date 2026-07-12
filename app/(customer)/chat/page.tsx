'use client';

/**
 * page.tsx (Chat System) - หน้าห้องสนทนาติดต่อกับนายหน้าผู้ดูแล
 * เหมาะสำหรับมือใหม่: อธิบายการเก็บประวัติข้อความแบบสับเปลี่ยนห้องแชท (Active Sessions)
 * พร้อมระบบรับส่งข้อความแบบ Dynamic
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function ChatPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // 1. เก็บ ID ห้องสนทนาที่ผู้ใช้กำลังคลิกเลือกดูขณะนั้น
  const [selectedSessionId, setSelectedSessionId] = useState(1);
  // 2. ข้อความที่ผู้ใช้กำลังพิมพ์
  const [messageInput, setMessageInput] = useState('');
  // 3. บันทึกการเลือกเปิดห้องสนทนาบนมือถือ
  const [mobileShowMessages, setMobileShowMessages] = useState(false);

  // 4. ดึงรายการแชทและโปรไฟล์จาก Context
  const { chatSessions, sendChatMessage, profile } = useApp();

  // จัดการฟังก์ชันส่งข้อความ
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    // เรียกฟังก์ชันจาก Context เพื่อบันทึกข้อความลงรายการแชท
    sendChatMessage(selectedSessionId, messageInput);
    setMessageInput(''); // ล้างช่องพิมพ์
  };

  // ดึงห้องสนทนาตัวจริงจาก Session ID ที่เลือก
  const activeSession = chatSessions.find(s => s.id === selectedSessionId) || chatSessions[0];

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col h-screen">
      
      {/* 🧭 เมนูนำทางด้านบน */}
      <nav className="fixed w-full z-50 top-0 bg-white border-b border-slate-200 shadow-sm h-16 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 h-full">
          <div className="flex justify-between items-center h-full">
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
            </Link>

            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">นายหน้าของเรา</Link>
              <Link href="/appointments" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">การนัดหมาย</Link>
            </div>

            <div className="flex items-center space-x-3">
              <Link href="/profile" className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-sm">
                <img src="https://i.pravatar.cc/150?img=68" alt="Profile" className="w-7 h-7 rounded-full border border-white shadow-sm object-cover" />
                <span className="text-xs font-bold text-slate-900 leading-none hidden sm:inline">{profile.fullName}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 📦 กล่องแชทแบ่ง 2 ฝั่ง ซ้ายเป็นรายชื่อห้อง - ขวาเป็นบทสนทนา */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 flex overflow-hidden gap-4 h-[calc(100vh-4rem)] pt-20">
        
        {/* รายชื่อห้องนายหน้าฝั่งซ้าย */}
        <div className={`w-full md:w-1/3 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden h-full flex-shrink-0 ${mobileShowMessages ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-base font-extrabold text-slate-900">กล่องข้อความ</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatSessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => {
                  setSelectedSessionId(session.id);
                  setMobileShowMessages(true);
                }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border ${session.id === selectedSessionId ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50 border-transparent'}`}
              >
                <div className="relative">
                  <img src={session.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm border" alt={session.name} />
                  {session.isActive && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
                </div>
                <div className="flex-1 overflow-hidden text-xs">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-bold text-slate-900 truncate">{session.name}</h4>
                    <span className="text-[9px] text-slate-400 font-bold">{session.time}</span>
                  </div>
                  <p className="text-slate-500 truncate">{session.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* บทสนทนาฝั่งขวา */}
        <div className={`w-full md:flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 flex-col h-full overflow-hidden relative ${mobileShowMessages ? 'flex' : 'hidden md:flex'}`}>
          
          {/* ส่วนหัวแสดงชื่อคนที่เราแชทอยู่ */}
          <div className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-slate-50/80 backdrop-blur-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* ปุ่มย้อนกลับสำหรับหน้าจอมือถือ */}
              <button 
                onClick={() => setMobileShowMessages(false)}
                className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer font-bold flex items-center mr-1"
              >
                ← ย้อนกลับ
              </button>
              <div className="relative">
                <img src={activeSession.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm border" alt={activeSession.name} />
                {activeSession.isActive && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs leading-tight">
                  {activeSession.name}
                </h3>
                <p className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> นายหน้าออนไลน์
                </p>
              </div>
            </div>
          </div>

          {/* รายการแสดงประวัติข้อความ */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
            {activeSession.messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col max-w-[70%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className={`p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 font-bold">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* ช่องส่งข้อความ */}
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-md cursor-pointer"
            >
              ส่ง
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
