'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/context/AppContext';

interface PropertyCardProps {
  prop: Property;
  isFav: boolean;
  toggleFavorite: (id: string | number) => void;
}

export default function PropertyCard({ prop, isFav, toggleFavorite }: PropertyCardProps) {
  // สร้างฟังก์ชันวาดรูปภาพอักษรย่อกรณีไม่มีรูปนายหน้า
  const getInitialsAvatar = (name: string) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=fff`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative">
      {/* ปุ่มถูกใจ */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(prop.id);
        }}
        className="absolute top-3.5 right-3.5 z-10 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-115 transition shadow-md cursor-pointer"
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

      {/* แท็กด้านซ้ายบนของภาพ */}
      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
        <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black shadow uppercase tracking-wide">
          {prop.tag || 'แนะนำ'}
        </span>
        <span className="bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[9px] font-black shadow tracking-wide">
          {prop.type}
        </span>
      </div>

      {/* ลิงก์รายละเอียดตัวการ์ด */}
      <Link href={`/property/${prop.id}`} className="block flex-grow">
        <div className="relative h-44 overflow-hidden bg-slate-100">
          <Image 
            src={prop.image} 
            alt={prop.title}
            width={320}
            height={176}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>

        <div className="p-5 space-y-3">
          {/* ราคา */}
          <div className="text-xl font-black text-blue-700 leading-none">
            {prop.price}
          </div>
          
          {/* ชื่ออสังหาฯ */}
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {prop.title}
          </h3>

          {/* ทำเลที่ตั้ง */}
          <p className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
            📍 {prop.districtName && prop.amphureName && prop.provinceName 
              ? `${prop.districtName}, ${prop.amphureName}, ${prop.provinceName}` 
              : prop.location.replace("📍 ", "")}
          </p>

          {/* สเปคข้อมูลห้อง */}
          <div className="flex items-center justify-between text-slate-500 border border-slate-100 py-2.5 bg-slate-50/50 px-3 rounded-xl text-[11px] font-bold">
            <span>🛏️ {prop.bedrooms} ห้องนอน</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span>🚿 {prop.bathrooms} ห้องน้ำ</span>
            <div className="w-px h-4 bg-slate-200"></div>
            <span>📏 {prop.area} ตร.ม.</span>
          </div>
        </div>
      </Link>

      {/* ลายเซ็นนายหน้าด้านล่าง */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-2">
          <Image 
            src={prop.agentImage || getInitialsAvatar(prop.agentName)} 
            alt={prop.agentName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full border border-white shadow-sm object-cover"
          />
          <div>
            <div className="text-[10px] font-black text-slate-800 leading-none">{prop.agentName}</div>
            <div className="text-[8px] text-blue-600 font-bold mt-0.5 uppercase tracking-wider">Verified Agent</div>
          </div>
        </div>

        <Link 
          href={`/property/${prop.id}`}
          className="text-[10px] text-blue-600 font-black hover:text-blue-700 transition flex items-center gap-0.5"
        >
          รายละเอียด &rarr;
        </Link>
      </div>
    </div>
  );
}
