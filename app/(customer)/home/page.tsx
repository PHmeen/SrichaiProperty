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
  const [locationInput, setLocationInput] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [priceRange, setPriceRange] = useState('');
  
  // สถานะเปิด-ปิด Custom Dropdown Menu
  const [openType, setOpenType] = useState(false);
  const [openPrice, setOpenPrice] = useState(false);


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
      {/* 🏡 ส่วนหัวต้อนรับ และกล่องตัวกรอง (Hero & Filter)       */}
      {/* ==================================================== */}
      <header className="relative pt-8 pb-16 lg:pt-16 lg:pb-20 flex items-center justify-center min-h-[55vh]">
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

          {/* กล่องตัวกรองสลับแท็บ ค้นหาด่วน (High Readability Card Form) */}
          <div className="w-full max-w-4xl bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-200/80 mt-4 text-left relative z-30">
            
            {/* แถบหัวข้อตัวเลือก ซื้อ / เช่า / ฝากขาย (สีกลมกลืนกับเว็บ) */}
            <div className="flex border-b border-slate-200 mb-6 w-full overflow-x-auto whitespace-nowrap scrollbar-none">
              <button 
                onClick={() => setActiveTab("buy")} 
                className={`pb-3 px-6 text-xs sm:text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
                  activeTab === "buy" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🏠 ซื้ออสังหาริมทรัพย์
              </button>
              <button 
                onClick={() => setActiveTab("rent")} 
                className={`pb-3 px-6 text-xs sm:text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
                  activeTab === "rent" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                🔑 เช่าอสังหาริมทรัพย์
              </button>
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`pb-3 px-6 text-xs sm:text-sm font-extrabold transition-all border-b-2 cursor-pointer ${
                  activeTab === "sell" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                📣 ฝากขาย / ลงประกาศ
              </button>
            </div>

            {/* ฟิลด์ข้อมูลแบบตอบสนอง (Responsive Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* ฟิลด์กรอกทำเล */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center text-left focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">📍 ทำเลที่ตั้ง</span>
                <input 
                  type="text" 
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="ระบุทำเล เช่น หาดใหญ่, สงขลา..." 
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 text-sm font-extrabold placeholder-slate-400 outline-none"
                />
              </div>

              {/* ฟิลด์เลือกประเภท (Custom Dropdown) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center text-left focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative group cursor-pointer select-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">🏠 ประเภทอสังหาฯ</span>
                <div 
                  className="relative w-full flex items-center justify-between"
                  onClick={() => {
                    setOpenType(!openType);
                    setOpenPrice(false);
                  }}
                >
                  <span className="text-slate-800 text-sm font-extrabold truncate">
                    {propertyType === 'house' ? '🏠 บ้านเดี่ยว' : propertyType === 'townhome' ? '🏘️ ทาวน์โฮม' : propertyType === 'condo' ? '🏢 คอนโดมิเนียม' : 'ทุกประเภท'}
                  </span>
                  <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    <svg className={`w-4 h-4 transform transition-transform ${openType ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* เมนูตัวเลือกแบบป๊อปอัพ */}
                {openType && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenType(false); }} />
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5">
                      <button 
                        onClick={() => { setPropertyType(''); setOpenType(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${propertyType === '' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        ทุกประเภท
                      </button>
                      <button 
                        onClick={() => { setPropertyType('house'); setOpenType(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${propertyType === 'house' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        🏠 บ้านเดี่ยว
                      </button>
                      <button 
                        onClick={() => { setPropertyType('townhome'); setOpenType(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${propertyType === 'townhome' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        🏘️ ทาวน์โฮม
                      </button>
                      <button 
                        onClick={() => { setPropertyType('condo'); setOpenType(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${propertyType === 'condo' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        🏢 คอนโดมิเนียม
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ฟิลด์เลือกราคา (Custom Dropdown) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-center text-left focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100 transition-all relative group cursor-pointer select-none">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">💰 ช่วงราคา</span>
                <div 
                  className="relative w-full flex items-center justify-between"
                  onClick={() => {
                    setOpenPrice(!openPrice);
                    setOpenType(false);
                  }}
                >
                  <span className="text-slate-800 text-sm font-extrabold truncate">
                    {priceRange === 'low' ? '💸 ต่ำกว่า 3 ล้าน' : priceRange === 'mid' ? '💵 3 - 7 ล้าน' : priceRange === 'high' ? '💎 7 ล้านขึ้นไป' : 'ทุกช่วงราคา'}
                  </span>
                  <div className="text-slate-400 group-hover:text-blue-600 transition-colors">
                    <svg className={`w-4 h-4 transform transition-transform ${openPrice ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* เมนูตัวเลือกแบบป๊อปอัพ */}
                {openPrice && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setOpenPrice(false); }} />
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-0.5">
                      <button 
                        onClick={() => { setPriceRange(''); setOpenPrice(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${priceRange === '' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        ทุกช่วงราคา
                      </button>
                      <button 
                        onClick={() => { setPriceRange('low'); setOpenPrice(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${priceRange === 'low' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        💸 ต่ำกว่า 3 ล้าน
                      </button>
                      <button 
                        onClick={() => { setPriceRange('mid'); setOpenPrice(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${priceRange === 'mid' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        💵 3 - 7 ล้าน
                      </button>
                      <button 
                        onClick={() => { setPriceRange('high'); setOpenPrice(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-extrabold rounded-xl transition-all ${priceRange === 'high' ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                      >
                        💎 7 ล้านขึ้นไป
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ปุ่มลงมือค้นหา */}
              <div className="w-full flex items-stretch">
                {activeTab === "sell" ? (
                  <Link
                    href="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98] w-full flex items-center justify-center gap-1.5 text-xs text-center cursor-pointer"
                  >
                    🚀 ลงประกาศฟรี
                  </Link>
                ) : (
                  <Link
                    href={`/search?tab=${activeTab}&q=${encodeURIComponent(locationInput)}&type=${propertyType}&price=${priceRange}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl font-black transition-all shadow-md hover:shadow-lg hover:shadow-blue-600/25 active:scale-[0.98] w-full flex items-center justify-center gap-1.5 text-xs text-center cursor-pointer"
                  >
                    🔍 ค้นหาทันที
                  </Link>
                )}
              </div>
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
                href={`/search?q=${encodeURIComponent(loc.name)}`}
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
