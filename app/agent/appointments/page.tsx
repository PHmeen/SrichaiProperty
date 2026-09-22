'use client';

/**
 * page.tsx (Agent Appointments Manager) - ระบบจัดการคิวนัดหมาย
 * ตามดีไซน์ที่แนบ (PDF): ปฏิทินซ้าย + สรุปคิวงาน, แท็บกรองสถานะ,
 * การ์ดคำขอพร้อมปุ่มยืนยันรับคิว/แชทคุย/ปฏิเสธ, แสดงวันที่เดิมขีดฆ่าเมื่อลูกค้าแก้ไข
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Phone,
  MessageSquare,
  Navigation,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AgentAppointment {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'no_show';
  date: string; // YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon';
  note: string;
  customerName: string;
  customerPhone: string | null;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  originalDate: string | null;
  originalTimeSlot: string | null;
  wasEdited: boolean;
  
  // true = approved แล้ว วันนัดผ่านไปแล้ว แต่ยังไม่มีใครยืนยันผล (ดู noShowService.ts ฝั่ง API)
  needsResult: boolean;
  noShowNote: string;
}

const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

type TabKey = 'new' | 'upcoming' | 'needsResult' | 'done';

function formatDateTH(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${MONTH_NAMES_TH[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function timeSlotLabel(slot: string): string {
  return slot === 'afternoon' ? 'ช่วงบ่าย (13:00 น.)' : 'ช่วงเช้า (10:00 น.)';
}

export default function AgentAppointmentsPage() {
  const { status: sessionStatus } = useSession();

  const [appointments, setAppointments] = useState<AgentAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('new');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<'confirm' | 'reject' | 'complete' | 'no_show' | null>(null);
  const [toast, setToast] = useState<{ text: string; kind: 'success' | 'error' } | null>(null);

  // ซ่อนข้อความแจ้งผลอัตโนมัติหลังผ่านไป 3 วินาที
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);

  const todayKey = today.toISOString().split('T')[0];

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/appointments?view=agent');
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      } else if (Array.isArray(data)) {
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error loading agent appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    if (sessionStatus === 'authenticated') {
      const fetchAppointments = () => {
        fetch('/api/appointments?view=agent')
          .then(res => res.json())
          .then(data => {
            if (isSubscribed) {
              if (data.success && Array.isArray(data.appointments)) {
                setAppointments(data.appointments);
              } else if (Array.isArray(data)) {
                setAppointments(data);
              }
            }
          })
          .catch(err => console.error('Error loading agent appointments:', err))
          .finally(() => {
            if (isSubscribed) setLoading(false);
          });
      };

      fetchAppointments();
      const interval = setInterval(fetchAppointments, 3000); // ดึงข้อมูลคิวนัดหมายใหม่เบื้องหลังทุก 3 วินาที

      return () => {
        isSubscribed = false;
        clearInterval(interval);
      };
    }
  }, [sessionStatus]);

  const handleAction = async (id: string, action: 'confirm' | 'reject' | 'complete' | 'no_show', reason?: string) => {
    // การปฏิเสธและ no_show ใช้โมดัลเลือกเหตุผลแทน (ดู rejectingApt / noShowApt) จึงไม่ต้องถามยืนยันซ้ำอีก
    if (action !== 'reject' && action !== 'no_show') {
      const confirmMsg = action === 'confirm'
        ? 'ยืนยันรับคิวนัดหมายนี้ใช่หรือไม่?'
        : 'ทำเครื่องหมายว่านัดหมายนี้เสร็จสิ้นแล้วใช่หรือไม่?';
      if (!confirm(confirmMsg)) return;
    }

    setBusyId(id);
    setBusyAction(action);
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, ...(reason ? { reason } : {}) })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadAppointments();
        setToast({
          kind: 'success',
          text: action === 'confirm'
            ? 'ยืนยันรับคิวเรียบร้อยแล้ว — ย้ายไปแท็บ "นัดหมายเร็วๆ นี้" แล้ว'
            : action === 'reject'
              ? 'ปฏิเสธคำขอเรียบร้อยแล้ว — ย้ายไปแท็บ "เสร็จสิ้น / ยกเลิก" แล้ว'
              : action === 'no_show'
                ? 'บันทึกผลว่าลูกค้าไม่มาตามนัดแล้ว — ย้ายไปแท็บ "เสร็จสิ้น / ยกเลิก" แล้ว'
                : 'ปิดงานนัดหมายเรียบร้อยแล้ว'
        });
      } else {
        setToast({ kind: 'error', text: data.error || 'เกิดข้อผิดพลาด' });
      }
    } catch {
      setToast({ kind: 'error', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  };

  // === โมดัล "ปฏิเสธนัดหมายพร้อมระบุเหตุผล" ===
  // เหตุผลจะถูกส่งไปเก็บใน cancel_reason และแสดงให้ลูกค้าเห็นในหน้านัดหมายของเขา
  const REJECT_REASONS = [
    'ติดนัดหมายอื่นในช่วงเวลานี้',
    'เจ้าของบ้านไม่สะดวกให้เข้าชมวันดังกล่าว',
    'ทรัพย์นี้มีผู้จองหรือปิดการขายแล้ว',
    'ต้องการนัดหมายล่วงหน้ามากกว่านี้',
    'อื่นๆ'
  ];

  const [rejectingApt, setRejectingApt] = useState<AgentAppointment | null>(null);
  const [rejectReasonOption, setRejectReasonOption] = useState<string>(REJECT_REASONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');

  const openRejectModal = (apt: AgentAppointment) => {
    setRejectingApt(apt);
    setRejectReasonOption(REJECT_REASONS[0]);
    setCustomRejectReason('');
  };

  const closeRejectModal = () => {
    setRejectingApt(null);
    setCustomRejectReason('');
  };

  const confirmReject = async () => {
    if (!rejectingApt) return;
    const finalReason = rejectReasonOption === 'อื่นๆ' ? customRejectReason.trim() : rejectReasonOption;
    if (rejectReasonOption === 'อื่นๆ' && !finalReason) {
      setToast({ kind: 'error', text: 'กรุณาระบุเหตุผลในการปฏิเสธ' });
      return;
    }

    const targetId = rejectingApt.id;
    closeRejectModal();
    await handleAction(targetId, 'reject', finalReason);
  };

  // === โมดัล "ยืนยันผลว่าลูกค้าไม่มาตามนัด" (No-show) — mirror โมดัลปฏิเสธด้านบน ===
  // เหตุผลจะถูกส่งไปเก็บใน no_show_note (คนละคอลัมน์กับ cancel_reason)
  const NO_SHOW_REASONS = [
    'ลูกค้าไม่มาตามนัดโดยไม่แจ้งล่วงหน้า',
    'ลูกค้าแจ้งขอยกเลิกกะทันหันหลังถึงเวลานัด',
    'ติดต่อลูกค้าไม่ได้ในวันนัดหมาย',
    'อื่นๆ'
  ];

  const [noShowApt, setNoShowApt] = useState<AgentAppointment | null>(null);
  const [noShowReasonOption, setNoShowReasonOption] = useState<string>(NO_SHOW_REASONS[0]);
  const [customNoShowReason, setCustomNoShowReason] = useState('');

  const openNoShowModal = (apt: AgentAppointment) => {
    setNoShowApt(apt);
    setNoShowReasonOption(NO_SHOW_REASONS[0]);
    setCustomNoShowReason('');
  };

  const closeNoShowModal = () => {
    setNoShowApt(null);
    setCustomNoShowReason('');
  };

  const confirmNoShow = async () => {
    if (!noShowApt) return;
    const finalReason = noShowReasonOption === 'อื่นๆ' ? customNoShowReason.trim() : noShowReasonOption;
    if (noShowReasonOption === 'อื่นๆ' && !finalReason) {
      setToast({ kind: 'error', text: 'กรุณาระบุเหตุผลที่ลูกค้าไม่มาตามนัด' });
      return;
    }

    const targetId = noShowApt.id;
    closeNoShowModal();
    await handleAction(targetId, 'no_show', finalReason);
  };

  const handleCalPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // --- แยกกลุ่มตามแท็บ ---
  const newRequests = useMemo(() => appointments.filter(a => a.status === 'pending'), [appointments]);
  
  // เดิมทั้งคู่ใช้ status === 'approved' ปนกัน (นัดที่ผ่านวันไปแล้วก็ยังอยู่ในนี้) ตอนนี้แยกด้วย
  // needsResult: upcoming = ยังไม่ถึงวันนัด, needsResultList = ถึงวันแล้วรอนายหน้ายืนยันผล
  const upcoming = useMemo(() => appointments.filter(a => a.status === 'approved' && !a.needsResult), [appointments]);
  const needsResultList = useMemo(() => appointments.filter(a => a.needsResult), [appointments]);
  const doneOrCancelled = useMemo(
    () => appointments.filter(a => a.status === 'completed' || a.status === 'rejected' || a.status === 'cancelled' || a.status === 'no_show'),
    [appointments]
  );

  const listForActiveTab =
    activeTab === 'new' ? newRequests :
    activeTab === 'upcoming' ? upcoming :
    activeTab === 'needsResult' ? needsResultList :
    doneOrCancelled;

  // เรียงตามความด่วน (วันที่ใกล้ที่สุดก่อน)
  const sortedList = useMemo(
    () => [...listForActiveTab].sort((a, b) => a.date.localeCompare(b.date)),
    [listForActiveTab]
  );

  // --- สรุปคิวงาน ---
  const upcomingWithin7Days = useMemo(() => {
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    const in7Key = in7.toISOString().split('T')[0];
    return upcoming.filter(a => a.date >= todayKey && a.date <= in7Key).length;
  }, [upcoming, todayKey]);

  const responseRate = useMemo(() => {
    const responded = appointments.filter(a => a.status === 'approved' || a.status === 'completed' || a.status === 'rejected').length;
    const total = appointments.length;
    if (total === 0) return 100;
    return Math.round((responded / total) * 100);
  }, [appointments]);

  // วันที่มีนัดหมายอยู่ (สำหรับจุดจุดบนปฏิทิน)
  const datesWithAppointments = useMemo(() => new Set(appointments.map(a => a.date)), [appointments]);

  const getAppointmentsForDate = (dateStr: string) => appointments.filter(a => a.date === dateStr);

  return (
    <div className="font-sans text-slate-800 text-xs antialiased flex flex-col min-h-screen bg-[#f8fafc]">

      {/* Toast แจ้งผลหลังกดปุ่ม */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] px-5 py-3.5 rounded-2xl shadow-2xl font-extrabold text-xs max-w-sm border-2 ${
          toast.kind === 'success'
            ? 'bg-emerald-600 text-white border-emerald-400'
            : 'bg-red-600 text-white border-red-400'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="pt-6 sm:pt-8 pb-5 px-4 sm:px-6 md:px-8 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/agent/dashboard" className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-base md:text-lg font-black text-slate-900">ระบบจัดการคิวนัดหมาย</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Appointments Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast({ text: 'ฟีเจอร์สร้างนัดหมายด้วยตนเองจะเปิดให้ใช้งานเร็วๆ นี้', kind: 'success' })}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shrink-0 transition cursor-pointer"
          >
            + สร้างนัดหมายด้วยตนเอง
          </button>
        </div>
      </div>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 flex-1">

        {/* ===== Left Column: ปฏิทิน + สรุปคิวงาน ===== */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <button type="button" onClick={handleCalPrevMonth} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="เดือนก่อนหน้า">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-black text-slate-800">{MONTH_NAMES_TH[calMonth]} {calYear + 543}</span>
              <button type="button" onClick={handleCalNextMonth} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" aria-label="เดือนถัดไป">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
              <span className="text-red-500">อา</span>
              <span className="text-slate-400">จ</span>
              <span className="text-slate-400">อ</span>
              <span className="text-slate-400">พ</span>
              <span className="text-slate-400">พฤ</span>
              <span className="text-slate-400">ศ</span>
              <span className="text-blue-500">ส</span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
              {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, idx) => (
                <div key={`cal-empty-${idx}`} className="w-8 h-8"></div>
              ))}

              {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedCalDate === dateStr;
                const isToday = dateStr === todayKey;
                const hasApt = datesWithAppointments.has(dateStr);

                let dayClass = "relative w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ";
                if (isSelected) dayClass += "bg-blue-600 text-white shadow-md cursor-pointer";
                else if (isToday) dayClass += "border-2 border-blue-500 text-blue-700 font-black cursor-pointer";
                else dayClass += "text-slate-600 hover:bg-slate-50 cursor-pointer";

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedCalDate(isSelected ? null : dateStr)}
                    className={dayClass}
                  >
                    {dayNum}
                    {hasApt && (
                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border-2 border-blue-500 inline-block" /> วันนี้</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> มีนัดหมาย</span>
            </div>

            {selectedCalDate && (
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                <p className="text-[10px] font-black text-slate-700">นัดหมายวันที่ {formatDateTH(selectedCalDate)}</p>
                {getAppointmentsForDate(selectedCalDate).length === 0 ? (
                  <p className="text-[10px] text-slate-400 font-bold">ไม่มีนัดหมายในวันนี้</p>
                ) : (
                  getAppointmentsForDate(selectedCalDate).map(a => (
                    <div key={a.id} className="text-[10px] font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                      {timeSlotLabel(a.timeSlot)} — {a.customerName}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h4 className="font-extrabold text-slate-900 text-xs">
              สรุปคิวงานสัปดาห์นี้
            </h4>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold">ต้องยืนยันด่วน</span>
              <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-[10px]">{newRequests.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold">นัดหมายที่จะถึง</span>
              <span className="font-black text-slate-800">{upcomingWithin7Days} คิว</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold">อัตราการตอบกลับ</span>
              <span className="font-black text-emerald-600">{responseRate}% ↑</span>
            </div>
          </div>
        </div>

        {/* ===== Right Column: แท็บ + รายการคำขอ ===== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2.5 border-b-2 font-black text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'new' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                รอยืนยัน (New)
                {newRequests.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />}
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-2.5 border-b-2 font-black text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'upcoming' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                นัดหมายเร็วๆ นี้ (Upcoming)
              </button>
                            <button
                onClick={() => setActiveTab('needsResult')}
                className={`px-4 py-2.5 border-b-2 font-black text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'needsResult' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                รอยืนยันผล
                {needsResultList.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
              </button>
              <button
                onClick={() => setActiveTab('done')}
                className={`px-4 py-2.5 border-b-2 font-black text-xs whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${activeTab === 'done' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-700'}`}
              >
                เสร็จสิ้น / ยกเลิก
                {doneOrCancelled.length > 0 && (
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                    {doneOrCancelled.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-slate-500 font-bold text-xs">
              {loading ? 'กำลังโหลด...' : `พบ ${sortedList.length} คำขอที่รอการจัดการ`}
            </p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : sortedList.length === 0 ? (
              <div className="text-center py-14 bg-white border border-slate-100 rounded-2xl text-slate-400 font-bold">
                ไม่มีนัดหมายในหมวดหมู่นี้
              </div>
            ) : (
              sortedList.map(apt => {
                const mapsUrl = apt.latitude && apt.longitude
                  ? `https://www.google.com/maps/dir/?api=1&destination=${apt.latitude},${apt.longitude}`
                  : (apt.location || apt.propertyTitle)
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(apt.location || apt.propertyTitle)}`
                  : null;

                return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col md:flex-row gap-4 relative overflow-hidden transition-all hover:shadow-md ${
                    apt.status === 'cancelled' || apt.status === 'no_show' ? 'bg-slate-50/80 border-red-200 opacity-80' : 'border-slate-100'
                  }`}
                >

                  {/* แถบสีข้างซ้ายบอกสถานะ — needsResult แยกเป็นสีส้มเหมือน pending เพื่อบอกว่า "ต้องรีบจัดการ" */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    apt.status === 'pending' ? 'bg-amber-400' :
                    apt.needsResult ? 'bg-amber-500' :
                    apt.status === 'approved' ? 'bg-blue-500' :
                    apt.status === 'completed' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />

                  <div className="flex-1 pl-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-black text-xs shrink-0">
                        {apt.customerName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xs">{apt.customerName}</h3>
                        <p className="text-[9px] text-slate-400 font-bold">
                          เบอร์โทร: {apt.customerPhone || 'ไม่ระบุ'}
                        </p>
                      </div>
                      <span className={`ml-auto text-[9px] font-black px-2 py-1 rounded-full border ${
                        apt.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        apt.needsResult ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        apt.status === 'approved' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        apt.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {apt.needsResult ? 'รอยืนยันผล' : apt.status === 'pending' ? 'รอยืนยัน' : apt.status === 'approved' ? 'ยืนยันแล้ว' : apt.status === 'completed' ? 'เสร็จสิ้น' : apt.status === 'cancelled' ? 'ลูกค้ายกเลิกแล้ว' : apt.status === 'no_show' ? 'ไม่มาตามนัด' : 'ปฏิเสธแล้ว'}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase">รายละเอียดคำขอ</p>

                      {apt.wasEdited && apt.originalDate && (
                        <p className="text-[10px] text-slate-400 font-bold line-through">
                          {formatDateTH(apt.originalDate)}, {timeSlotLabel(apt.originalTimeSlot || 'morning')}
                        </p>
                      )}

                      <p className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{formatDateTH(apt.date)}, {timeSlotLabel(apt.timeSlot)}</span>
                        {apt.wasEdited && <span className="text-[9px] font-bold text-blue-600">(แก้ไขใหม่)</span>}
                      </p>

                      {apt.note && (
                        <p className="text-[10px] text-slate-500 italic">&ldquo;{apt.note}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end gap-3 md:w-48 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <div className="relative w-12 h-9 rounded-lg overflow-hidden border shrink-0">
                        <Image src={apt.propertyImage} alt={apt.propertyTitle} fill className="object-cover" unoptimized />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] text-slate-400 font-bold uppercase">อสังหาฯ ที่สนใจ</p>
                        <p className="text-[10px] font-extrabold text-slate-800 line-clamp-1">{apt.propertyTitle}</p>
                      </div>
                    </div>

                    <div className="flex md:flex-col gap-1.5 w-full">
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-[10px] shadow-xs active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
                          title="เปิด Google Maps นำทางขับรถไปบ้านหลังนี้"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>นำทางไปบ้าน</span>
                        </a>
                      )}

                      {apt.customerPhone && (
                        <a
                          href={`tel:${apt.customerPhone}`}
                          className="w-full text-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] shadow-xs active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-3 h-3" />
                          <span>โทร: {apt.customerPhone}</span>
                        </a>
                      )}

                      {apt.status === 'pending' && (
                        <>
                          <button
                            disabled={busyId === apt.id}
                            onClick={() => handleAction(apt.id, 'confirm')}
                            className="flex-1 md:w-full px-3 py-2.5 bg-slate-900 hover:bg-emerald-600 text-white font-extrabold rounded-lg text-[10px] shadow-md hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-wait disabled:hover:bg-slate-900 disabled:hover:translate-y-0 flex items-center justify-center gap-1.5"
                          >
                            {busyId === apt.id && busyAction === 'confirm' ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                กำลังยืนยัน...
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
                                <span>ยืนยันรับคิวนี้</span>
                              </>
                            )}
                          </button>
                          <div className="flex gap-1.5 w-full">
                            <button 
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/chat/sessions', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ propertyId: apt.propertyId })
                                  });
                                  const data = await res.json();
                                  if (data.success) {
                                    window.location.href = `/agent/chat`;
                                  } else {
                                    window.location.href = '/agent/chat';
                                  }
                                } catch {
                                  window.location.href = '/agent/chat';
                                }
                              }}
                              className="flex-1 text-center px-3 py-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold rounded-lg text-[10px] transition-all duration-150 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>แชทคุย</span>
                            </button>
                            <button
                              disabled={busyId === apt.id}
                              onClick={() => openRejectModal(apt)}
                              className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 hover:border-red-500 font-bold rounded-lg text-[10px] transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                            >
                              {busyId === apt.id && busyAction === 'reject' ? 'กำลังปฏิเสธ...' : 'ปฏิเสธ'}
                            </button>
                          </div>
                        </>
                      )}

                                            {apt.status === 'approved' && !apt.needsResult && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/chat/sessions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ propertyId: apt.propertyId })
                              });
                              const data = await res.json();
                              if (data.success) {
                                window.location.href = `/agent/chat`;
                              } else {
                                window.location.href = '/agent/chat';
                              }
                            } catch {
                              window.location.href = '/agent/chat';
                            }
                          }}
                          className="w-full text-center px-3 py-2 bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 text-slate-700 font-bold rounded-lg text-[10px] transition-all duration-150 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>แชทคุย</span>
                        </button>
                      )}

                                            {apt.needsResult && (
                        <>
                          <button
                            disabled={busyId === apt.id}
                            onClick={() => handleAction(apt.id, 'complete')}
                            className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-1.5"
                          >
                            {busyId === apt.id && busyAction === 'complete' ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                กำลังบันทึก...
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>ลูกค้ามาแล้ว</span>
                              </>
                            )}
                          </button>
                          <button
                            disabled={busyId === apt.id}
                            onClick={() => openNoShowModal(apt)}
                            className="w-full px-3 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 border border-red-200 hover:border-red-500 font-bold rounded-lg text-[10px] transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-1.5"
                          >
                            {busyId === apt.id && busyAction === 'no_show' ? (
                              'กำลังบันทึก...'
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>ลูกค้าไม่มา</span>
                              </>
                            )}
                          </button>
                        </>
                      )}

                      {(apt.status === 'completed' || apt.status === 'rejected' || apt.status === 'no_show') && (
                        <span className="text-[10px] text-slate-400 font-bold text-center w-full flex items-center justify-center gap-1">
                          {apt.status === 'completed' ? (
                            <>
                              <span>ปิดงานแล้ว</span>
                              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </>
                          ) : apt.status === 'no_show' ? (
                            'บันทึกว่าไม่มาตามนัด'
                          ) : (
                            'ถูกปฏิเสธไปแล้ว'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </main>

            {rejectingApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-red-600 text-base flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>ปฏิเสธคำขอนัดหมาย</span>
              </h3>
              <button onClick={closeRejectModal} className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1" aria-label="ปิด">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500">คำขอจาก:</p>
              <p className="text-sm font-extrabold text-slate-900">{rejectingApt.customerName}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{rejectingApt.propertyTitle}</p>
              <p className="text-[11px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatDateTH(rejectingApt.date)}, {timeSlotLabel(rejectingApt.timeSlot)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">กรุณาเลือกเหตุผลในการปฏิเสธ:</label>

              {REJECT_REASONS.map((reasonOpt, idx) => (
                <label key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="agentRejectReason"
                    value={reasonOpt}
                    checked={rejectReasonOption === reasonOpt}
                    onChange={(e) => setRejectReasonOption(e.target.value)}
                    className="accent-red-600"
                  />
                  <span>{reasonOpt}</span>
                </label>
              ))}

              {rejectReasonOption === 'อื่นๆ' && (
                <textarea
                  rows={2}
                  placeholder="พิมพ์ระบุเหตุผลเพิ่มเติม..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 mt-2"
                />
              )}
            </div>

            <p className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
              ℹ️ ลูกค้าจะเห็นเหตุผลนี้ และรอบเวลานี้จะกลับมาเปิดให้จองใหม่ทันที
            </p>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={busyId === rejectingApt.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow disabled:opacity-50"
              >
                {busyId === rejectingApt.id ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}

            {noShowApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-red-600 text-base flex items-center gap-1.5">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <span>ยืนยันว่าลูกค้าไม่มาตามนัด</span>
              </h3>
              <button onClick={closeNoShowModal} className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1" aria-label="ปิด">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500">นัดหมายของ:</p>
              <p className="text-sm font-extrabold text-slate-900">{noShowApt.customerName}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5 line-clamp-1">{noShowApt.propertyTitle}</p>
              <p className="text-[11px] font-bold text-slate-600 mt-1 flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateTH(noShowApt.date)}, {timeSlotLabel(noShowApt.timeSlot)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">กรุณาเลือกเหตุผล:</label>

              {NO_SHOW_REASONS.map((reasonOpt, idx) => (
                <label key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="agentNoShowReason"
                    value={reasonOpt}
                    checked={noShowReasonOption === reasonOpt}
                    onChange={(e) => setNoShowReasonOption(e.target.value)}
                    className="accent-red-600"
                  />
                  <span>{reasonOpt}</span>
                </label>
              ))}

              {noShowReasonOption === 'อื่นๆ' && (
                <textarea
                  rows={2}
                  placeholder="พิมพ์ระบุเหตุผลเพิ่มเติม..."
                  value={customNoShowReason}
                  onChange={(e) => setCustomNoShowReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 mt-2"
                />
              )}
            </div>

            <p className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
              ℹ️ ลูกค้าจะเห็นบันทึกนี้ และไม่สามารถรีวิวนัดหมายนี้ได้ — ถ้าลูกค้าเบี้ยวนัดสะสมครบ
              จำนวนที่กำหนด ระบบจะจำกัดการจองนัดใหม่ชั่วคราว
            </p>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeNoShowModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={confirmNoShow}
                disabled={busyId === noShowApt.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow disabled:opacity-50"
              >
                {busyId === noShowApt.id ? 'กำลังบันทึก...' : 'ยืนยันว่าไม่มาตามนัด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}