'use client';

/**
 * page.tsx (Book Appointment) - หน้าฟอร์มสำหรับส่งจองนัดหมายเข้าชมบ้าน/คอนโดจริง
 * เหมาะสำหรับมือใหม่: หน้านี้แสดงวิธีใช้ Next.js `<Suspense>` ร่วมกับ `useSearchParams` 
 * เพื่อดึงค่า Query String (เช่น ?propertyId=1) มาจับคู่หาบ้านก่อนส่งแบบฟอร์ม
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';

// ส่วนฟอร์มย่อยที่จำเป็นต้องรันภายใต้ Suspense เนื่องจากมีการดึงค่าจาก Query URL
function BookAppointmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. ดึงไอดีจาก URL (?propertyId=...)
  const propertyId = searchParams.get('propertyId');

  // 2. ประกาศสถานะการป้อนข้อมูลฟอร์ม
  const [selectedDate, setSelectedDate] = useState('2026-07-11');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('10:00 - 12:00 น.');
  const [note, setNote] = useState('');

  // 3. ดึงรายการบ้านและฟังก์ชันเพิ่มคิวนัดหมายจาก Context
  const { properties, addAppointment } = useApp();

  // ค้นหารายการอสังหาฯ จากฐานข้อมูลตาม ID
  const property = properties.find(p => String(p.id) === String(propertyId)) || properties[0];

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
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-24 pt-12">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* ลิงก์กดย้อนกลับ */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-slate-500 hover:text-blue-600 font-extrabold text-xs flex items-center gap-1.5 mb-3 transition-colors cursor-pointer group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">&larr;</span> กลับไปหน้ารายละเอียด
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ทำการนัดหมายเข้าชมสถานที่</h1>
          <p className="text-slate-500 text-xs mt-1">เลือกวันและเวลาที่คุณสะดวก เพื่ออำนวยความสะดวกในการเข้าชมสถานที่จริง</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* คอลัมน์ซ้าย: การ์ดพรีวิวข้อมูลของบ้านที่จะนัดหมาย */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200/60">
              <div className="h-40 relative">
                <img src={property.image} className="w-full h-full object-cover" alt={property.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-1 inline-block">{property.type}</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-slate-900 font-extrabold text-base leading-snug mb-1.5 line-clamp-2">{property.title}</h3>
                <p className="text-lg font-black text-blue-700 mb-3">{property.price}</p>
                <div className="flex items-center text-slate-500 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="mr-1.5">📍</span>
                  <span className="line-clamp-1">{property.location.replace("📍 ", "")}</span>
                </div>
              </div>
            </div>

            {/* บล็อกผู้ดูแลนายหน้า */}
            <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-3xl p-5 shadow-sm border border-slate-200/60">
              <div className="flex items-center gap-3.5">
                <img src={property.agentImage} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md" alt={property.agentName} />
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">นายหน้าผู้ดูแล</p>
                  <h4 className="text-xs font-black text-slate-800">{property.agentName}</h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-emerald-500 text-[10px]">●</span>
                    <p className="text-[10px] text-emerald-600 font-extrabold">ยืนยันตัวตนแล้ว</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* คอลัมน์ขวา: กรอกข้อมูลลงทะเบียนนัดหมาย */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm">
            <form onSubmit={handleBooking} className="space-y-6">
              
              {/* เลือกวันที่ */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">เลือกวันที่ต้องการนัดชม</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all text-slate-800 font-bold text-xs cursor-pointer" 
                    required 
                  />
                </div>
              </div>

              {/* เลือกสล็อตเวลา */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">เลือกช่วงเวลา (Time Slot)</label>
                <div className="grid grid-cols-2 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`px-4 py-3.5 rounded-xl border text-xs font-extrabold text-center transition-all cursor-pointer ${
                        selectedTimeSlot === slot 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-slate-600'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* ข้อความเพิ่มเติม */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">ข้อความถึงนายหน้า (ระบุเงื่อนไขเพิ่มเติม)</label>
                <textarea 
                  rows={4} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ต้องการให้นายหน้าจัดเตรียมเอกสารข้อมูลเพิ่มเติม หรือประสงค์เข้าชมห้องตัวอย่างจริง..." 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all text-slate-800 font-medium text-xs resize-none placeholder-slate-400" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3.5 px-6 rounded-xl transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  📅 ยืนยันการส่งคำขอนัดเข้าชม
                </button>
              </div>
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
