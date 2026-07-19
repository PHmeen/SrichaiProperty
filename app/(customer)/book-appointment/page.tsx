'use client';

/**
 * page.tsx (Book Appointment) - หน้าฟอร์มทำการนัดหมายเข้าชมบ้านจริง
 * ดีไซน์พรีเมียม สะอาด สั้น กระชับ โดยแยกส่วนประกอบเป็นชิ้นย่อยเพื่อให้อ่านและดูแลรักษาง่าย
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useApp } from '../../context/AppContext';
import BookingSidebar from './components/BookingSidebar';
import BookingCalendar from './components/BookingCalendar';

function BookAppointmentForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // 1. ดึงไอดีจาก URL (?propertyId=...)
  const propertyId = searchParams.get('propertyId');

  const today = new Date();
  
  // สถานะวันและเดือนปีในปฏิทิน
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed

  // สถานะเก็บวันที่จองจริงในรูป YYYY-MM-DD
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('รอบบ่าย (13:00 - 17:00 น.)');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // สถานะเก็บวันหยุดราชการไทยจาก API
  const [holidays, setHolidays] = useState<string[]>([]);

  // ดึงข้อมูลอสังหาริมทรัพย์
  const { properties } = useApp();
  const property = properties.find(p => String(p.id) === String(propertyId)) || properties[0];

  // เดือนภาษาไทยสั้น
  const monthNamesTH = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // ดึงวันหยุดประเทศไทยผ่าน API สาธารณะ เมื่อเปลี่ยนปี
  useEffect(() => {
    let active = true;
    const fetchThaiHolidays = async () => {
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${currentYear}/TH`);
        if (res.ok) {
          const data = await res.json();
          if (active && Array.isArray(data)) {
            const dateStrings = data.map((h: { date: string }) => h.date);
            setHolidays(dateStrings);
          }
        }
      } catch (err) {
        console.error('Error fetching Thai holidays:', err);
      }
    };
    fetchThaiHolidays();
    return () => {
      active = false;
    };
  }, [currentYear]);

  // ฟังก์ชันจัดฟอร์แมตวันภาษาไทยสำหรับแสดงผลพรีวิวขั้นตอนที่ 2
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

  // ฟังก์ชันส่งนัดหมายเข้าฐานข้อมูล
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
          
          {/* ส่วนฝั่งซ้าย: พรีวิวข้อมูลทรัพย์และนายหน้า */}
          <BookingSidebar property={property} />

          {/* ส่วนฝั่งขวา: ฟอร์มสเต็ปนัดหมาย */}
          <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/70 shadow-sm space-y-8">
            <form onSubmit={handleBookingSubmit} className="space-y-8">
              
              {/* ขั้นตอนที่ 1: เลือกวันที่สะดวก */}
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
                  setSelectedDateStr={setSelectedDateStr}
                  holidays={holidays}
                />
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
