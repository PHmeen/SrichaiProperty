'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { useApp } from '@/context/AppContext';

interface SavedProperty {
  id: string;
  title: string;
  price: string;
  type: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  agentName: string;
  savedAt: string;
}

export default function SavedPropertiesPage() {
  const { toggleFavorite } = useApp();
  const [items, setItems] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSaved = () => {
    fetch('/api/user/saved-properties')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setItems(data.savedProperties || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleRemove = async (propertyId: string) => {
    try {
      toggleFavorite(propertyId);
      setItems(prev => prev.filter(i => i.id !== propertyId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col pt-16">
      <div className="pt-8 pb-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shadow-sm border border-rose-100 shrink-0">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">รายการอสังหาฯ ที่คุณถูกใจ</h1>
              <p className="text-slate-500 text-xs">รายการบ้านและคอนโดมิเนียมที่คุณกดบันทึกไว้อย่างปลอดภัย</p>
            </div>
          </div>
          <span className="text-xs font-black bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full border border-rose-100">
            ทั้งหมด {items.length} รายการ
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-grow">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-bold">กำลังโหลดรายการโปรดของคุณ...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm max-w-md mx-auto my-12 space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">ยังไม่มีรายการโปรด</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              คุณสามารถกดปุ่มหัวใจที่การ์ดอสังหาริมทรัพย์ที่คุณสนใจเพื่อบันทึกเก็บไว้ดูย้อนหลังได้ตลอดเวลา
            </p>
            <Link href="/search" className="inline-block px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-extrabold rounded-xl text-xs shadow-md transition">
              🔍 ค้นหาอสังหาริมทรัพย์เลย
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition">
                <div className="relative h-48 bg-slate-100">
                  <Image src={item.image} alt={item.title} width={400} height={250} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-rose-500 shadow-md hover:bg-white transition cursor-pointer"
                    title="ลบออกจากรายการโปรด"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                  <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md">
                    {item.type}
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-left">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1 mb-1">{item.title}</h3>
                    <p className="text-blue-600 font-black text-base">{item.price}</p>
                    <p className="text-slate-500 text-xs mt-1">📍 {item.location}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-t border-slate-100 pt-3">
                    <span>🛏️ {item.bedrooms} นอน</span>
                    <span>🚿 {item.bathrooms} น้ำ</span>
                    <span>⛶ {item.area} ตร.ม.</span>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Link href={`/properties/${item.id}`} className="flex-1 text-center py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-extrabold rounded-xl text-xs transition">
                      ดูรายละเอียด
                    </Link>
                    <Link href={`/properties/${item.id}/book-appointment`} className="flex-1 text-center py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-sm">
                      📅 จองนัดดูบ้าน
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
