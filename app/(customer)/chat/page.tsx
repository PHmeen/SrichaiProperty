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
      <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* โลโก้เว็บไซต์ */}
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-700/30 group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Srichai<span className="text-blue-600">Property</span>
              </span>
            </Link>

            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">นายหน้าของเรา</Link>
              <Link href="/appointments" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ประวัติการนัดหมาย</Link>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-1 border-r border-slate-200 pr-3">
                {/* ลิงก์ไปหน้าบันทึกที่ชอบ */}
                <Link href="/favorites" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer" title="รายการโปรด">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </Link>
                
                {/* ลิงก์ไปห้องสนทนา (แชท) */}
                <Link href="/chat" className="relative p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition cursor-pointer" title="ข้อความแชท">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863-0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white"></span>
                  </span>
                </Link>
              </div>

              {/* เมนูหน้าโปรไฟล์แบบ Dropdown */}
              <div className="relative group">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-sm cursor-pointer hover:bg-slate-100 transition">
                  <img src="https://i.pravatar.cc/150?img=68" alt="Profile" className="w-7 h-7 rounded-full border border-white shadow-sm object-cover group-hover:scale-105 transition-transform" />
                  <div className="flex flex-col hidden sm:flex">
                    <span className="text-xs font-bold text-slate-900 leading-none">{profile.fullName}</span>
                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                      {profile.role === 'buyer' ? 'ผู้สนใจซื้อ' : profile.role === 'agent' ? 'นายหน้า' : 'ผู้ดูแลระบบ'}
                    </span>
                  </div>
                </div>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right z-50">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{profile.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profile.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link href="/profile" className="block px-3 py-1.5 text-xs text-slate-600 font-medium hover:bg-slate-50 hover:text-blue-600 rounded-lg transition">ตั้งค่าโปรไฟล์</Link>
                    {profile.role === 'agent' && (
                      <Link href="/agent/dashboard" className="block px-3 py-1.5 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition">🖥️ แดชบอร์ดนายหน้า</Link>
                    )}
                    {profile.role === 'admin' && (
                      <Link href="/admin/dashboard" className="block px-3 py-1.5 text-xs text-purple-600 font-bold hover:bg-purple-50 rounded-lg transition">🖥️ แดชบอร์ดผู้ดูแลระบบ</Link>
                    )}
                  </div>
                  <div className="p-1.5 border-t border-slate-100">
                    <Link href="/login" className="block px-3 py-1.5 text-xs text-red-600 font-bold hover:bg-red-50 rounded-lg transition">ออกจากระบบ</Link>
                  </div>
                </div>
              </div>
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
