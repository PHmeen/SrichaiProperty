'use client';

/**
 * page.tsx (Book Appointment Redesigned) - หน้าฟอร์มทำการนัดหมายเข้าชมบ้านจริง
 * ปรับปรุง UI ให้พรีเมียม สวยงาม สะอาดสายตา และทำงานร่วมกับระบบฐานข้อมูลจริง 100% ตามรูปภาพอ้างอิง
 */

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';

function BookAppointmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. ดึงไอดีจาก URL (?propertyId=...)
  const propertyId = searchParams.get('propertyId');

  const today = new Date();
  
  // สถานะเก็บเดือน/ปีปัจจุบันที่กำลังเปิดดูในปฏิทิน
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // สถานะเก็บวันที่ถูกเลือกจริงในรูป YYYY-MM-DD (เริ่มต้นเป็นวันพรุ่งนี้)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('รอบบ่าย (13:00 - 17:00 น.)');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 3. ดึงข้อมูลอสังหาริมทรัพย์
  const { properties } = useApp();
  const property = properties.find(p => String(p.id) === String(propertyId)) || properties[0];

  // รายละเอียดวันหยุดและช่วงเวลาทำการจำลอง
  const holidayDays = [17]; // วันหยุดพิเศษ (สมมุติแค่วันที่ 17 มีนาคม 2026 ตามรูปอ้างอิง)

  // เดือนภาษาไทย
  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // ฟังก์ชันเลื่อนปฏิทินไปเดือนก่อนหน้า
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  // ฟังก์ชันเลื่อนปฏิทินไปเดือนถัดไป
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // ฟังก์ชันจัดฟอร์แมตวันภาษาไทยสำหรับพรีวิว
  const getThaiPreviewDate = () => {
    try {
      const parts = selectedDateStr.split('-');
      const d = parseInt(parts[2]);
      const m = parseInt(parts[1]) - 1;
      return `วันที่ ${d} ${monthNamesTH[m].substring(0, 3)}.`;
    } catch {
      return '';
    }
  };

  // ฟังก์ชันส่งนัดหมายเข้าฐานข้อมูลจริง
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: Number(property.id),
          date: selectedDateStr,
          timeSlot: selectedTimeSlot,
          note: note
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถทำนัดหมายได้');
      }

      alert(`ส่งขอจองนัดหมายสำหรับอสังหาฯ ${property.title} เรียบร้อยแล้ว!`);
      router.push('/appointments');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  // โหลดหน้าจอหมุนกรณีข้อมูลยังไม่พร้อมใช้งาน
  if (!properties || properties.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // คำนวณวันแรกของสัปดาห์ในเดือนนั้นๆ (0 = อาทิตย์, 1 = จันทร์, ...)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // คำนวณวันทั้งหมดในเดือนนั้นๆ
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  return (
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-24 pt-12">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* ลิงก์กดย้อนกลับ & หัวข้อใหญ่ */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-slate-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1 mb-2 transition-colors cursor-pointer group"
          >
            &lt; กลับไปหน้ารายละเอียด
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">ทำการนัดหมาย</h1>
          <p className="text-slate-500 text-xs mt-0.5">เลือกวันและเวลาที่คุณสะดวก เพื่อเข้าชมสถานที่จริง</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==================================================== */}
          {/* 🛠️ คอลัมน์ซ้าย: ข้อมูลพรีวิวบ้าน & นายหน้า                  */}
          {/* ==================================================== */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* การ์ดรายละเอียดทรัพย์ */}
            <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-sm">
              <div className="h-44 relative bg-slate-100">
                <img src={property.image} className="w-full h-full object-cover" alt={property.title} />
                <span className="absolute top-3 left-3 bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide shadow-sm">
                  {property.tag || 'ขายด่วน'}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block">
                  {property.type}
                </span>
                <h3 className="text-slate-900 font-extrabold text-sm leading-snug line-clamp-2">
                  {property.title}
                </h3>
                <p className="text-lg font-black text-blue-700 leading-none pt-1">
                  {property.price}
                </p>
                <p className="text-slate-400 text-[10px] font-bold flex items-center gap-1 pt-1.5 border-t border-slate-100">
                  📍 {property.districtName && property.amphureName && property.provinceName 
                    ? `${property.districtName}, ${property.amphureName}, ${property.provinceName}` 
                    : property.location.replace("📍 ", "")}
                </p>
              </div>
            </div>

            {/* การ์ดผู้ดูแลนายหน้า */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={property.agentImage} 
                  className="w-11 h-11 rounded-full object-cover shadow-sm border border-slate-100" 
                  alt={property.agentName} 
                />
                <div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">นายหน้าผู้ดูแล</p>
                  <h4 className="text-xs font-black text-slate-800">{property.agentName}</h4>
                  <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block">
                    ✓ ยืนยันตัวตนแล้ว
                  </span>
                </div>
              </div>

              {/* ตารางเวลาทำงานของนายหน้า */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                  <span>🕒</span> เวลาทำการของนายหน้า
                </div>
                <ul className="text-[10px] font-semibold text-slate-500 space-y-1 pl-4 list-disc">
                  <li>สะดวกเฉพาะ: วันเสาร์-อาทิตย์</li>
                  <li>สะดวก: วันหยุดนักขัตฤกษ์</li>
                  <li className="text-red-500">ไม่รับนัดวันจันทร์-ศุกร์</li>
                </ul>
              </div>
            </div>

            {/* กล่องรายละเอียดชี้แจงสำคัญ */}
            <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex items-start gap-2.5">
              <span className="text-blue-500 text-base leading-none">ℹ️</span>
              <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
                การนัดหมายนี้เป็นการส่งคำขอเบื้องต้น นายหน้าจะทำการติดต่อกลับเพื่อยืนยันเวลาและวันเข้าชมที่แน่นอนอีกครั้งหนึ่ง
              </p>
            </div>
          </div>

          {/* ==================================================== */}
          {/* 🛠️ คอลัมน์ขวา: ฟอร์มปฏิทินนัดหมายสุดพรีเมียม                 */}
          {/* ==================================================== */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-sm space-y-8">
            <form onSubmit={handleBookingSubmit} className="space-y-8">
              
              {/* ขั้นตอนที่ 1: เลือกวันที่ */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">1</span>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">เลือกวันที่สะดวก</label>
                </div>

                {/* กล่องปฏิทินสไตล์พรีเมียม */}
                <div className="border border-slate-200 rounded-3xl p-5 max-w-lg mx-auto bg-white shadow-sm">
                  {/* แผงควบคุมเลื่อนเดือน */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <button type="button" onClick={handlePrevMonth} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">&lt;</button>
                    <span className="text-xs font-black text-slate-800">{monthNamesTH[currentMonth]} {currentYear}</span>
                    <button type="button" onClick={handleNextMonth} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">&gt;</button>
                  </div>

                  {/* หัวแถววันในสัปดาห์ */}
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
                    <span className="text-red-500">อา</span>
                    <span className="text-slate-400">จ</span>
                    <span className="text-slate-400">อ</span>
                    <span className="text-slate-400">พ</span>
                    <span className="text-slate-400">พฤ</span>
                    <span className="text-slate-400">ศ</span>
                    <span className="text-blue-500">ส</span>
                  </div>

                  {/* ตารางวันทั้งหมด */}
                  <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                    {/* เติมส่วนเว้นสำหรับวันแรกของเดือน */}
                    {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="w-8 h-8"></div>
                    ))}

                    {/* วันที่ 1 ถึงวันสุดท้ายของเดือน */}
                    {Array.from({ length: totalDaysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isSelected = selectedDateStr === dateStr;
                      
                      // ค้นหาว่าเป็นวันอะไรในสัปดาห์
                      const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      // วันหยุดพิเศษจำลอง
                      const isHoliday = holidayDays.includes(dayNum) && currentMonth === 2 && currentYear === 2026;
                      
                      // ค้นหาว่าเป็นวันในอดีตหรือไม่ (ห้ามเลือก)
                      const cellDate = new Date(currentYear, currentMonth, dayNum);
                      const todayStart = new Date();
                      todayStart.setHours(0, 0, 0, 0);
                      const isPast = cellDate < todayStart;

                      // วันธรรมดาไม่รับนัด (วันจันทร์-ศุกร์ที่ไม่ใช่วันหยุดพิเศษ) ห้ามจอง
                      const isWeekdayDisabled = !isWeekend && !isHoliday;
                      const isDisabled = isPast || isWeekdayDisabled;

                      let dayClass = "w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ";
                      
                      if (isDisabled) {
                        dayClass += "text-slate-200 cursor-not-allowed";
                      } else if (isSelected) {
                        dayClass += "bg-blue-600 text-white shadow-md active:scale-95 cursor-pointer";
                      } else if (isHoliday) {
                        dayClass += "border border-amber-500 text-amber-500 hover:bg-amber-50 cursor-pointer";
                      } else if (isWeekend) {
                        dayClass += "border border-slate-200 text-slate-700 hover:border-blue-500 hover:bg-slate-50 cursor-pointer";
                      } else {
                        dayClass += "text-slate-400 hover:bg-slate-50 hover:text-slate-700 cursor-pointer";
                      }

                      return (
                        <div key={dayNum} className="relative">
                          <button
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setSelectedDateStr(dateStr)}
                            className={dayClass}
                          >
                            {dayNum}
                          </button>
                          {/* จุดบลูตกแต่งของวันเดิม */}
                          {dayNum === 11 && currentMonth === 2 && currentYear === 2026 && (
                            <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* อธิบายสถานะปฏิทิน */}
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-slate-100 text-[9px] font-black text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-slate-300"></span> ว่าง</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span> เลือก</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> วันหยุดพิเศษ</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> คิวเต็มทั้งวัน</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> ไม่รับนัดวันธรรมดา</span>
                  </div>
                </div>
              </div>

              {/* ขั้นตอนที่ 2: เลือกรอบเวลา */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">2</span>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider">เลือกตอบรอบเวลา</label>
                  </div>
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {getThaiPreviewDate()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* รอบเช้า */}
                  <button
                    type="button"
                    onClick={() => setSelectedTimeSlot('รอบเช้า (09:00 - 12:00 น.)')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                      selectedTimeSlot.includes('รอบเช้า')
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs">รอบเช้า</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">09:00 - 12:00</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-bold">✓ ว่างให้จอง</span>
                  </button>

                  {/* รอบบ่าย */}
                  <button
                    type="button"
                    onClick={() => setSelectedTimeSlot('รอบบ่าย (13:00 - 17:00 น.)')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex justify-between items-center ${
                      selectedTimeSlot.includes('รอบบ่าย')
                        ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs">รอบบ่าย</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">13:00 - 17:00</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-bold">✓ ว่างให้จอง</span>
                  </button>
                </div>
              </div>

              {/* ขั้นตอนที่ 3: ข้อความเพิ่มเติม & ยืนยัน */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">3</span>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">ข้อความเพิ่มเติม & ยืนยัน</label>
                </div>

                <textarea 
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ฝากข้อความถึงนายหน้า (เช่น ขอไปเจอกันที่หน้าโครงการหมู่บ้านเลย).."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all text-slate-800 font-bold text-xs resize-none placeholder-slate-400"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {submitting ? '⏳ กำลังบันทึกข้อมูลนัดชม...' : 'ยืนยันการนัดหมาย'}
                </button>
              </div>

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function BookAppointmentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <BookAppointmentForm />
    </Suspense>
  );
}
