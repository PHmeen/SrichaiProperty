'use client';

// การ์ดแสดงผลอสังหาริมทรัพย์ 1 รายการ ใช้ในหน้าค้นหาและหน้าแรก

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/context/AppContext'; // กำหนดโครงสร้างข้อมูลอสังหาริมทรัพย์ที่แสดงในการ์ด

// Props ที่รับเข้ามาจากคอมโพเนนต์แม่ (search/page.tsx)
interface PropertyCardProps {
  prop: Property;                              // ข้อมูลอสังหาริมทรัพย์ 1 หลัง
  isFav: boolean;                             // สถานะว่าบ้านหลังนี้อยู่ในรายการโปรดหรือไม่ (true/false)
  toggleFavorite: (id: string | number) => void; // ฟังก์ชันกดสลับสถานะรายการโปรด
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function BathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
      <path d="M7 12V6a2 2 0 0 1 3.2-1.6M4 19v1M18 19v1" />
    </svg>
  );
}

function AreaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v6M3 3h6M21 21v-6M21 21h-6" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M12 2.5l2.9 6 6.6.7-4.9 4.6 1.3 6.5L12 16.9l-5.9 3.4 1.3-6.5-4.9-4.6 6.6-.7L12 2.5Z" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
    </svg>
  );
}

export default function PropertyCard({ prop, isFav, toggleFavorite }: PropertyCardProps) {
  // ฟังก์ชันช่วยสร้างรูป Avatar สำรองจากชื่อนายหน้า (กรณีที่นายหน้าไม่มีรูปโปรไฟล์)
  const getInitialsAvatar = (name: string) =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=fff`;

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group relative ${
      prop.isPremium ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-amber-100' : 'border-slate-200'
    }`}>

      {/* ปุ่มกดหัวใจบันทึกรายการโปรด */}
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

      {/* ป้าย Badge สถานะ (พรีเมียม / แท็ก / ประเภททรัพย์) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        {prop.isPremium ? (
          <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded text-[10px] tracking-wide shadow flex items-center gap-1">
            <StarIcon className="w-2.5 h-2.5" /> พรีเมียมพิเศษ
          </span>
        ) : (
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
            {prop.tag || 'ทั่วไป'}
          </span>
        )}
        <span className="bg-slate-900/80 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
          {prop.type}
        </span>
      </div>

      {/* ลิงก์ห่อหุ้มรูปภาพและรายละเอียดบ้าน */}
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
            <PinIcon className="w-3 h-3 shrink-0" />
            {prop.districtName && prop.amphureName && prop.provinceName
              ? `${prop.districtName}, ${prop.amphureName}, ${prop.provinceName}`
              : prop.location.replace("📍 ", "")}
          </p>

          {/* สเปกบ้าน: จำนวนห้องนอน, ห้องน้ำ, ขนาดพื้นที่ */}
          <div className="flex items-center justify-between text-slate-400 py-1 text-[11px] font-medium">
            <span className="inline-flex items-center gap-1"><BedIcon className="w-3.5 h-3.5" /> {prop.bedrooms} นอน</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span className="inline-flex items-center gap-1"><BathIcon className="w-3.5 h-3.5" /> {prop.bathrooms} น้ำ</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span className="inline-flex items-center gap-1"><AreaIcon className="w-3.5 h-3.5" /> {prop.area} ตร.ม.</span>
          </div>
        </div>
      </Link>

      {/* ส่วนแสดงข้อมูลนายหน้าผู้ดูแล (Footer ของการ์ด) */}
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
            <div className={`text-[8px] font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1 ${
              prop.isPremium ? 'text-amber-600 font-extrabold' : 'text-blue-600 font-medium'
            }`}>
              {prop.isPremium && <CrownIcon className="w-2.5 h-2.5" />}
              {prop.isPremium ? 'Premium Agent' : 'Verified Agent'}
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
