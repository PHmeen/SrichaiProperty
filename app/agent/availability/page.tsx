'use client';

import React, { useState, useEffect } from 'react';

interface AvailabilitySlot {
  id: string;
  date: string;
  timeSlot: 'morning' | 'afternoon';
  isBooked: boolean;
}

export default function AgentAvailabilityPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // 1. โหลดข้อมูลวันว่างจาก DB
  useEffect(() => {
    let active = true;
    fetch(`/api/agent/availability?year=${currentYear}&month=${currentMonth + 1}`)
      .then(res => res.json())
      .then(data => {
        if (active && data.success) setSlots(data.availabilities || []);
      })
      .catch(err => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [currentYear, currentMonth]);

  // 2. กดเปิด/ปิดวันว่าง (บันทึกลง DB ทันที)
  const toggleTimeSlot = async (timeSlot: 'morning' | 'afternoon') => {
    if (!selectedDate) return;

    const existing = slots.find(s => s.date === selectedDate && s.timeSlot === timeSlot);
    if (existing?.isBooked) {
      alert('ช่วงเวลานี้มีลูกค้าจองแล้ว ไม่สามารถปิดได้');
      return;
    }

    try {
      const res = await fetch('/api/agent/availability', {
        method: existing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, timeSlot }),
      });
      const data = await res.json();
      if (res.ok) {
        if (existing) {
          setSlots(prev => prev.filter(s => !(s.date === selectedDate && s.timeSlot === timeSlot)));
        } else {
          setSlots(prev => [...prev, { id: data.data?.id || String(Date.now()), date: selectedDate, timeSlot, isBooked: false }]);
        }
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  // คำนวณวันในปฏิทิน
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const selectedSlots = selectedDate ? slots.filter(s => s.date === selectedDate) : [];
  const morningSlot = selectedSlots.find(s => s.timeSlot === 'morning');
  const afternoonSlot = selectedSlots.find(s => s.timeSlot === 'afternoon');

  return (
    <div className="max-w-xl mx-auto px-4 pt-24 pb-16">
      <h1 className="text-lg font-black text-slate-800 mb-1">📅 ตั้งค่าวันว่างนายหน้า</h1>
      <p className="text-xs text-slate-500 mb-6">คลิกเลือกวันที่ แล้วเปิด/ปิดเวลาที่คุณว่างสำหรับรับนัดดูบ้าน</p>

      {/* กล่องปฏิทิน */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => currentMonth === 0 ? (setCurrentMonth(11), setCurrentYear(y => y - 1)) : setCurrentMonth(m => m - 1)} className="p-1 font-bold text-slate-400 hover:text-slate-600">&lt;</button>
          <span className="text-xs font-black text-slate-800">{monthNamesTH[currentMonth]} {currentYear + 543}</span>
          <button onClick={() => currentMonth === 11 ? (setCurrentMonth(0), setCurrentYear(y => y + 1)) : setCurrentMonth(m => m + 1)} className="p-1 font-bold text-slate-400 hover:text-slate-600">&gt;</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
          <span className="text-red-500">อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span className="text-amber-500">ส</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} className="w-8 h-8" />)}
          {Array.from({ length: totalDaysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const isSelected = selectedDate === dateStr;
            const isPast = new Date(currentYear, currentMonth, dayNum) < new Date(new Date().setHours(0,0,0,0));
            const daySlots = slots.filter(s => s.date === dateStr);

            return (
              <button
                key={dayNum}
                disabled={isPast}
                onClick={() => setSelectedDate(dateStr)}
                className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition relative ${
                  isPast ? 'text-slate-200 cursor-not-allowed' :
                  isSelected ? 'bg-amber-500 text-slate-950 shadow' :
                  daySlots.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-400' :
                  'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {dayNum}
                {daySlots.some(s => s.isBooked) && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border border-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* เลือกช่วงเวลา */}
      {selectedDate && (
        <div className="mt-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <h2 className="text-xs font-black text-slate-800 mb-3">ช่วงเวลาว่างสำหรับวันที่ {selectedDate}</h2>
          {loading ? <p className="text-xs text-slate-400">กำลังโหลด...</p> : (
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={!!morningSlot?.isBooked}
                onClick={() => toggleTimeSlot('morning')}
                className={`p-4 rounded-2xl border text-left transition ${
                  morningSlot ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                }`}
              >
                <p className="text-xs font-black">รอบเช้า (09:00 - 12:00)</p>
                <p className="text-[10px] font-bold mt-1 text-slate-500">
                  {morningSlot?.isBooked ? '🔒 มีคนจองแล้ว' : morningSlot ? '✓ เปิดว่างแล้ว (คลิกเพื่อปิด)' : '+ คลิกเพื่อเปิดว่าง'}
                </p>
              </button>

              <button
                disabled={!!afternoonSlot?.isBooked}
                onClick={() => toggleTimeSlot('afternoon')}
                className={`p-4 rounded-2xl border text-left transition ${
                  afternoonSlot ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-600'
                }`}
              >
                <p className="text-xs font-black">รอบบ่าย (13:00 - 17:00)</p>
                <p className="text-[10px] font-bold mt-1 text-slate-500">
                  {afternoonSlot?.isBooked ? '🔒 มีคนจองแล้ว' : afternoonSlot ? '✓ เปิดว่างแล้ว (คลิกเพื่อปิด)' : '+ คลิกเพื่อเปิดว่าง'}
                </p>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}