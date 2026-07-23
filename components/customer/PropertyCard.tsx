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
  const getInitialsAvatar = (name: string) => 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1d4ed8&color=fff`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col group relative">
      <button 
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(prop.id);
        }}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center transition border border-slate-100 cursor-pointer"
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

      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
          {prop.tag || 'แนะนำ'}
        </span>
        <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[9px] font-semibold tracking-wide">
          {prop.type}
        </span>
      </div>

      <Link href={`/property/${prop.id}`} className="block flex-grow">
        <div className="relative h-44 overflow-hidden bg-slate-100">
          <Image 
            src={prop.image} 
            alt={prop.title}
            width={320}
            height={176}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>

        <div className="p-4 space-y-2">
          <div className="text-lg font-bold text-blue-700 leading-none">
            {prop.price}
          </div>
          
          <h3 className="text-sm font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {prop.title}
          </h3>

          <p className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
            📍 {prop.districtName && prop.amphureName && prop.provinceName 
              ? `${prop.districtName}, ${prop.amphureName}, ${prop.provinceName}` 
              : prop.location.replace("📍 ", "")}
          </p>

          <div className="flex items-center justify-between text-slate-400 py-1 text-[11px] font-medium">
            <span>🛏️ {prop.bedrooms} นอน</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span>🚿 {prop.bathrooms} น้ำ</span>
            <div className="w-px h-3 bg-slate-200"></div>
            <span>📏 {prop.area} ตร.ม.</span>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Image 
            src={prop.agentImage || getInitialsAvatar(prop.agentName)} 
            alt={prop.agentName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
          <div>
            <div className="text-[10px] font-bold text-slate-700 leading-none">{prop.agentName}</div>
            <div className="text-[8px] text-blue-600 font-medium mt-0.5 uppercase tracking-wider">Verified Agent</div>
          </div>
        </div>

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
