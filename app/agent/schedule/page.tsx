'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Phone, 
  AlertCircle, 
  X,
  Home
} from 'lucide-react';

interface PropertyItem {
  id: string;
  title: string;
  listingType: string;
  price: number;
  location: string;
  imageUrl: string;
  totalSlots: number;
  remainingSlots: number;
  bookedCount: number;
  lastAvailableDate: string | null;
  isLow: boolean;
}

interface SlotItem {
  propertyId: string;
  propertyTitle: string;
  date: string;
  timeSlot: string;
  isBooked: boolean;
  isPast: boolean;
  customerName: string | null;
  customerPhone: string | null;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

function formatThaiDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayName = THAI_DAYS_FULL[new Date(y, m - 1, d).getDay()];
  return `วัน${dayName}ที่ ${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

function ScheduleContent() {
  const searchParams = useSearchParams();
  const initPropId = searchParams.get('propertyId') || 'all';

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [stats, setStats] = useState({ totalProperties: 0, lowSlotCount: 0, availableCount: 0, bookedCount: 0, lowSlotThreshold: 0, lookaheadDays: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedPropId, setSelectedPropId] = useState<string>(initPropId);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchForm, setBatchForm] = useState({
    propertyId: initPropId,
    startDate: todayStr,
    endDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    daysOfWeek: [0, 6],
    timeSlots: ['morning', 'afternoon']
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/agent/schedule');
      const json = await res.json();
      if (json.success && json.data) {
        setProperties(json.data.properties || []);
        setSlots(json.data.slots || []);
        setStats(json.data.stats || { totalProperties: 0, lowSlotCount: 0, availableCount: 0, bookedCount: 0, lowSlotThreshold: 0, lookaheadDays: 0 });
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    fetch('/api/agent/schedule')
      .then((res) => res.json())
      .then((json) => {
        if (!isSubscribed) return;
        if (json.success && json.data) {
          setProperties(json.data.properties || []);
          setSlots(json.data.slots || []);
          setStats(json.data.stats || { totalProperties: 0, lowSlotCount: 0, availableCount: 0, bookedCount: 0, lowSlotThreshold: 0, lookaheadDays: 0 });
        }
      })
      .catch((err) => console.error('Schedule fetch error:', err));

    return () => {
      isSubscribed = false;
    };
  }, []);

  const currentSlots = useMemo(() => {
    return selectedPropId === 'all' ? slots : slots.filter((s) => s.propertyId === selectedPropId);
  }, [slots, selectedPropId]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();

    const days: Array<{ day: number | null; dateStr: string | null; isToday: boolean; isPast: boolean }> = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateStr: null, isToday: false, isPast: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateStr, isToday: dateStr === todayStr, isPast: dateStr < todayStr });
    }
    return days;
  }, [calYear, calMonth, todayStr]);

  const handleToggleSlot = async (propertyId: string, date: string, timeSlot: string, isOpen: boolean) => {
    const method = isOpen ? 'DELETE' : 'POST';
    const body = isOpen ? { propertyId, date, timeSlot } : { action: 'single', propertyId, date, timeSlot };
    await fetch('/api/agent/schedule', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    await fetchData();
  };

  const handleOpenWholeDay = async (propertyId: string, date: string) => {
    await fetch('/api/agent/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'batch',
        propertyId,
        startDate: date,
        endDate: date,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        timeSlots: ['morning', 'afternoon']
      })
    });
    await fetchData();
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBatchSubmitting(true);
      await fetch('/api/agent/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', ...batchForm })
      });
      setShowBatchModal(false);
      await fetchData();
    } finally {
      setBatchSubmitting(false);
    }
  };

  const activePropertiesForDay = useMemo(() => {
    return selectedPropId === 'all' ? properties : properties.filter((p) => p.id === selectedPropId);
  }, [properties, selectedPropId]);

  return (
    <div className="pt-6 sm:pt-8 min-h-screen bg-slate-50 text-slate-800 text-xs sm:text-sm font-sans pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">

        {/* 1. ส่วนหัวหน้าเว็บ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-1">
              <Link href="/agent/home" className="hover:text-amber-600 transition">
                หน้าหลักนายหน้า
              </Link>
              <span>/</span>
              <span className="text-slate-700 font-bold">ตารางวันว่างเข้าชม</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              จัดการวันว่างเข้าชม
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              กำหนดวันและรอบเวลาที่คุณสะดวกพาลูกค้าชมบ้าน เพื่อให้ลูกค้ากดจองนัดหมายได้
            </p>
          </div>

          <button
            onClick={() => setShowBatchModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-2 w-fit"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เปิดวันว่างล่วงหน้า</span>
          </button>
        </div>

        {/* 2. สรุปสถิติสำคัญ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">ประกาศทั้งหมด</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">{stats.totalProperties} รายการ</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">อสังหาริมทรัพย์ที่เผยแพร่อยู่</span>
          </div>

          <div className={`p-4 rounded-xl border shadow-xs transition ${
            stats.lowSlotCount > 0 ? 'bg-amber-50/70 border-amber-300 text-amber-950' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">วันว่างใกล้หมด</span>
              {stats.lowSlotCount > 0 && <AlertCircle className="w-4 h-4 text-amber-600" />}
            </div>
            <span className="text-xl font-bold block mt-1">{stats.lowSlotCount} รายการ</span>
            <span className="text-[11px] font-medium mt-0.5 block text-slate-500">
              {stats.lowSlotCount > 0
                ? `เหลือน้อยกว่า ${stats.lowSlotThreshold} รอบใน ${stats.lookaheadDays} วัน`
                : 'มีรอบว่างเพียงพอ'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">นัดหมายที่จองแล้ว</span>
              <span className="text-xs font-semibold text-emerald-600">รอบว่าง {stats.availableCount} รอบ</span>
            </div>
            <span className="text-xl font-bold text-blue-600 block mt-1">{stats.bookedCount} นัด</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">คิวเข้าชมของลูกค้า</span>
          </div>
        </div>

        {/* 3. แถบเลือกทรัพย์สิน */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Home className="w-4 h-4 text-slate-400 shrink-0" />
            <label htmlFor="filter-property" className="text-xs font-semibold text-slate-600 shrink-0">
              เลือกดูบ้าน:
            </label>
            <select
              id="filter-property"
              value={selectedPropId}
              onChange={(e) => setSelectedPropId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400 w-full sm:w-80"
            >
              <option value="all">ดูทุกประกาศรวมกัน ({properties.length} หลัง)</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} {p.isLow ? '(วันว่างใกล้หมด)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            คลิกเลือกวันที่บนปฏิทินเพื่อจัดการรอบเวลาเข้าชม
          </div>
        </div>

        {/* 4. ตารางปฏิทิน และ แผงจัดการวัน */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ฝั่งซ้าย: ปฏิทินรายเดือน */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            
            {/* ส่วนหัวปฏิทิน: เดือน/ปี และปุ่มเลื่อน */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  {THAI_MONTHS[calMonth]} {calYear + 543}
                </h2>
                <button
                  onClick={() => {
                    const d = new Date();
                    setCalYear(d.getFullYear());
                    setCalMonth(d.getMonth());
                    setSelectedDate(todayStr);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] transition cursor-pointer"
                >
                  วันนี้
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else {
                      setCalMonth((m) => m - 1);
                    }
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else {
                      setCalMonth((m) => m + 1);
                    }
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition"
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* หัวชื่อวัน อา. - ส. */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-[11px] text-slate-400">
              {THAI_DAYS.map((name, i) => (
                <div key={name} className={`py-1 ${i === 0 || i === 6 ? 'text-amber-600' : ''}`}>
                  {name}
                </div>
              ))}
            </div>

            {/* ตารางวัน */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((cell, idx) => {
                if (!cell.day || !cell.dateStr) {
                  return <div key={`blank-${idx}`} className="h-16 sm:h-20 bg-slate-50/60 rounded-lg" />;
                }

                const daySlots = currentSlots.filter((s) => s.date === cell.dateStr);
                const booked = daySlots.filter((s) => s.isBooked).length;
                const available = daySlots.filter((s) => !s.isBooked && !s.isPast).length;
                const isSelected = selectedDate === cell.dateStr;

                return (
                  <div
                    key={cell.dateStr}
                    onClick={() => setSelectedDate(cell.dateStr!)}
                    className={`h-16 sm:h-20 p-1.5 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400'
                        : cell.isToday
                        ? 'border-amber-300 bg-white'
                        : cell.isPast
                        ? 'border-slate-100 bg-slate-50/80 opacity-60'
                        : 'border-slate-100 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 text-slate-950' : cell.isToday ? 'text-amber-600 font-extrabold' : 'text-slate-700'
                      }`}>
                        {cell.day}
                      </span>
                      {cell.isToday && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    </div>

                    {/* สถานะรอบในช่องวัน */}
                    <div className="space-y-0.5">
                      {booked > 0 && (
                        <div className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1 py-0.5 rounded text-center sm:text-left truncate" title={`นัด ${booked} คิว`}>
                          <span className="sm:hidden inline-flex items-center justify-center gap-0.5">
                            <svg className="w-2.5 h-2.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {booked}
                          </span>
                          <span className="hidden sm:inline">นัด {booked} คิว</span>
                        </div>
                      )}
                      {available > 0 && (
                        <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.5 rounded text-center sm:text-left truncate" title={`ว่าง ${available} รอบ`}>
                          <span className="sm:hidden">ว่าง {available}</span>
                          <span className="hidden sm:inline">ว่าง {available} รอบ</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* คำอธิบายสัญลักษณ์ใต้ปฏิทิน */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                รอบว่างพร้อมรับจอง
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                มีนัดหมายแล้ว
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-500" />
                วันที่เลือกดู
              </span>
            </div>
          </div>

          {/* ฝั่งขวา: รายละเอียดของวันที่เลือก */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                  ตารางประจำวัน
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {formatThaiDateLong(selectedDate)}
                </h3>
              </div>
              {selectedDate === todayStr && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                  วันนี้
                </span>
              )}
            </div>

            {/* รายการบ้านในวันที่เลือก */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-0.5">
              {activePropertiesForDay.map((p) => {
                const mSlot = slots.find((s) => s.propertyId === p.id && s.date === selectedDate && s.timeSlot === 'morning');
                const aSlot = slots.find((s) => s.propertyId === p.id && s.date === selectedDate && s.timeSlot === 'afternoon');
                const isPastDate = selectedDate < todayStr;

                return (
                  <div key={p.id} className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 relative overflow-hidden shrink-0">
                          <Image src={p.imageUrl} alt={p.title} fill className="object-cover" unoptimized />
                        </div>
                        <p className="font-bold text-slate-900 text-xs truncate max-w-[190px]">
                          {p.title}
                        </p>
                      </div>

                      {!isPastDate && (!mSlot || !aSlot) && (
                        <button
                          disabled={loading}
                          onClick={() => handleOpenWholeDay(p.id, selectedDate)}
                          className="text-[10px] text-amber-800 hover:text-amber-950 font-bold bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded transition cursor-pointer shrink-0"
                        >
                          เปิดทั้งวัน
                        </button>
                      )}
                    </div>

                    {/* รอบเวลาเช้าและบ่าย */}
                    <div className="grid grid-cols-2 gap-2">
                      
                      {/* รอบเช้า */}
                      <div className={`p-2.5 rounded-lg border text-xs transition ${
                        mSlot?.isBooked
                          ? 'bg-blue-50/70 border-blue-200'
                          : mSlot
                          ? 'bg-white border-emerald-300 shadow-2xs'
                          : 'bg-white/80 border-slate-200 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-800">รอบเช้า (10:00 น.)</span>
                          {mSlot?.isBooked ? (
                            <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">จองแล้ว</span>
                          ) : (
                            <button
                              disabled={isPastDate || loading}
                              onClick={() => handleToggleSlot(p.id, selectedDate, 'morning', !!mSlot)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                                mSlot ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {mSlot ? 'ปิดรอบ' : '+ เปิด'}
                            </button>
                          )}
                        </div>
                        {mSlot?.customerName ? (
                          <div className="space-y-0.5 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-blue-900 font-semibold truncate">
                              <User className="w-3 h-3 shrink-0 text-blue-700" />
                              <span className="truncate">{mSlot.customerName}</span>
                            </div>
                            {mSlot.customerPhone && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                                <Phone className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                <span>{mSlot.customerPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {mSlot ? 'เปิดรับจองอยู่' : 'ยังไม่เปิด'}
                          </span>
                        )}
                      </div>

                      {/* รอบบ่าย */}
                      <div className={`p-2.5 rounded-lg border text-xs transition ${
                        aSlot?.isBooked
                          ? 'bg-blue-50/70 border-blue-200'
                          : aSlot
                          ? 'bg-white border-emerald-300 shadow-2xs'
                          : 'bg-white/80 border-slate-200 text-slate-500'
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-800">รอบบ่าย (13:00 น.)</span>
                          {aSlot?.isBooked ? (
                            <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">จองแล้ว</span>
                          ) : (
                            <button
                              disabled={isPastDate || loading}
                              onClick={() => handleToggleSlot(p.id, selectedDate, 'afternoon', !!aSlot)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                                aSlot ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              }`}
                            >
                              {aSlot ? 'ปิดรอบ' : '+ เปิด'}
                            </button>
                          )}
                        </div>
                        {aSlot?.customerName ? (
                          <div className="space-y-0.5 mt-1">
                            <div className="flex items-center gap-1 text-[10px] text-blue-900 font-semibold truncate">
                              <User className="w-3 h-3 shrink-0 text-blue-700" />
                              <span className="truncate">{aSlot.customerName}</span>
                            </div>
                            {aSlot.customerPhone && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-700 font-medium">
                                <Phone className="w-2.5 h-2.5 shrink-0 text-blue-600" />
                                <span>{aSlot.customerPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            {aSlot ? 'เปิดรับจองอยู่' : 'ยังไม่เปิด'}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}

              {activePropertiesForDay.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs">
                  ไม่พบประกาศที่เผยแพร่อยู่ในระบบ
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Modal: เปิดวันว่างล่วงหน้า (Batch) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleBatchSubmit}
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">เปิดวันว่างล่วงหน้าเป็นชุด</h3>
                <p className="text-slate-400 text-xs">เลือกช่วงวันและรอบเวลาเพื่อเปิดรับจองพร้อมกันหลายวัน</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ทางลัดเลือกเร็ว */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-600">เลือกรูปแบบที่ต้องการ:</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBatchForm((f) => ({ ...f, daysOfWeek: [0, 6] }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    batchForm.daysOfWeek.length === 2 && batchForm.daysOfWeek.includes(0) && batchForm.daysOfWeek.includes(6)
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ทุกวันเสาร์ - อาทิตย์
                </button>
                <button
                  type="button"
                  onClick={() => setBatchForm((f) => ({ ...f, daysOfWeek: [1, 2, 3, 4, 5] }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    batchForm.daysOfWeek.length === 5 && !batchForm.daysOfWeek.includes(0)
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  วันธรรมดา (จ.-ศ.)
                </button>
                <button
                  type="button"
                  onClick={() => setBatchForm((f) => ({ ...f, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }))}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    batchForm.daysOfWeek.length === 7
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ทุกวัน
                </button>
              </div>
            </div>

            {/* เลือกทรัพย์สิน */}
            <div className="space-y-1">
              <label htmlFor="batch-prop" className="text-xs font-bold text-slate-700 block">
                ทรัพย์สินที่ต้องการเปิด
              </label>
              <select
                id="batch-prop"
                value={batchForm.propertyId}
                onChange={(e) => setBatchForm({ ...batchForm, propertyId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="all">ทุกทรัพย์สินของฉัน ({properties.length} หลัง)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* ช่วงวันที่ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="batch-start" className="text-xs font-bold text-slate-700 block mb-1">วันที่เริ่มต้น</label>
                <input
                  id="batch-start"
                  type="date"
                  value={batchForm.startDate}
                  min={todayStr}
                  onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="batch-end" className="text-xs font-bold text-slate-700 block mb-1">วันที่สิ้นสุด</label>
                <input
                  id="batch-end"
                  type="date"
                  value={batchForm.endDate}
                  min={batchForm.startDate}
                  onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-slate-50 outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>
            </div>

            {/* วันในสัปดาห์ */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">วันในสัปดาห์ที่เปิด</span>
              <div className="grid grid-cols-7 gap-1">
                {THAI_DAYS.map((d, idx) => {
                  const sel = batchForm.daysOfWeek.includes(idx);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const next = sel ? batchForm.daysOfWeek.filter((x) => x !== idx) : [...batchForm.daysOfWeek, idx];
                        setBatchForm({ ...batchForm, daysOfWeek: next });
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        sel ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* รอบเวลา */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">รอบเวลาที่เปิด</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={batchForm.timeSlots.includes('morning')}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...batchForm.timeSlots, 'morning']
                        : batchForm.timeSlots.filter((s) => s !== 'morning');
                      setBatchForm({ ...batchForm, timeSlots: next });
                    }}
                    className="accent-amber-500 rounded"
                  />
                  <span className="font-semibold text-slate-800">รอบเช้า (10:00 น.)</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition">
                  <input
                    type="checkbox"
                    checked={batchForm.timeSlots.includes('afternoon')}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...batchForm.timeSlots, 'afternoon']
                        : batchForm.timeSlots.filter((s) => s !== 'afternoon');
                      setBatchForm({ ...batchForm, timeSlots: next });
                    }}
                    className="accent-amber-500 rounded"
                  />
                  <span className="font-semibold text-slate-800">รอบบ่าย (13:00 น.)</span>
                </label>
              </div>
            </div>

            {/* ปุ่มกดยืนยัน */}
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={batchSubmitting || batchForm.daysOfWeek.length === 0 || batchForm.timeSlots.length === 0}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                {batchSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเปิดรอบ'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}

export default function AgentSchedulePage() {
  return (
    <Suspense fallback={<div className="pt-24 text-center text-slate-400 text-xs">กำลังโหลดข้อมูล...</div>}>
      <ScheduleContent />
    </Suspense>
  );
}
