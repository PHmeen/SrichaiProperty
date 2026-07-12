'use client';

/**
 * page.tsx (Favorites List) - หน้ารวมรายการอสังหาริมทรัพย์ที่ผู้ใช้กดถูกใจ (หัวใจ) ไว้
 * เหมาะสำหรับมือใหม่: แสดงวิธีกรองข้อมูลอาเรย์โดยใช้เงื่อนไข `.filter` เช็คว่าไอดีของบ้าน
 * อยู่ในอาเรย์ favorites หรือไม่ พร้อมแชร์สถานะหัวใจกลับไปหน้าแรกทันที
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function FavoritesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // ดึงข้อมูลรายการบ้านและเมธอดหัวใจจากระบบ Context ส่วนกลาง
  const { properties, favorites, toggleFavorite, profile } = useApp();

  // กรองบ้านพักที่รหัสไอดีถูกบันทึกไว้ในหัวใจ
  const favoriteProperties = properties.filter(prop => favorites.includes(prop.id));

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      
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

      {/* 📦 กล่องข้อความหลักแสดงจำนวนที่เซฟไว้ */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-grow w-full pt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
              <span className="text-red-500">❤️</span> รายการโปรดของคุณ
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">คุณบันทึกทรัพย์ไว้ทั้งหมด <span className="font-bold text-slate-900">{favoriteProperties.length}</span> รายการ</p>
          </div>
        </div>

        {/* แสดงการ์ดรายการโปรด */}
        {favoriteProperties.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl text-slate-400">
            คุณยังไม่มีรายการอสังหาริมทรัพย์ที่ถูกใจ
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {favoriteProperties.map((prop) => (
              <div 
                key={prop.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 relative group cursor-pointer"
              >
                {/* ปุ่มหัวใจเพื่อยกเลิกการบันทึก */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(prop.id);
                  }} 
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                
                {/* แท็กบอกประเภท */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                  <span className={`${prop.tagBg} text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm`}>
                    {prop.tag}
                  </span>
                  <span className="bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                    {prop.type}
                  </span>
                </div>
                
                {/* ลิงก์รายละเอียดตัวการ์ด */}
                <Link href={`/property/${prop.id}`} className="block">
                  <div className="relative h-44 overflow-hidden">
                    <img 
                      src={prop.image} 
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-4">
                    <div className="text-xl font-extrabold text-blue-700 mb-1">{prop.price}</div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{prop.title}</h3>
                    <p className="text-slate-500 text-xs mb-4 flex items-center">{prop.location}</p>
                    
                    {/* ขนาดห้อง */}
                    <div className="flex items-center justify-between text-slate-600 border-t border-b border-slate-100 py-2.5 mb-3 bg-slate-50 px-3 rounded-lg text-xs">
                      <span>🛏️ {prop.bedrooms} นอน</span>
                      <div className="w-px h-5 bg-slate-200" />
                      <span>🚿 {prop.bathrooms} น้ำ</span>
                      <div className="w-px h-5 bg-slate-200" />
                      <span>📏 {prop.area} ตร.ม.</span>
                    </div>

                    {/* ข้อมูลนายหน้าผู้ดูแล */}
                    <div className="flex items-center gap-2">
                      <img 
                        src={prop.agentImage} 
                        alt={prop.agentName}
                        className="w-8 h-8 rounded-full border border-white shadow-sm object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{prop.agentName}</div>
                        <div className="text-[10px] text-slate-500">Srichai Agent</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ส่วนท้ายเว็บไซต์ */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs">
          <p>&copy; 2026 Srichai Property Agents. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
