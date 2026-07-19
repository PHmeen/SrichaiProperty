'use client';

// === หน้ารายการโปรด (Favorites Page) ===
// เหมาะสำหรับมือใหม่: แสดงวิธีการเขียนฟังก์ชันคัดกรองรายการบ้านที่ถูกใจด้วยคำสั่ง .filter จาก Context

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function FavoritesPage() {
  // ดึงข้อมูลรายการบ้านและเมธอดหัวใจจากระบบ Context ส่วนกลาง
  const { properties, favorites, toggleFavorite } = useApp();

  // กรองบ้านพักที่รหัสไอดีถูกบันทึกไว้ในหัวใจ
  const favoriteProperties = properties.filter(prop => favorites.includes(prop.id));

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      {/* 📦 กล่องข้อความหลักแสดงจำนวนที่เซฟไว้ */}
      <main className="max-w-5xl mx-auto px-4 py-6 flex-grow w-full">
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
    </div>
  );
}

