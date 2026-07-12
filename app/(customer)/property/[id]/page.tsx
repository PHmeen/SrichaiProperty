'use client';

/**
 * page.tsx (Property Detail) - หน้ารายละเอียดเชิงลึกของอสังหาริมทรัพย์รายชิ้น
 * เหมาะสำหรับมือใหม่: หน้านี้ดึง ID มาจาก URL parameters (เช่น /property/1)
 * แล้วนำมาสืบค้นข้อมูลของอสังหาฯ ตัวจริงจาก useApp มานำเสนอรายละเอียด
 */

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function PropertyDetailPage() {
  // === 1. ดึงค่า ID ของทรัพย์จากที่อยู่ URL เช่น /property/1 ===
  const params = useParams();
  const id = params.id || '1';

  // === 2. ดึงเมธอดข้อมูลอสังหาฯ และโปรไฟล์ปัจจุบัน ===
  const { properties, favorites, toggleFavorite } = useApp();

  // ค้นหารายการอสังหาฯ ที่มีรหัสไอดีตรงกัน
  const property = properties.find(p => p.id === Number(id)) || properties[0];
  // ตรวจเช็คว่าอสังหาฯ หลังนี้เป็นรายการโปรดที่บันทึกหัวใจไว้หรือไม่
  const isSaved = favorites.includes(property.id);

  // อาเรย์รูปภาพเพิ่มเติมสำหรับนำมาแสดงใน Photo Gallery Grid
  const images = [
    property.image,
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ];

  // ฟังก์ชันตัวช่วยในการแชร์คัดลอกลิงก์หน้าปัจจุบัน
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert("คัดลอกลิงก์ไปยังคลิปบอร์ดเรียบร้อยแล้ว!");
    }
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-24 lg:pb-0">
      
      {/* 📍 แถบเส้นทางตำแหน่ง (Breadcrumb Sticky Bar) */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex justify-between items-center text-xs">
          <nav className="flex text-slate-500 font-medium whitespace-nowrap overflow-x-auto items-center">
            <Link href="/home" className="hover:text-blue-600 transition">หน้าแรก</Link><span className="mx-2">/</span>
            <Link href="/search" className="hover:text-blue-600 transition">{property.type} ทั้งหมด</Link><span className="mx-2">/</span>
            <span className="text-slate-900 font-bold truncate">{property.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 text-slate-700 border rounded-lg font-bold transition cursor-pointer">
              แชร์
            </button>
            <button onClick={() => toggleFavorite(property.id)} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-100 text-slate-700 border rounded-lg font-bold transition cursor-pointer">
              <span className={isSaved ? "text-red-500" : "text-slate-400"}>❤️</span> {isSaved ? "บันทึกแล้ว" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>

      {/* 📦 เนื้อหาหลักแสดงรูปและส่วนจอง */}
      <main className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        
        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-2xl overflow-hidden shadow-sm relative">
          <div className="md:col-span-2 md:row-span-2 relative aspect-[4/3] md:aspect-auto">
            <img src={images[0]} alt="รูปหลัก" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative aspect-[4/3]">
            <img src={images[1]} alt="รูปประกอบ 1" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative aspect-[4/3]">
            <img src={images[2]} alt="รูปประกอบ 2" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative aspect-[4/3]">
            <img src={images[3]} alt="รูปประกอบ 3" className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative aspect-[4/3]">
            <img src={images[4]} alt="รูปประกอบ 4" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* ส่วนแบ่งคอลัมน์ซ้าย-ขวา */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ฝั่งซ้าย: ข้อมูลบ้านพักอาศัยและสเปค */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{property.type}</span>
                <h1 className="text-xl font-extrabold text-slate-900 mt-2 font-sans">{property.title}</h1>
                <p className="text-slate-500 text-xs mt-1">{property.location}</p>
              </div>

              {/* ตารางแสดงขนาดห้อง/ตารางเมตร */}
              <div className="border-t border-b border-slate-100 py-3 grid grid-cols-3 text-center text-slate-600 bg-slate-50 rounded-xl text-xs font-medium">
                <div>
                  <p className="text-slate-400">ห้องนอน</p>
                  <p className="font-bold text-sm text-slate-800">{property.bedrooms} ห้อง</p>
                </div>
                <div className="border-l border-r border-slate-200">
                  <p className="text-slate-400">ห้องน้ำ</p>
                  <p className="font-bold text-sm text-slate-800">{property.bathrooms} ห้อง</p>
                </div>
                <div>
                  <p className="text-slate-400">พื้นที่ใช้สอย</p>
                  <p className="font-bold text-sm text-slate-800">{property.area} ตร.ม.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900">รายละเอียดเพิ่มเติม</h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  อสังหาริมทรัพย์ตกแต่งสวยงามพร้อมเข้าอยู่ โครงสร้างมั่นคงแข็งแรง เดินทางสะดวกสบายใกล้หาดใหญ่พลาซ่าและมหาวิทยาลัย มีระบบรักษาความปลอดภัย 24 ชั่วโมง เหมาะแก่การอยู่อาศัยเป็นครอบครัว
                </p>
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: กล่องแสดงราคานำเสนอและทางเลือกติดต่อจอง */}
          <div className="lg:col-span-1">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 sticky top-36">
              <div className="text-center pb-3 border-b border-slate-100">
                <p className="text-slate-400 text-xs">ราคาเสนอขาย</p>
                <div className="text-2xl font-black text-blue-700 my-1 font-sans">{property.price}</div>
                <p className="text-[10px] text-slate-500">ค่าโอนคนละครึ่ง (50/50)</p>
              </div>

              {/* รายละเอียดตัวแทนนายหน้า */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <img src={property.agentImage} className="w-10 h-10 rounded-full border border-white shadow-sm object-cover" alt="Agent" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{property.agentName}</h4>
                  <p className="text-[10px] text-slate-500">นายหน้าผู้ดูแลโดยตรง</p>
                </div>
              </div>

              <div className="space-y-2">
                <Link 
                  href={`/book-appointment?propertyId=${id}`}
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow"
                >
                  📅 นัดหมายเข้าชมสถานที่จริง
                </Link>
                <Link 
                  href={`/chat?propertyId=${id}`}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 text-xs"
                >
                  💬 แชทสอบถามรายละเอียด
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
