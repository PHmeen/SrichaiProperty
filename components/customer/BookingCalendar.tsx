'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์ปฏิทินเลือกวันนัดหมาย (BookingCalendar Component)
 * /components/customer/BookingCalendar.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. คำนวณและแสดงผลตารางปฏิทินประจำเดือน พร้อมปุ่มเลื่อนเดือนถอยหลัง/เดินหน้า
 * 2. ตรวจสอบสถานะของแต่ละวันในเดือน (วันอดีต, วันที่นายหน้าเปิดว่าง, วันหยุดนักขัตฤกษ์)
 * 3. ไฮไลต์สีตามสถานะ:
 *    - 🟩 สีเขียว = วันที่นายหน้าเปิดว่างให้จองได้ (Available)
 *    - 🟦 สีน้ำเงิน = วันที่ผู้ใช้กำลังคลิกเลือกอยู่ปัจจุบัน (Selected)
 *    - 🟨 สีเหลือง = วันหยุดพิเศษ/นักขัตฤกษ์ (Holiday)
 *    - ⬜ สีเทา = วันในอดีต หรือ วันที่นายหน้าไม่ได้เปิดว่าง (Disabled)
 * ==============================================================================
 */

import React, { useMemo } from 'react';

// อินเทอร์เฟซกำหนด Props ที่คอมโพเนนต์นี้รับเข้ามาจากหน้าแม่ (BookAppointmentPage)
interface BookingCalendarProps {
  currentYear: number;                                          // ปีที่เปิดดูอยู่ (ค.ศ. เช่น 2026)
  currentMonth: number;                                         // เดือนที่เปิดดูอยู่ (0 = ม.ค., 11 = ธ.ค.)
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>; // ฟังก์ชันอัปเดตปี
  setCurrentMonth: React.Dispatch<React.SetStateAction<number>>;// ฟังก์ชันอัปเดตเดือน
  selectedDateStr: string;                                      // วันที่ผู้ใช้เลือกในรูปแบบ "YYYY-MM-DD"
  setSelectedDateStr: (date: string) => void;                   // ฟังก์ชันบันทึกวันที่เลือก
  holidays: string[];                                           // รายการวันหยุดในรูปแบบอาร์เรย์ของ "YYYY-MM-DD"
  availableDates: string[];                                     // รายการวันที่เปิดว่างจริงในรูปแบบอาร์เรย์ของ "YYYY-MM-DD"
}

// อาร์เรย์ชื่อเดือนภาษาไทยสำหรับแสดงผลบนหัวปฏิทิน
const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function BookingCalendar({
  currentYear,
  currentMonth,
  setCurrentYear,
  setCurrentMonth,
  selectedDateStr,
  setSelectedDateStr,
  holidays,
  availableDates
}: BookingCalendarProps) {
  
  // ----------------------------------------------------------------------------
  // 1. MONTH NAVIGATION ALGORITHM (อัลกอริทึมการเลื่อนเดือน)
  // ----------------------------------------------------------------------------
  // ใช้ JavaScript Native Date ช่วยคำนวณทดเดือนและข้ามปีให้อัตโนมัติ (delta = -1 เลื่อนถอยหลัง, +1 เลื่อนไปข้างหน้า)
  const changeMonth = (delta: number) => {
    const d = new Date(currentYear, currentMonth + delta, 1);
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  };

  // ----------------------------------------------------------------------------
  // 2. CALENDAR GRID CALCULATIONS (การคำนวณโครงสร้างตารางปฏิทิน)
  // ----------------------------------------------------------------------------
  // firstDayOfWeek: หาว่าวันที่ 1 ของเดือนตรงกับวันอะไรในสัปดาห์ (0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  
  // totalDaysInMonth: หาว่าเดือนนี้มีทั้งหมดกี่วัน (โดยส่ง day = 0 ของเดือนถัดไป)
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // ----------------------------------------------------------------------------
  // 3. OPTIMIZED SEARCH LOOKUP (แปลงเป็น Set เพื่อเพิ่มความเร็วในการค้นหาเป็น O(1))
  // ----------------------------------------------------------------------------
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);

  // คำนวณวันเริ่มต้นของวันนี้ (ตั้งค่าเวลาเป็น 00:00:00) เพื่อนำไปเช็คเปรียบเทียบวันในอดีต
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // ----------------------------------------------------------------------------
  // 4. RENDERING SECTION
  // ----------------------------------------------------------------------------
  return (
    <div className="border border-slate-200 rounded-3xl p-5 max-w-lg mx-auto bg-white shadow-sm">
      
      {/* 4.1 แผงควบคุมเลื่อนเดือน (Header Control) */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button type="button" onClick={() => changeMonth(-1)} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">
          &lt;
        </button>
        {/* แสดงชื่อเดือนภาษาไทย + พ.ศ. (ค.ศ. + 543) */}
        <span className="text-xs font-black text-slate-800">
          {MONTH_NAMES_TH[currentMonth]} {currentYear + 543}
        </span>
        <button type="button" onClick={() => changeMonth(1)} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">
          &gt;
        </button>
      </div>

      {/* 4.2 หัวแถววันในสัปดาห์ (Days of Week Header) */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
        <span className="text-red-500">อา</span>
        <span className="text-slate-400">จ</span>
        <span className="text-slate-400">อ</span>
        <span className="text-slate-400">พ</span>
        <span className="text-slate-400">พฤ</span>
        <span className="text-slate-400">ศ</span>
        <span className="text-blue-500">ส</span>
      </div>

      {/* 4.3 ตารางแสดงวันที่ทั้งหมดในเดือน (Calendar Days Grid) */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
        
        {/* เติมบล็อกช่องว่างสำหรับวันก่อนวันที่ 1 ของเดือน */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="w-8 h-8" />
        ))}

        {/* วนลูปสร้างปุ่มกดตั้งแต่วันที่ 1 ถึงวันสุดท้ายของเดือน */}
        {Array.from({ length: totalDaysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          // แปลงเป็นข้อความวันที่รูปแบบ "YYYY-MM-DD" (เช่น 2026-08-09)
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          
          const isSelected = selectedDateStr === dateStr;  // เป็นวันที่กำลังคลิกเลือกอยู่หรือไม่
          const isHoliday = holidaySet.has(dateStr);       // เป็นวันหยุดนักขัตฤกษ์หรือไม่
          const isAvailable = availableSet.has(dateStr);   // เป็นวันที่นายหน้าเปิดว่างจริงหรือไม่
          const isPast = new Date(currentYear, currentMonth, dayNum) < todayStart; // เป็นวันในอดีตหรือไม่
          
          // อนุญาตให้กดเลือกได้เฉพาะวันที่เปิดว่างจริง และต้องไม่ใช่วันในอดีต
          const isDisabled = isPast || !isAvailable;

          // กำหนด Class การแต่งสไตล์ตามสถานะของวัน
          let dayClass = "w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ";

          if (isSelected) {
            dayClass += "bg-blue-600 text-white shadow-md active:scale-95 cursor-pointer";
          } else if (isHoliday) {
            dayClass += `border border-amber-500 text-amber-500 bg-amber-50/50 ${!isDisabled ? 'hover:bg-amber-100 cursor-pointer' : 'cursor-not-allowed'}`;
          } else if (isDisabled) {
            dayClass += "text-slate-200 cursor-not-allowed";
          } else {
            dayClass += "border border-emerald-300 text-emerald-700 hover:bg-emerald-50 cursor-pointer";
          }

          return (
            <button
              key={dayNum}
              type="button"
              disabled={isDisabled}
              onClick={() => setSelectedDateStr(dateStr)}
              className={dayClass}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      {/* 4.4 คำอธิบายสัญลักษณ์สีของปฏิทิน (Legend Indicator) */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-slate-100 text-[9px] font-black text-slate-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-emerald-300" /> นายหน้าเปิดว่าง</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> เลือก</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-amber-500" /> วันหยุดพิเศษ</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-200" /> ไม่เปิดว่าง</span>
      </div>

    </div>
  );
}