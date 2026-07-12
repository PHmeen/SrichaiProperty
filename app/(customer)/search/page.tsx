'use client';

/**
 * SearchPage.tsx - หน้าค้นหาและกรองรายการอสังหาริมทรัพย์ทั้งหมด
 * เหมาะสำหรับมือใหม่: หน้านี้แสดงวิธีกรองข้อมูล (Filter Arrays) 
 * ตามตัวเลือกที่ผู้ใช้กดเลือกในแท็บและตัวเลือก Select ต่างๆ
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function SearchPage() {
  // === 1. ตัวแปรสถานะสำหรับการกรองข้อมูล (Filter States) ===
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy'); // สถานะ ซื้อ หรือ เช่า
  const [propertyType, setPropertyType] = useState('all');            // ประเภทอสังหาฯ เช่น บ้านเดี่ยว, คอนโด
  const [priceRange, setPriceRange] = useState('all');                // ช่วงราคา
  const [searchTerm, setSearchTerm] = useState('');                  // ข้อความที่ป้อนในช่องค้นหา
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);        // แสดง/ซ่อนเมนูแนวตั้งบนมือถือ

  // === 2. ดึงข้อมูลรายการอสังหาฯ จากฐานข้อมูลกลาง ===
  const { properties, favorites, toggleFavorite, profile } = useApp();

  // === 3. ฟังก์ชันการกรองข้อมูล (Filtering Logic) ===
  // วนลูปกรองรายการจากอาเรย์ properties ทั้งหมดตามตัวเลือกที่ตั้งค่าไว้
  const filteredProperties = properties.filter((prop) => {
    // 3.1 ค้นหาจากชื่อโครงการ หรือทำเล
    const matchesSearch = prop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prop.location.toLowerCase().includes(searchTerm.toLowerCase());

    // 3.2 กรองประเภทอสังหาฯ (ถ้าเลือก "ประเภททั้งหมด" ให้ผ่านทั้งหมด)
    const matchesType = propertyType === 'all' || 
                        (propertyType === 'house' && prop.type.includes('บ้าน')) ||
                        (propertyType === 'condo' && prop.type.includes('คอนโด')) ||
                        (propertyType === 'townhome' && prop.type.includes('ทาวน์โฮม'));

    // 3.3 กรองตามช่วงราคา (แปลงข้อความราคาเป็นตัวเลขเพื่อเปรียบเทียบ)
    const rawPrice = parseInt(prop.price.replace(/[^\d]/g, ''));
    let matchesPrice = true;
    if (priceRange === 'low') {
      matchesPrice = rawPrice < 3000000; // ต่ำกว่า 3 ล้าน
    } else if (priceRange === 'mid') {
      matchesPrice = rawPrice >= 3000000 && rawPrice <= 7000000; // 3 - 7 ล้าน
    } else if (priceRange === 'high') {
      matchesPrice = rawPrice > 7000000; // มากกว่า 7 ล้าน
    }

    // จะต้องผ่านเงื่อนไขทุกข้อจึงจะถูกนำมาแสดงผล
    return matchesSearch && matchesType && matchesPrice;
  });

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      
      {/* 🧭 เมนูนำทาง (Navigation Bar) */}
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

            {/* เมนูกลาง */}
            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">หน้าแรก</Link>
              <Link href="/search" className="text-blue-700 bg-white shadow-sm rounded-full px-4 py-1.5 text-xs font-bold transition">ค้นหาอสังหาฯ</Link>
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

      <div className="pt-16"></div>

      {/* 🔍 ส่วนแถบตัวเลือกสำหรับค้นหาข้อมูล (Filter Panel) */}
      <div className="bg-slate-900 py-10 lg:py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-white">
          <h1 className="text-2xl font-extrabold mb-4 font-sans">ค้นหาอสังหาฯ ที่ใช่ สำหรับคุณ</h1>
          
          <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col md:flex-row gap-3">
            
            {/* ช่องสำหรับพิมพ์ค้นหาข้อความ */}
            <div className="flex-1 flex bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-500 transition-colors">
              <span className="flex items-center pl-3 pr-2 text-slate-400">📍</span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา รหัสทรัพย์, ชื่อโครงการ, หรือสถานีรถไฟฟ้า..." 
                className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-medium px-2 py-2 outline-none text-xs" 
              />
            </div>

            {/* ตัวเลือกประเภท ซื้อ/เช่า */}
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value as 'buy' | 'rent')}
              className="md:w-40 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-slate-700 font-bold text-xs cursor-pointer outline-none"
            >
              <option value="buy">ซื้อ (Buy)</option>
              <option value="rent">เช่า (Rent)</option>
            </select>

            {/* ตัวเลือกประเภทบ้าน/คอนโด */}
            <select 
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="md:w-48 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-slate-700 font-bold text-xs cursor-pointer outline-none"
            >
              <option value="all">ประเภททั้งหมด</option>
              <option value="house">บ้านเดี่ยว</option>
              <option value="condo">คอนโดมิเนียม</option>
              <option value="townhome">ทาวน์โฮม</option>
            </select>

            {/* ตัวเลือกช่วงราคา */}
            <select 
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="md:w-48 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-slate-700 font-bold text-xs cursor-pointer outline-none"
            >
              <option value="all">ช่วงราคาทั้งหมด</option>
              <option value="low">ต่ำกว่า 3 ล้านบาท</option>
              <option value="mid">3 - 7 ล้านบาท</option>
              <option value="high">7 ล้านบาทขึ้นไป</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📦 ส่วนแสดงผลลัพธ์รายการที่ตรงตามเงื่อนไข */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* คอลัมน์ฝั่งซ้าย: รายการการ์ดผลลัพธ์การค้นหา */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
              <span>พบอสังหาริมทรัพย์ที่สอดคล้อง {filteredProperties.length} ประกาศ</span>
            </div>

            {filteredProperties.length === 0 ? (
              <div className="text-center py-20 bg-white border rounded-2xl text-slate-400 text-xs">
                ไม่พบผลการค้นหา กรุณาลองเปลี่ยนคำค้นหาหรือการตั้งค่าตัวกรองใหม่
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProperties.map((prop) => (
                  <div key={prop.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-100 relative group flex flex-col justify-between">
                    
                    {/* ปุ่มดักคลิกหัวใจ */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(prop.id);
                      }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm cursor-pointer"
                    >
                      <svg className={`w-4 h-4 ${favorites.includes(prop.id) ? 'text-red-500' : 'text-slate-400'}`} fill={favorites.includes(prop.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                    
                    {/* ลิงก์หุ้มการ์ดนำทางไปหน้าดูรายละเอียด */}
                    <Link href={`/property/${prop.id}`} className="block">
                      <div className="relative h-40 overflow-hidden">
                        <img src={prop.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={prop.title} />
                        <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">{prop.type}</span>
                      </div>

                      <div className="p-4 space-y-2">
                        <div className="text-lg font-black text-blue-700">{prop.price}</div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{prop.title}</h3>
                        <p className="text-slate-500 text-[11px]">{prop.location}</p>
                        
                        {/* ไอคอนขนาดและข้อมูลห้อง */}
                        <div className="flex items-center justify-between text-slate-600 border-t border-slate-100 pt-2 mb-1 text-[11px]">
                          <span>🛏️ {prop.bedrooms} นอน</span>
                          <span>🚿 {prop.bathrooms} น้ำ</span>
                          <span>📏 {prop.area} ตร.ม.</span>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* คอลัมน์ฝั่งขวา: แผนที่นำทาง (Static Maps Placeholder) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm relative overflow-hidden h-[380px] sticky top-24">
              <div className="absolute inset-0 bg-slate-200 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=7.0084,100.4767&zoom=13&size=400x400&sensor=false')] bg-cover bg-center"></div>
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-md border border-slate-200 text-center">
                <span className="text-lg mb-0.5 block">📍</span>
                <h4 className="font-bold text-slate-900 text-xs">พิกัดรอบตัวคุณ</h4>
                <p className="text-slate-500 text-[10px] leading-relaxed">ซูมตรวจเช็คอสังหาริมทรัพย์และสำรวจทำเลรอบข้าง</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
