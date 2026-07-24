'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AvailabilitySlot {
  id: string;
  date: string; // YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon';
  isBooked: boolean;
}

export default function AgentAvailabilityPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/availability?year=${currentYear}&month=${currentMonth + 1}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSlots(data.availabilities);
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getSlotsForDate = (dateStr: string) => slots.filter(s => s.date === dateStr);

  const toggleSlot = async (dateStr: string, timeSlot: 'morning' | 'afternoon') => {
    const existing = getSlotsForDate(dateStr).find(s => s.timeSlot === timeSlot);

    if (existing?.isBooked) {
      alert('ช่วงเวลานี้มีลูกค้าจองไว้แล้ว ไม่สามารถปิดได้');
      return;
    }

    setSaving(true);
    try {
      if (existing) {
        const res = await fetch('/api/agent/availability', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, timeSlot }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'ปิดวันว่างล้มเหลว');
      } else {
        const res = await fetch('/api/agent/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, timeSlot }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'เปิดวันว่างล้มเหลว');
      }
      await fetchAvailability();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSaving(false);
    }
  };

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const selectedSlots = selectedDateStr ? getSlotsForDate(selectedDateStr) : [];
  const morningSlot = selectedSlots.find(s => s.timeSlot === 'morning');
  const afternoonSlot = selectedSlots.find(s => s.timeSlot === 'afternoon');

  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      <div className="mb-6">
        <h1 className="text-lg font-black text-slate-800">📅 ตั้งค่าวันว่างสำหรับนัดหมายดูบ้าน</h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          เลือกวันที่ในปฏิทิน แล้วเปิด/ปิดช่วงเวลาที่คุณสะดวกให้ลูกค้าจองเข้าชมบ้าน
        </p>
      </div>

      <div className="border border-slate-200 rounded-3xl p-5 bg-white shadow-sm">
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

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
          <span className="text-red-500">อา</span>
          <span className="text-slate-400">จ</span>
          <span className="text-slate-400">อ</span>
          <span className="text-slate-400">พ</span>
          <span className="text-slate-400">พฤ</span>
          <span className="text-slate-400">ศ</span>
          <span className="text-amber-500">ส</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="w-9 h-9"></div>
          ))}

          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDateStr === dateStr;

            const cellDate = new Date(currentYear, currentMonth, dayNum);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const isPast = cellDate < todayStart;

            const daySlots = getSlotsForDate(dateStr);
            const hasAvailable = daySlots.length > 0;
            const hasBooked = daySlots.some(s => s.isBooked);

            let dayClass = "w-9 h-9 flex items-center justify-center mx-auto rounded-full transition-all relative ";

            if (isPast) {
              dayClass += "text-slate-200 cursor-not-allowed";
            } else if (isSelected) {
              dayClass += "bg-amber-500 text-slate-950 shadow-md active:scale-95 cursor-pointer";
            } else if (hasAvailable) {
              dayClass += "border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer";
            } else {
              dayClass += "text-slate-500 hover:bg-slate-50 cursor-pointer";
            }

            return (
              <div key={dayNum} className="relative">
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={dayClass}
                >
                  {dayNum}
                  {hasBooked && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white"></span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pt-4 border-t border-slate-100 text-[9px] font-black text-slate-400">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-emerald-400 bg-emerald-50"></span> เปิดว่างแล้ว</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> กำลังเลือก</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> มีลูกค้าจองแล้ว</span>
        </div>
      </div>

      {selectedDateStr && (
        <div className="mt-6 border border-slate-200 rounded-3xl p-5 bg-white shadow-sm">
          <h2 className="text-xs font-black text-slate-800 mb-4">
            ช่วงเวลาสำหรับวันที่ {selectedDateStr}
          </h2>

          {loading ? (
            <p className="text-xs text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={saving || !!morningSlot?.isBooked}
                onClick={() => toggleSlot(selectedDateStr, 'morning')}
                className={`p-4 rounded-2xl border text-left transition ${
                  morningSlot
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:border-amber-400'
                } ${morningSlot?.isBooked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <p className="text-xs font-black text-slate-800">รอบเช้า</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">09:00 - 12:00</p>
                <p className={`text-[10px] font-black mt-2 ${morningSlot ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {morningSlot?.isBooked ? '🔒 มีลูกค้าจองแล้ว' : morningSlot ? '✓ เปิดว่างอยู่' : 'ยังไม่เปิดว่าง'}
                </p>
              </button>

              <button
                type="button"
                disabled={saving || !!afternoonSlot?.isBooked}
                onClick={() => toggleSlot(selectedDateStr, 'afternoon')}
                className={`p-4 rounded-2xl border text-left transition ${
                  afternoonSlot
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:border-amber-400'
                } ${afternoonSlot?.isBooked ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <p className="text-xs font-black text-slate-800">รอบบ่าย</p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">13:00 - 17:00</p>
                <p className={`text-[10px] font-black mt-2 ${afternoonSlot ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {afternoonSlot?.isBooked ? '🔒 มีลูกค้าจองแล้ว' : afternoonSlot ? '✓ เปิดว่างอยู่' : 'ยังไม่เปิดว่าง'}
                </p>
              </button>
            </div>
          )}

          <p className="text-[10px] text-slate-400 font-medium mt-4">
            💡 กดที่ช่วงเวลาเพื่อเปิด/ปิดความว่างของคุณ ระบบจะแสดงให้ลูกค้าเห็นเฉพาะช่วงเวลาที่เปิดว่างไว้เท่านั้น
          </p>
        </div>
      )}
    </div>
  );
}