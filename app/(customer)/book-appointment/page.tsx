'use client';

/**
 * page.tsx (Book Appointment) - หน้าฟอร์มสำหรับส่งจองนัดหมายเข้าชมบ้าน/คอนโดจริง
 * เหมาะสำหรับมือใหม่: หน้านี้แสดงวิธีใช้ Next.js `<Suspense>` ร่วมกับ `useSearchParams` 
 * เพื่อดึงค่า Query String (เช่น ?propertyId=1) มาจับคู่หาบ้านก่อนส่งแบบฟอร์ม
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

// ส่วนฟอร์มย่อยที่จำเป็นต้องรันภายใต้ Suspense เนื่องจากมีการดึงค่าจาก Query URL
function BookAppointmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. ดึงไอดีจาก URL (?propertyId=1) หากไม่มีให้แสดงของชิ้นที่ 1 เป็นค่าเริ่มต้น
  const propertyId = searchParams.get('propertyId') || '1';

  // 2. ประกาศสถานะการป้อนข้อมูลฟอร์ม
  const [selectedDate, setSelectedDate] = useState('2026-07-11');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 - 12:00 น.');
  const [note, setNote] = useState('');

  // 3. ดึงรายการบ้านและฟังก์ชันเพิ่มคิวนัดหมายจาก Context
  const { properties, addAppointment } = useApp();

  // ค้นหารายการอสังหาฯ จากฐานข้อมูลตาม ID
  const property = properties.find(p => p.id === Number(propertyId)) || properties[0];

  // ช่วงเวลานัดหมายที่มีให้เลือก
  const timeSlots = [
    "09:00 - 10:00 น.",
    "10:00 - 12:00 น.",
    "13:00 - 15:00 น.",
    "15:00 - 17:00 น."
  ];

  // ฟังก์ชันยิงข้อมูลฟอร์มบันทึกนัดหมาย
  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    
    // บันทึกลงระบบ Context (ซึ่งจะเซฟลง LocalStorage โดยอัตโนมัติ)
    addAppointment({
      propertyId: property.id,
      date: selectedDate,
      timeSlot: selectedTimeSlot,
      note: note
    });

    alert(`ส่งขอจองนัดหมายสำหรับอสังหาฯ ${property.title} เรียบร้อยแล้ว!`);
    
    // ส่งผู้ใช้กลับไปยังหน้ารายการนัดหมายทั้งหมด
    router.push('/appointments');
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-20">
      
      {/* 🧭 เมนูนำทางด้านบน */}
      <nav className="fixed w-full z-40 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-24"></div>

      <div className="max-w-4xl mx-auto px-4">
        
        {/* ลิงก์กดย้อนกลับ */}
        <div className="mb-6">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1.5 mb-2 transition cursor-pointer">
            &larr; กลับไปหน้ารายละเอียด
          </button>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ทำการนัดหมายเข้าชมสถานที่</h1>
          <p className="text-slate-500 text-xs mt-1">เลือกวันและเวลาที่คุณสะดวก เพื่อเข้าชมสถานที่จริง</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* คอลัมน์ซ้าย: การ์ดพรีวิวข้อมูลของบ้านที่จะนัดหมาย */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
              <div className="h-28 relative">
                <img src={property.image} className="w-full h-full object-cover" alt={property.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              </div>
              <div className="p-4">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 inline-block">{property.type}</span>
                <h3 className="text-slate-900 font-extrabold text-sm leading-tight mb-1">{property.title}</h3>
                <p className="text-base font-extrabold text-blue-700 mb-2">{property.price}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">{property.location}</p>
              </div>
            </div>

            {/* บล็อกผู้ดูแลนายหน้า */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <img src={property.agentImage} className="w-10 h-10 rounded-full object-cover border shadow-sm" alt={property.agentName} />
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase">นายหน้าผู้ดูแล</p>
                  <h4 className="text-xs font-bold text-slate-900">{property.agentName}</h4>
                  <p className="text-[10px] text-emerald-600 font-bold">✓ ยืนยันตัวตนแล้ว</p>
                </div>
              </div>
            </div>
          </div>

          {/* คอลัมน์ขวา: กรอกข้อมูลลงทะเบียนนัดหมาย */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <form onSubmit={handleBooking} className="space-y-4">
              
              {/* เลือกวันที่ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือกวันที่ต้องการนัดชม</label>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium text-xs cursor-pointer" 
                  required 
                />
              </div>

              {/* เลือกสล็อตเวลา */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">เลือกช่วงเวลา (Time Slot)</label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${selectedTimeSlot === slot ? 'border-blue-600 bg-blue-50/50 text-blue-700' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* ข้อความเพิ่มเติม */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">ข้อความถึงนายหน้า (ระบุเงื่อนไขเพิ่มเติม)</label>
                <textarea 
                  rows={3} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ต้องการให้นายหน้าจัดเตรียมเอกสารข้อมูลเพิ่มเติม..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium text-xs resize-none" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition shadow text-xs cursor-pointer"
              >
                ยืนยันการนัดเข้าชม
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

// หุ้มฟอร์มนำเข้าด้วย Suspense เพื่อรองรับ Next.js Dynamic Client Rendering
export default function BookAppointmentPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500">กำลังโหลดฟอร์มนัดหมาย...</div>}>
      <BookAppointmentForm />
    </Suspense>
  );
}
