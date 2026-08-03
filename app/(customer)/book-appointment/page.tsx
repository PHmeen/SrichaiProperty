'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import BookingSidebar from '@/components/customer/BookingSidebar';
import BookingCalendar from '@/components/customer/BookingCalendar';

function BookAppointmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get('propertyId');
  const today = new Date();
  
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  const [selectedDateStr, setSelectedDateStr] = useState<string>('');

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [holidays, setHolidays] = useState<string[]>([]);

  // วันเวลาที่นายหน้าเปิดว่างจริงสำหรับ "บ้านหลังนี้โดยเฉพาะ" (ดึงจาก property_viewing_slots)
  const [viewingSlots, setViewingSlots] = useState<{ date: string; timeSlot: string; isBooked: boolean }[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const { properties, refreshAppointments } = useApp();
  const property = properties.find(p => String(p.id) === String(propertyId)) || properties[0];

  // ดึงวันว่างจริงของบ้านหลังนี้ทันทีที่รู้ว่ากำลังจองบ้านหลังไหน
  useEffect(() => {
    if (!property?.id) return;
    let active = true;
    const fetchSlots = async () => {
      try {
        const res = await fetch(`/api/properties/viewing-slots?propertyId=${property.id}`);
        const data = await res.json();
        if (active && data.success && Array.isArray(data.slots)) {
          setViewingSlots(data.slots);
        }
      } catch (err) {
        console.error('Failed to fetch viewing slots:', err);
      } finally {
        if (active) setSlotsLoading(false);
      }
    };
    fetchSlots();
    return () => { active = false; };
  }, [property?.id]);

  // รายชื่อวันที่ (YYYY-MM-DD) ที่มีอย่างน้อย 1 รอบเวลาเปิดว่างและยังไม่มีคนจอง
  const availableDates = Array.from(
    new Set(viewingSlots.filter(s => !s.isBooked).map(s => s.date))
  );

  // รอบเวลาของ "วันที่ที่กำลังเลือกอยู่" เท่านั้น
  const slotsForSelectedDate = viewingSlots.filter(s => s.date === selectedDateStr);
  const morningSlot = slotsForSelectedDate.find(s => s.timeSlot === 'morning');
  const afternoonSlot = slotsForSelectedDate.find(s => s.timeSlot === 'afternoon');

  const handleDateSelect = (date: string) => {
    setSelectedDateStr(date);
    setSelectedTimeSlot('');
  };

  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  useEffect(() => {
    let active = true;
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`/api/holidays?year=${currentYear}`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.success && Array.isArray(data.holidays)) {
            setHolidays(data.holidays);
          }
        }
      } catch (err) {
        console.error('Failed to fetch holidays:', err);
      }
    };
    fetchHolidays();
    return () => {
      active = false;
    };
  }, [currentYear]);

  const getThaiPreviewDate = () => {
    if (!selectedDateStr) return 'ยังไม่ได้เลือกวันที่';
    try {
      const parts = selectedDateStr.split('-');
      const d = parseInt(parts[2]);
      const m = parseInt(parts[1]) - 1;
      return `วันที่ ${d} ${monthNamesTH[m].substring(0, 3)}.`;
    } catch {
      return '';
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    if (!selectedDateStr) return alert('กรุณาเลือกวันที่ต้องการเข้าชมบ้านก่อน');
    if (!selectedTimeSlot) return alert('กรุณาเลือกช่วงเวลา (รอบเช้า/รอบบ่าย) ก่อน');

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: (property.id),
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
      await refreshAppointments();
      router.push('/appointments');
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  if (!properties || properties.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-24 pt-12">
      <div className="max-w-5xl mx-auto px-4">
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
          <BookingSidebar property={property} />

          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-sm space-y-8">
            <form onSubmit={handleBookingSubmit} className="space-y-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">1</span>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">เลือกวันที่สะดวก</label>
                </div>
                
                <BookingCalendar 
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  setCurrentYear={setCurrentYear}
                  setCurrentMonth={setCurrentMonth}
                  selectedDateStr={selectedDateStr}
                  setSelectedDateStr={handleDateSelect}
                  holidays={holidays}
                  availableDates={availableDates}
                />

                {!slotsLoading && availableDates.length === 0 && (
                  <p className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
                    ⚠️ นายหน้ายังไม่ได้เปิดวันว่างสำหรับบ้านหลังนี้ กรุณาติดต่อนายหน้าโดยตรง
                  </p>
                )}
              </div>

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
                  <button
                    type="button"
                    disabled={!morningSlot || morningSlot.isBooked}
                    onClick={() => setSelectedTimeSlot(prev => prev.includes('รอบเช้า') ? '' : 'รอบเช้า (09:00 - 12:00 น.)')}
                    className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${
                      !morningSlot || morningSlot.isBooked
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : selectedTimeSlot.includes('รอบเช้า')
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10 cursor-pointer'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs">รอบเช้า</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">09:00 - 12:00</p>
                    </div>
                    {!selectedDateStr ? (
                      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">เลือกวันก่อน</span>
                    ) : morningSlot?.isBooked ? (
                      <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[8px] font-bold">มีคนจองแล้ว</span>
                    ) : morningSlot ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-bold">✓ ว่างให้จอง</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">ไม่เปิดว่าง</span>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!afternoonSlot || afternoonSlot.isBooked}
                    onClick={() => setSelectedTimeSlot(prev => prev.includes('รอบบ่าย') ? '' : 'รอบบ่าย (13:00 - 17:00 น.)')}
                    className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center ${
                      !afternoonSlot || afternoonSlot.isBooked
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : selectedTimeSlot.includes('รอบบ่าย')
                          ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10 cursor-pointer'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs">รอบบ่าย</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">13:00 - 17:00</p>
                    </div>
                    {!selectedDateStr ? (
                      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">เลือกวันก่อน</span>
                    ) : afternoonSlot?.isBooked ? (
                      <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[8px] font-bold">มีคนจองแล้ว</span>
                    ) : afternoonSlot ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-bold">✓ ว่างให้จอง</span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">ไม่เปิดว่าง</span>
                    )}
                  </button>
                </div>
              </div>

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
                  disabled={submitting || !selectedDateStr || !selectedTimeSlot}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-extrabold py-3.5 px-6 rounded-2xl transition-all duration-150 shadow-md hover:shadow-lg active:scale-[0.99] text-xs cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? '⏳ กำลังบันทึกข้อมูลนัดชม...'
                    : (!selectedDateStr || !selectedTimeSlot)
                      ? 'กรุณาเลือกวันและช่วงเวลาก่อน'
                      : 'ยืนยันการนัดหมาย'}
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