'use client';

/**
 * page.tsx (Customer Home) - หน้าหลักสำหรับลูกค้าผู้สนใจซื้อ/เช่าบ้าน
 * เหมาะสำหรับมือใหม่: หน้าเว็บนี้ดึงข้อมูลจาก `useApp` (ฐานข้อมูลจำลองจาก AppContext) 
 * มาวนลูปแสดงการ์ดรายการแนะนำ ยอดนิยม และแสดงการตอบสนองเมื่อผู้ใช้คลิกถูกใจ (หัวใจ)
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function CustomerHomePage() {
  // === 1. ประกาศตัวแปรสถานะภายในหน้าเพจ (Local State) ===
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy'); // เก็บข้อมูลการสลับแท็บเมนู ค้นหา ซื้อ/เช่า/ขาย
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);               // สลับแสดง/ซ่อนเมนูแนวตั้งบนมือถือ

  // === 2. เรียกใช้ข้อมูลและฟังก์ชันจากส่วนกลาง (Global State จาก useApp) ===
  const { properties, favorites, toggleFavorite, profile, appointments } = useApp();

  // กรองรายการอสังหาริมทรัพย์เฉพาะรายการที่เป็น Premium (แนะนำพิเศษ)
  const exclusiveProperties = properties.filter(p => p.isPremium);
  // รายการแนะนำทั่วไป (แสดงรายการทั้งหมด)
  const featuredProperties = properties;

  // รายชื่อพิกัดหรือเขตพื้นที่ยอดนิยม (พรีเซ็ตข้อมูลคงที่สำหรับแสดงภาพรวม)
  const locations = [
    { name: "หาดใหญ่", count: 124, image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "เมืองสงขลา", count: 86, image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "สะเดา", count: 45, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "ระโนด", count: 28, image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  ];

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      
      {/* ==================================================== */}
      {/* 🧭 แถบนำทางด้านบน (Navigation Bar)                   */}
      {/* ==================================================== */}
      <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            
            {/* โลโก้เว็บไซต์ */}
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-700/30 group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Srichai<span className="text-blue-600">Property</span>
              </span>
            </Link>

            {/* เมนูลิงก์ระดับ Desktop (ซ่อนเมื่อแสดงผลบนจอเล็ก) */}
            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-blue-700 bg-white shadow-sm rounded-full px-4 py-1.5 text-xs font-bold transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">นายหน้าของเรา</Link>
              <Link href="/appointments" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ประวัติการนัดหมาย</Link>
            </div>

            {/* ส่วนโปรไฟล์และทางลัด */}
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

              {/* ปุ่มเปิดเมนูด้านบนเวอร์ชันมือถือ */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-slate-600 hover:text-blue-600 focus:outline-none ml-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* เมนูมือถือแนวตั้ง */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg z-50">
            <div className="px-4 pt-3 pb-5 space-y-1.5 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-3 px-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <img src="https://i.pravatar.cc/150?img=68" className="w-10 h-10 rounded-full border border-slate-200" alt="Avatar" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{profile.fullName}</h4>
                    <p className="text-[10px] text-blue-600 font-bold">{profile.role === 'buyer' ? 'ผู้สนใจซื้อ' : 'นายหน้า'}</p>
                  </div>
                </div>
                <Link href="/profile" className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-1.5 rounded hover:bg-slate-200 transition">ตั้งค่า</Link>
              </div>

              <Link href="/home" className="block px-3 py-2 text-xs text-blue-700 font-bold bg-blue-50 rounded-lg">หน้าแรก</Link>
              <Link href="/search" className="block px-3 py-2 text-xs text-slate-600 font-medium hover:bg-slate-50 rounded-lg">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="block px-3 py-2 text-xs text-slate-600 font-medium hover:bg-slate-50 rounded-lg">นายหน้าของเรา</Link>
              
              <div className="border-t border-slate-100 my-2"></div>
              
              <Link href="/favorites" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 font-medium hover:bg-slate-50 rounded-lg">
                <span>❤️</span> รายการโปรด
              </Link>
              <Link href="/appointments" className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 font-medium hover:bg-slate-50 rounded-lg">
                <span>📅</span> ประวัติการนัดหมาย
              </Link>
              
              <div className="border-t border-slate-100 my-3"></div>
              <Link href="/login" className="block px-3 py-2 text-xs bg-red-50 text-red-600 font-bold text-center rounded-lg transition hover:bg-red-100">ออกจากระบบ</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================================================== */}
      {/* 🏡 ส่วนหัวต้อนรับ และกล่องตัวกรอง (Hero & Filter)       */}
      {/* ==================================================== */}
      <header className="relative pt-24 pb-16 lg:pt-32 lg:pb-20 overflow-hidden flex items-center justify-center min-h-[55vh]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}></div>
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-white text-xs font-medium shadow">
            <span className="text-sm">👋</span> <span>สวัสดีคุณ {profile.fullName}, ยินดีต้อนรับกลับมา</span>
          </div>

          {/* กล่องสถานะแจ้งเตือนนัดหมายที่จะมาถึง (Conditional Rendering: แสดงเฉพาะเมื่อมีนัดหมาย) */}
          {appointments.length > 0 && (
            <div className="mb-5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-3 shadow cursor-pointer hover:bg-white/20 transition max-w-xl w-full">
              <span className="text-xl">📅</span>
              <div className="text-left">
                <p className="font-bold text-xs sm:text-sm text-blue-200">คุณมี {appointments.length} นัดหมายที่กำลังจะมาถึง</p>
              </div>
              <Link href="/appointments" className="ml-auto text-white font-bold text-xs bg-blue-600 px-2.5 py-1 rounded shadow hover:bg-blue-700 transition hidden sm:block">ดูรายละเอียด</Link>
            </div>
          )}
          
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight drop-shadow-md font-sans">
            ค้นพบพื้นที่ความสุข<br />ที่คุณเรียกว่า <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">&quot;บ้าน&quot;</span>
          </h1>
          <p className="text-sm md:text-base text-slate-200 mb-8 max-w-xl font-light drop-shadow">
            Srichai Property Agents ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายเข้าชมและแชทกับนายหน้าโดยตรง
          </p>

          {/* กล่องตัวกรองสลับแท็บ ค้นหาด่วน */}
          <div className="w-full max-w-3xl bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 shadow-xl">
            <div className="flex space-x-1.5 mb-2.5 px-1 pt-1">
              <button 
                onClick={() => setActiveTab("buy")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "buy" ? "bg-blue-700 text-white shadow-sm" : "text-slate-100 hover:bg-white/10"
                }`}
              >
                ซื้อ
              </button>
              <button 
                onClick={() => setActiveTab("rent")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "rent" ? "bg-blue-700 text-white shadow-sm" : "text-slate-100 hover:bg-white/10"
                }`}
              >
                เช่า
              </button>
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "sell" ? "bg-blue-700 text-white shadow-sm" : "text-slate-100 hover:bg-white/10"
                }`}
              >
                ขาย
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 bg-white rounded-xl flex items-center px-3 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-all">
                <span className="text-xl mr-1.5">📍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหาทำเล เช่น หาดใหญ่, สงขลา..." 
                  className="w-full py-2.5 bg-transparent focus:outline-none text-slate-800 font-medium text-xs"
                />
              </div>
              
              <div className="md:w-40 bg-white rounded-xl flex items-center px-3 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-all">
                <span className="text-lg mr-1.5">🏠</span>
                <select className="w-full py-2.5 bg-transparent focus:outline-none text-slate-800 font-medium text-xs cursor-pointer">
                  <option value="">ทุกประเภท</option>
                  <option value="house">บ้านเดี่ยว</option>
                  <option value="townhome">ทาวน์โฮม</option>
                  <option value="condo">คอนโดมิเนียม</option>
                </select>
              </div>

              {activeTab === "sell" ? (
                <Link
                  href="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow w-full md:w-auto flex items-center justify-center text-xs"
                >
                  ลงประกาศฟรี
                </Link>
              ) : (
                <Link
                  href="/search"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow w-full md:w-auto flex items-center justify-center text-xs"
                >
                  ค้นหาเลย
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================== */}
      {/* 📍 ส่วนที่ 1: เขตพื้นที่ยอดนิยม (Locations)             */}
      {/* ==================================================== */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
            <p className="text-slate-500 text-xs">ค้นหาอสังหาริมทรัพย์ในพื้นที่ยอดฮิต</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {locations.map((loc, i) => (
              <Link 
                key={i} 
                href="/search"
                className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
              >
                <img 
                  src={loc.image} 
                  alt={loc.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-white text-base font-bold mb-0.5">{loc.name}</h3>
                  <p className="text-slate-300 text-[10px]">{loc.count} ประกาศ</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* ⭐ ส่วนที่ 2: รายการแนะนำพิเศษ (Premium Properties)     */}
      {/* ==================================================== */}
      {exclusiveProperties.length > 0 && (
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">⭐ อสังหาริมทรัพย์พรีเมียมแนะนำ</h2>
              <p className="text-slate-500 text-xs">คัดสรรเฉพาะบ้านและคอนโดหรูทำเลทอง</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exclusiveProperties.map((prop) => (
                <Link 
                  key={prop.id}
                  href={`/property/${prop.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col sm:flex-row"
                >
                  <div className="sm:w-1/2 h-48 sm:h-auto relative">
                    <img src={prop.image} className="w-full h-full object-cover" alt={prop.title} />
                  </div>
                  <div className="p-4 sm:w-1/2 flex flex-col justify-between">
                    <div>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{prop.type}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1.5 line-clamp-1">{prop.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{prop.location}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-blue-700 font-extrabold text-sm">{prop.price}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">ดูรายละเอียด</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================== */}
      {/* 🏠 ส่วนที่ 3: รายการทั่วไปทั้งหมด (Featured Properties)   */}
      {/* ==================================================== */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">ประกาศแนะนำล่าสุด</h2>
              <p className="text-slate-500 text-xs font-medium">อสังหาริมทรัพย์คุณภาพคัดสรรโดยนายหน้ามืออาชีพ</p>
            </div>
            <Link 
              href="/search" 
              className="inline-flex items-center text-slate-700 font-bold hover:text-blue-700 transition bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs group"
            >
              ดูทั้งหมด <span className="ml-1 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProperties.map((prop) => {
              const isFav = favorites.includes(prop.id);
              return (
                <div 
                  key={prop.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 relative group cursor-pointer"
                >
                  {/* ปุ่มหัวใจเพื่อเพิ่ม/ลบจากรายการโปรด (Favorites) */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault(); // ป้องกันการกดลิงก์ซ้อน
                      toggleFavorite(prop.id);
                    }} 
                    className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm cursor-pointer"
                  >
                    <svg 
                      className={`w-4 h-4 transition-colors ${isFav ? "text-red-500" : "text-slate-400"}`} 
                      fill={isFav ? "currentColor" : "none"} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                  </button>
                  
                  {/* ป้ายแท็กของอสังหาฯ */}
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
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>

                    {/* รายละเอียดข้อความการ์ด */}
                    <div className="p-4">
                      <div className="text-xl font-extrabold text-blue-700 mb-1">{prop.price}</div>
                      <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{prop.title}</h3>
                      <p className="text-slate-500 text-xs mb-4 flex items-center">{prop.location}</p>
                      
                      {/* รายละเอียด สเปคห้อง */}
                      <div className="flex items-center justify-between text-slate-600 border-t border-b border-slate-100 py-2.5 mb-3 bg-slate-50 px-3 rounded-lg text-xs">
                        <span>🛏️ {prop.bedrooms} ห้องนอน</span>
                        <div className="w-px h-5 bg-slate-200" />
                        <span>🚿 {prop.bathrooms} ห้องน้ำ</span>
                        <div className="w-px h-5 bg-slate-200" />
                        <span>📏 {prop.area} ตร.ม.</span>
                      </div>

                      {/* ชื่อและภาพนายหน้าผู้ดูแล */}
                      <div className="flex items-center gap-2">
                        <img 
                          src={prop.agentImage} 
                          alt={prop.agentName}
                          className="w-8 h-8 rounded-full border border-white shadow-sm"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-900">{prop.agentName}</div>
                          <div className="text-[10px] text-slate-500">Srichai Agent</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 📋 ส่วนท้ายเว็บไซต์ (Footer)                             */}
      {/* ==================================================== */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs">&copy; 2026 Srichai Property Agents. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
