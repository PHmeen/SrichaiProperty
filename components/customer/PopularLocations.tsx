'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

export default function PopularLocations() {
  const { properties, propertiesLoading } = useApp();

  // ดึงและจัดกลุ่มทำเลที่ตั้งที่มีประกาศจริงๆ จาก Database
  const locationGroupsMap: Record<string, { count: number; image: string }> = {};

  properties.forEach((p) => {
    const locName = p.amphureName || p.provinceName || (p.location ? p.location.replace(/📍/g, '').split(',')[0].trim() : '');
    if (!locName) return;

    if (!locationGroupsMap[locName]) {
      locationGroupsMap[locName] = {
        count: 1,
        image: p.image || p.images?.[0] || 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400'
      };
    } else {
      locationGroupsMap[locName].count += 1;
    }
  });

  const dynamicLocations = Object.entries(locationGroupsMap)
    .map(([name, data]) => ({ name, count: data.count, image: data.image }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (propertiesLoading) {
    return (
      <section className="py-10 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
            <p className="text-slate-500 text-xs font-medium">กำลังค้นหาทำเลยอดฮิตจากฐานข้อมูล...</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (dynamicLocations.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
          <p className="text-slate-500 text-xs font-medium">ทำเลที่มีประกาศขาย/เช่ามากที่สุดในระบบขณะนี้</p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {dynamicLocations.map((loc, i) => (
            <Link 
              key={i} 
              href={`/search?q=${encodeURIComponent(loc.name)}`}
              className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
            >
              <Image 
                src={loc.image} 
                alt={loc.name}
                width={240}
                height={176}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <h3 className="text-white text-base font-bold mb-0.5">{loc.name}</h3>
                <p className="text-slate-300 text-[10px] font-semibold">{loc.count} ประกาศ</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
