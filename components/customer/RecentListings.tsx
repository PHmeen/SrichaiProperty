'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Property } from '@/types';

interface RecentListingsProps {
  properties: Property[];
  favorites: (string | number)[];
  toggleFavorite: (id: string | number) => void;
}

export default function RecentListings({ properties, favorites, toggleFavorite }: RecentListingsProps) {
  return (
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {properties.map((prop) => {
            const isFav = favorites.includes(prop.id);
            return (
              <div 
                key={prop.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 relative group cursor-pointer"
              >
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(prop.id);
                  }} 
                  className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm"
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
                
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                  <span className={`${prop.tagBg} text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm`}>
                    {prop.tag}
                  </span>
                  <span className="bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                    {prop.type}
                  </span>
                </div>
                
                <div className="relative h-44 overflow-hidden">
                  <Image 
                    src={prop.image} 
                    alt={prop.title}
                    width={320}
                    height={176}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                <div className="p-4">
                  <div className="text-xl font-extrabold text-blue-700 mb-1">{prop.price}</div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{prop.title}</h3>
                  <p className="text-slate-500 text-xs mb-4 flex items-center">{prop.location}</p>
                  
                  <div className="flex items-center justify-between text-slate-600 border-t border-b border-slate-100 py-2.5 mb-3 bg-slate-50 px-3 rounded-lg text-xs">
                    <span>🛏️ {prop.bedrooms}</span>
                    <div className="w-px h-5 bg-slate-200" />
                    <span>🚿 {prop.bathrooms}</span>
                    <div className="w-px h-5 bg-slate-200" />
                    <span>📏 {prop.area} ตร.ม.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Image 
                      src={prop.agentImage} 
                      alt={prop.agentName}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border border-white shadow-sm"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{prop.agentName}</div>
                      <div className="text-[10px] text-slate-500">Srichai Agent</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
