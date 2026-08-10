'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์การ์ดแสดงผลอสังหาริมทรัพย์ (Property Card Component)
 * ==============================================================================
 * ภาพรวมการทำงาน:
 * 1. รับข้อมูลอสังหาริมทรัพย์ 1 รายการ (`prop`) จากคอมโพเนนต์แม่ (search/page.tsx)
 * 2. แสดงรูปภาพบ้าน, สถานะพรีเมียม, ราคา, ชื่อทรัพย์, ทำเล, จำนวนห้องนอน/น้ำ, ขนาดพื้นที่
 * 3. มีปุ่มกดหัวใจบันทึกโปรด (`toggleFavorite`) และแสดงข้อมูลนายหน้าผู้ดูแล
 * 4. เมื่อคลิกที่การ์ด จะพาไปยังหน้ารายละเอียดของบ้านหลังนั้น (`/property/[id]`)
 * ==============================================================================
 */

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/context/AppContext';

// Props ที่รับเข้ามาจากคอมโพเนนต์แม่ (search/page.tsx)
interface PropertyCardProps {
  prop: Property;                              // ข้อมูลอสังหาริมทรัพย์ 1 หลัง
  isFav: boolean;                             // สถานะว่าบ้านหลังนี้อยู่ในรายการโปรดหรือไม่ (true/false)
  toggleFavorite: (id: string | number) => void; // ฟังก์ชันกดสลับสถานะรายการโปรด
}

export default function PropertyCard({ prop, isFav, toggleFavorite }: PropertyCardProps) {
  // ฟังก์ชันช่วยสร้างรูป Avatar สำรองจากชื่อนายหน้า (กรณีที่นายหน้าไม่มีรูปโปรไฟล์)
  const getInitialsAvatar = (name: string) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=fff`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group relative ${
      prop.isPremium ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-amber-100' : 'border-slate-200'
    }`}>
      
      {/* -------------------- 1. ปุ่มกดหัวใจบันทึกรายการโปรด (มุมขวาบน) -------------------- */}
      <button 
        onClick={(e) => {
          e.preventDefault(); // ป้องกันไม่ให้คลิกปุ่มหัวใจแล้วเผลอนำทางเปิดลิงก์บ้าน
          toggleFavorite(prop.id);
        }}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center transition border border-slate-100 cursor-pointer shadow-sm"
      >
        <svg 
          className={`w-4 h-4 ${isFav ? 'text-red-500' : 'text-slate-400'}`} 
          fill={isFav ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      </button>

      {/* -------------------- 2. ป้าย Badge สถานะ (พรีเมียม / แท็ก / ประเภททรัพย์) -------------------- */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        {prop.isPremium ? (
          <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-2.5 py-0.5 rounded text-[10px] tracking-wide shadow flex items-center gap-1">
            ⭐ พรีเมียมพิเศษ
          </span>
        ) : (
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
            {prop.tag || 'ทั่วไป'}
          </span>
        )}
        <span className="bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
          {prop.type}
        </span>
      </div>

      {/* -------------------- 3. ลิงก์ห่อหุ้มรูปภาพและรายละเอียดบ้าน -------------------- */}
      <Link href={`/property/${prop.id}`} className="block flex-grow">
        {/* รูปภาพหลักของอสังหาริมทรัพย์ */}
        <div className="relative h-40 overflow-hidden bg-slate-100">
          <Image 
            src={prop.image} 
            alt={prop.title}
            width={320}
            height={160}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>

        {/* ข้อมูลรายละเอียด: ราคา, ชื่อเรื่อง, ทำเล, และสเปกห้อง */}
        <div className="p-4 space-y-2">
          {/* ราคา */}
          <div className="text-lg font-extrabold text-blue-700 leading-none">
            {prop.price}
          </div>
          
          {/* ชื่อทรัพย์ */}
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {prop.title}
          </h3>

          {/* ทำเลที่ตั้ง (แสดง ตำบล, อำเภอ, จังหวัด) */}
          <p className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            📍 {prop.districtName && prop.amphureName && prop.provinceName 
              ? `${prop.districtName}, ${prop.amphureName}, ${prop.provinceName}` 
              : prop.location.replace("📍 ", "")}
          </p>

          {/* สเปกบ้าน: จำนวนห้องนอน, ห้องน้ำ, ขนาดพื้นที่ */}
          <div className="flex items-center justify-between text-slate-400 py-1 text-[11px] font-medium">
            <span>🛏️ {prop.bedrooms} นอน</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span>🚿 {prop.bathrooms} น้ำ</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span>📏 {prop.area} ตร.ม.</span>
          </div>
        </div>
      </Link>

      {/* -------------------- 4. ส่วนแสดงข้อมูลนายหน้าผู้ดูแล (Footer ของการ์ด) -------------------- */}
      <div className={`px-4 pb-4 pt-3 border-t flex items-center justify-between ${
        prop.isPremium ? 'bg-amber-50/40 border-amber-200/50' : 'bg-slate-50/50 border-slate-100'
      }`}>
        {/* รูปโปรไฟล์และชื่อนายหน้า */}
        <div className="flex items-center gap-2">
          <Image
            src={prop.agentImage || getInitialsAvatar(prop.agentName)}
            alt={prop.agentName}
            width={28}
            height={28}
            unoptimized={!prop.agentImage}
            className={`w-7 h-7 rounded-full object-cover ${prop.isPremium ? 'ring-2 ring-amber-400' : ''}`}
          />
          <div>
            <div className="text-[10px] font-bold text-slate-700 leading-none">{prop.agentName}</div>
            <div className={`text-[8px] font-semibold mt-0.5 uppercase tracking-wider ${
              prop.isPremium ? 'text-amber-600 font-extrabold' : 'text-blue-600 font-medium'
            }`}>
              {prop.isPremium ? '👑 Premium Agent' : 'Verified Agent'}
            </div>
          </div>
        </div>

        {/* ลิงก์กดดูรายละเอียดเพิ่มเติม */}
        <Link 
          href={`/property/${prop.id}`}
          className="text-[10px] text-blue-600 font-semibold hover:text-blue-700 transition flex items-center gap-0.5"
        >
          รายละเอียด &rarr;
        </Link>
      </div>
    </div>
  );
}
