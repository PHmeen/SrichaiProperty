'use client';

import React from 'react';

interface BookingCalendarProps {
  currentYear: number;
  currentMonth: number;
  setCurrentYear: React.Dispatch<React.SetStateAction<number>>;
  setCurrentMonth: React.Dispatch<React.SetStateAction<number>>;
  selectedDateStr: string;
  setSelectedDateStr: (date: string) => void;
  holidays: string[];
}

export default function BookingCalendar({
  currentYear,
  currentMonth,
  setCurrentYear,
  setCurrentMonth,
  selectedDateStr,
  setSelectedDateStr,
  holidays
}: BookingCalendarProps) {
  // เดือนภาษาไทย
  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // เลื่อนเดือนก่อนหน้า
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  // เลื่อนเดือนถัดไป
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // คำนวณวันแรกของสัปดาห์ในเดือนนั้นๆ (0 = อาทิตย์, 1 = จันทร์, ...)
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // คำนวณวันทั้งหมดในเดือนนั้นๆ
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  return (
    <div className="border border-slate-200 rounded-3xl p-5 max-w-lg mx-auto bg-white shadow-sm">
      {/* แผงควบคุมเลื่อนเดือน */}
      <div className="flex items-center justify-between mb-4 px-2">
        <button 
          type="button" 
          onClick={handlePrevMonth} 
          className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
        >
          &lt;
        </button>
        <span className="text-xs font-black text-slate-800">
          {monthNamesTH[currentMonth]} {currentYear + 543}
        </span>
        <button 
          type="button" 
          onClick={handleNextMonth} 
          className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer"
        >
          &gt;
        </button>
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
          
          const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

          const isHoliday = holidays.includes(dateStr);
          
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
  );
}
