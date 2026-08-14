'use client';

/**
 * ==============================================================================
 * หน้าจองคิวนัดหมายเข้าชมสถานที่จริง (Book Appointment Page)
 * /app/(customer)/book-appointment/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. ดึงวันและรอบเวลาที่เปิดว่างจริงจากนายหน้า (`property_viewing_slots`) สำหรับอสังหาริมทรัพย์หลังนี้
 * 2. แสดงปฏิทินให้ลูกค้าเลือกวันที่สะดวก และเลือกรอบเวลา (รอบเช้า 09:00-12:00 น. / รอบบ่าย 13:00-17:00 น.)
 * 3. บันทึกข้อมูลคำขอนัดหมายลงตาราง `appointments` ในฐานข้อมูลจริงผ่าน API
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import BookingSidebar from '@/components/customer/BookingSidebar';
import BookingCalendar from '@/components/customer/BookingCalendar';

// รายชื่อเดือนภาษาไทยสำหรับแสดงผลวันที่แบบข้อความอ่านง่าย
const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function BookAppointmentForm() {
  // ----------------------------------------------------------------------------
  // 1. ROUTER & URL PARAMS
  // ----------------------------------------------------------------------------
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get('propertyId'); // รหัสอสังหาฯ ที่ส่งมาจากหน้าก่อนหน้า (?propertyId=uuid)
  const today = new Date();

  // ----------------------------------------------------------------------------
  // 2. LOCAL COMPONENT STATE (สถานะภายในฟอร์ม)
  // ----------------------------------------------------------------------------
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());  // ปีของปฏิทินที่เปิดอยู่
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());   // เดือนของปฏิทินที่เปิดอยู่
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');          // วันที่ผู้ใช้เลือก (รูปแบบ "YYYY-MM-DD")
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');        // ช่วงเวลาที่เลือก (รอบเช้า / รอบบ่าย)
  const [note, setNote] = useState('');                                         // ข้อความเพิ่มเติมถึงนายหน้า
  const [submitting, setSubmitting] = useState(false);                          // สถานะกำลังส่งข้อมูล (ป้องกันการกดซ้ำ)
  const [holidays, setHolidays] = useState<string[]>([]);                       // รายการวันหยุดประจำปี
  const [viewingSlots, setViewingSlots] = useState<{ date: string; timeSlot: string; isBooked: boolean; agentBusyElsewhere: boolean }[]>([]); // รอบเวลาที่เปิดว่างจริง
  const [slotsLoading, setSlotsLoading] = useState(true);                       // สถานะกำลังดึงข้อมูลรอบเวลา

  // ----------------------------------------------------------------------------
  // 3. GLOBAL CONTEXT
  // ----------------------------------------------------------------------------
  const { properties, propertiesLoading, refreshAppointments } = useApp();
  
  // ค้นหาอสังหาริมทรัพย์ที่ตรงกับ propertyId
  const property = properties.find((p) => String(p.id) === String(propertyId));

  // ----------------------------------------------------------------------------
  // 4. EFFECTS & FETCHING (ดึงข้อมูลวันว่างและวันหยุดจาก API)
  // ----------------------------------------------------------------------------
  // 🔑 KEYWORD: ดึงวันว่างจริงมาให้ลูกค้าจอง
  // 4.1 โหลดวันและช่วงเวลาที่นายหน้าเปิดว่างสำหรับบ้านหลังนี้โดยเฉพาะ
  useEffect(() => {
    if (!property?.id) return;
    let active = true;
    fetch(`/api/properties/viewing-slots?propertyId=${property.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.slots)) setViewingSlots(data.slots);
      })
      .catch(console.error)
      .finally(() => active && setSlotsLoading(false));

    return () => { active = false; };
  }, [property?.id]);

  // 4.2 โหลดข้อมูลวันหยุดนักขัตฤกษ์ประจำปี
  useEffect(() => {
    let active = true;
    fetch(`/api/holidays?year=${currentYear}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.holidays)) setHolidays(data.holidays);
      })
      .catch(console.error);

    return () => { active = false; };
  }, [currentYear]);

  // ----------------------------------------------------------------------------
  // 5. COMPUTED & MEMOIZED VALUES
  // ----------------------------------------------------------------------------
  // 5.1 รายชื่อวันที่ที่มีอย่างน้อย 1 รอบเวลาว่างและยังไม่มีคนจอง (นำไปไฮไลต์ในปฏิทิน)
  const availableDates = useMemo(() =>
    Array.from(new Set(viewingSlots.filter((s) => !s.isBooked && !s.agentBusyElsewhere).map((s) => s.date)))
  , [viewingSlots]);

  // 5.2 กรองเฉพาะรอบเวลาของ "วันที่ที่เลือกอยู่ปัจจุบัน"
  const slotsForSelectedDate = useMemo(() => 
    viewingSlots.filter((s) => s.date === selectedDateStr)
  , [viewingSlots, selectedDateStr]);

  const morningSlot = slotsForSelectedDate.find((s) => s.timeSlot === 'morning');
  const afternoonSlot = slotsForSelectedDate.find((s) => s.timeSlot === 'afternoon');

  // 🔑 KEYWORD: เลือกวันที่รีเซ็ตรอบเวลา
  // ฟังก์ชันเลือกวันที่ในปฏิทิน (ล้างรอบเวลาเดิมทิ้งเมื่อเปลี่ยนวันใหม่)
  const handleDateSelect = (date: string) => {
    setSelectedDateStr(date);
    setSelectedTimeSlot('');
  };

  // จัดข้อความสรุปวันที่เลือกสำหรับแสดงผลบน Badge หัวข้อขั้นตอนที่ 2
  const getThaiPreviewDate = () => {
    if (!selectedDateStr) return 'ยังไม่ได้เลือกวันที่';
    try {
      const [, m, d] = selectedDateStr.split('-');
      return `วันที่ ${parseInt(d)} ${MONTH_NAMES_TH[parseInt(m) - 1]?.substring(0, 3)}.`;
    } catch {
      return '';
    }
  };

  // ----------------------------------------------------------------------------
  // 6. FORM SUBMISSION HANDLER (บันทึกคำขอนัดหมายลง DB)
  // ----------------------------------------------------------------------------
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !selectedDateStr || !selectedTimeSlot) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          date: selectedDateStr,
          timeSlot: selectedTimeSlot,
          note
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถทำนัดหมายได้');

      alert(`ส่งขอจองนัดหมายสำหรับอสังหาฯ ${property.title} เรียบร้อยแล้ว!`);
      await refreshAppointments(); // ดึงนัดหมายล่าสุดเข้า Context
      router.push('/appointments'); // นำทางไปยังหน้ารายการนัดหมายของฉัน
    } catch (err) {
      alert((err as Error).message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  // แสดงผล Spinner ระหว่างรอโหลดรายการบ้าน
  if (propertiesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // กรณีหาอสังหาริมทรัพย์รหัสนี้ไม่เจอ
  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-bold gap-4 px-4 text-center">
        <div className="text-4xl">🔍</div>
        <p>ไม่พบอสังหาริมทรัพย์ที่ต้องการจองนัดหมาย</p>
        <button onClick={() => router.push('/search')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition">
          ค้นหาบ้าน/คอนโด
        </button>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // 7. RENDERING SECTION
  // ----------------------------------------------------------------------------
  return (
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased text-sm pb-24 pt-12">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* หัวข้อหน้าและปุ่มย้อนกลับ */}
        <div className="mb-8">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-blue-600 font-bold text-xs flex items-center gap-1 mb-2 transition">
            &lt; กลับไปหน้ารายละเอียด
          </button>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">ทำการนัดหมาย</h1>
          <p className="text-slate-500 text-xs mt-0.5">เลือกวันและเวลาที่คุณสะดวก เพื่อเข้าชมสถานที่จริง</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* การ์ดสรุปข้อมูลอสังหาฯ และนายหน้าฝั่งซ้าย */}
          <BookingSidebar property={property} />

          {/* ฟอร์มการจองนัดหมายฝั่งขวา (3 ขั้นตอน) */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-sm space-y-8">
            <form onSubmit={handleBookingSubmit} className="space-y-8">
              
              {/* ================================================================
                  ขั้นตอนที่ 1: เลือกวันที่ในปฏิทิน
                  ================================================================ */}
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

                {/* 🔑 KEYWORD: การ์ดเตือนไม่มีวันว่าง */}
                {/* ข้อความเตือนกรณีไม่มีวันว่างเปิดให้จองเลย */}
                {!slotsLoading && availableDates.length === 0 && (
                  <p className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-center">
                    ⚠️ นายหน้ายังไม่ได้เปิดวันว่างสำหรับบ้านหลังนี้ กรุณาติดต่อนายหน้าโดยตรง
                  </p>
                )}
              </div>

              {/* ================================================================
                  ขั้นตอนที่ 2: เลือกรอบเวลา (รอบเช้า / รอบบ่าย)
                  ================================================================ */}
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
                  {[
                    { key: 'morning', title: 'รอบเช้า', time: '09:00 - 12:00', fullText: 'รอบเช้า (09:00 - 12:00 น.)', slot: morningSlot },
                    { key: 'afternoon', title: 'รอบบ่าย', time: '13:00 - 17:00', fullText: 'รอบบ่าย (13:00 - 17:00 น.)', slot: afternoonSlot },
                  ].map(({ key, title, time, fullText, slot }) => {
                    const isSelected = selectedTimeSlot.includes(title);
                    // 🔑 KEYWORD: ปิดรอบที่นายหน้าติดนัดบ้านหลังอื่น
                    // นายหน้าเปิดวันว่างซ้อนกันได้หลายบ้าน แต่ไปนำชมได้ทีละที่ — ถ้ามีนัดจริงกับบ้านหลังอื่น
                    // ชนวัน+เวลานี้อยู่แล้ว ต้องปิดไม่ให้ลูกค้ากดจองซ้ำ (server กันซ้ำอยู่แล้ว แต่บอกไว้ก่อนดีกว่า)
                    const isDisabled = !slot || slot.isBooked || slot.agentBusyElsewhere;

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedTimeSlot((prev) => (prev.includes(title) ? '' : fullText))}
                        className={`p-4 rounded-2xl border text-left transition flex justify-between items-center ${
                          isDisabled
                            ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                            : isSelected
                              ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/10 cursor-pointer'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer'
                        }`}
                      >
                        <div>
                          <h4 className="font-extrabold text-xs">{title}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{time}</p>
                        </div>
                        {!selectedDateStr ? (
                          <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">เลือกวันก่อน</span>
                        ) : slot?.isBooked ? (
                          <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded text-[8px] font-bold">มีคนจองแล้ว</span>
                        ) : slot?.agentBusyElsewhere ? (
                          <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[8px] font-bold">นายหน้าติดนัดบ้านหลังอื่น</span>
                        ) : slot ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-bold">✓ ว่างให้จอง</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded text-[8px] font-bold">ไม่เปิดว่าง</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ================================================================
                  ขั้นตอนที่ 3: ฝากข้อความถึงนายหน้า และ ปุ่มยืนยันการจอง
                  ================================================================ */}
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition text-slate-800 font-bold text-xs resize-none placeholder-slate-400"
                />

                {/* 🔑 KEYWORD: ปุ่มยืนยันการนัดหมาย */}
                <button
                  type="submit"
                  disabled={submitting || !selectedDateStr || !selectedTimeSlot}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-6 rounded-2xl transition shadow flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed text-xs"
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

// ใช้ Suspense เพื่อรองรับ useSearchParams() ใน Next.js App Router
export default function BookAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <BookAppointmentForm />
    </Suspense>
  );
}