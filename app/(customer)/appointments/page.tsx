'use client';

/**
 * ==============================================================================
 * หน้าประวัติรายการนัดหมายสำหรับลูกค้า (Customer Appointments Page)
 * /app/(customer)/appointments/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงรายการนัดหมายเข้าชมบ้านของลูกค้า แบ่งเป็น 3 แท็บ:
 *    - "กำลังจะมาถึง / รอยืนยัน" (status: approved, pending)
 *    - "ประวัติที่ผ่านมา" (status: completed)
 *    - "ยกเลิกแล้ว / ปฏิเสธแล้ว" (status: cancelled, rejected)
 * 2. รองรับการยกเลิกนัดหมายพร้อมเลือก/พิมพ์ระบุเหตุผล (ยิง DELETE /api/appointments)
 * 3. เปิดทางลัดส่งข้อความแชทตรงถึงนายหน้าผู้ดูแลทรัพย์สิน (`/chat?sessionId=...`)
 * 4. รองรับการให้คะแนนรีวิวนายหน้าสำหรับการนัดหมายที่เข้าชมเสร็จสิ้นแล้ว (`ReviewModal`)
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import ReviewModal from '@/components/customer/ReviewModal';

interface AppointmentItem {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyPrice: string;
  propertyImage: string;
  propertyType?: string;
  date: string;
  timeSlot: string;
  timeSlotText: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | string;
  note: string;
  cancelReason?: string;
  agentName: string;
  agentPhone: string;
  agentImage?: string;
}

const MONTH_NAMES_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

// ฟังก์ชันช่วยคืนค่าสีและข้อความตามสถานะการนัดหมาย
const getStatusDetails = (status: string) => {
  switch (status) {
    case 'approved':
      return { text: "ยืนยันแล้ว", bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700" };
    case 'pending':
      return { text: "รอยืนยันคิว", bg: "bg-amber-50 border-amber-200", color: "text-amber-700" };
    case 'cancelled':
      return { text: "ยกเลิกแล้ว", bg: "bg-red-50 border-red-200", color: "text-red-700" };
    case 'rejected':
      return { text: "ปฏิเสธแล้ว", bg: "bg-rose-50 border-rose-200", color: "text-rose-700" };
    default:
      return { text: "เข้าชมแล้ว", bg: "bg-slate-100 border-slate-200", color: "text-slate-600" };
  }
};

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------------------------
  // 1. ฟังก์ชันโหลด/รีเฟรชข้อมูลคิวนัดหมายจาก API หลังบ้าน (/api/appointments)
  // ----------------------------------------------------------------------------
  const loadAppointments = useCallback(async () => {
    try {
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ใช้ asynchronous promise callback (.then) ภายใน useEffect เพื่อป้องกันเตือน Cascading Renders
  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.appointments)) {
          setAppointments(data.appointments);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ----------------------------------------------------------------------------
  // 2. ระบบโมดัลยกเลิกนัดหมายแบบระบุเหตุผล (Cancel Modal Logic)
  // ----------------------------------------------------------------------------
  const [cancelingApt, setCancelingApt] = useState<AppointmentItem | null>(null);
  const [cancelReasonOption, setCancelReasonOption] = useState<string>('ติดภารกิจด่วน / การเดินทางไม่สะดวก');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const openCancelModal = (apt: AppointmentItem) => {
    setCancelingApt(apt);
    setCancelReasonOption('ติดภารกิจด่วน / การเดินทางไม่สะดวก');
    setCustomReasonText('');
  };

  const closeCancelModal = () => {
    setCancelingApt(null);
    setCancelReasonOption('ติดภารกิจด่วน / การเดินทางไม่สะดวก');
    setCustomReasonText('');
  };

  // ยืนยันการยกเลิกนัดหมายลงฐานข้อมูลจริง
  const confirmCancelAppointment = async () => {
    if (!cancelingApt) return;
    const finalReason = cancelReasonOption === 'อื่นๆ' ? customReasonText.trim() : cancelReasonOption;
    if (cancelReasonOption === 'อื่นๆ' && !finalReason) {
      alert('กรุณาระบุเหตุผลการยกเลิก');
      return;
    }

    setSubmittingCancel(true);

    // อัปเดต UI หน้าบ้านทันทีเพื่อความรวดเร็ว (Optimistic UI)
    setAppointments(prev => prev.map(a => String(a.id) === String(cancelingApt.id) ? { ...a, status: 'cancelled', cancelReason: finalReason } : a));
    setActiveTab('cancelled');

    try {
      // ส่งคำขอยกเลิกนัดหมายไปยัง API หลังบ้าน
      const res = await fetch(`/api/appointments?id=${encodeURIComponent(cancelingApt.id)}&reason=${encodeURIComponent(finalReason)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadAppointments();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการยกเลิกนัดหมาย');
        await loadAppointments();
      }
    } catch (err) {
      console.error('Cancel appointment error:', err);
    } finally {
      setSubmittingCancel(false);
      closeCancelModal();
    }
  };

  // ----------------------------------------------------------------------------
  // 3. คำนวณยอดรวมนัดหมายในแต่ละกลุ่ม และกรองรายการตามแท็บที่เลือก
  // ----------------------------------------------------------------------------
  const upcomingCount = appointments.filter(apt => apt.status === 'approved' || apt.status === 'pending').length;
  const cancelledCount = appointments.filter(apt => apt.status === 'cancelled' || apt.status === 'rejected').length;

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'upcoming') return apt.status === 'approved' || apt.status === 'pending';
    if (activeTab === 'past') return apt.status === 'completed';
    if (activeTab === 'cancelled') return apt.status === 'cancelled' || apt.status === 'rejected';
    return false;
  });

  const [reviewModalApt, setReviewModalApt] = useState<{ id: string; agentName: string; propertyName: string } | null>(null);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      {/* 4.1 แบนเนอร์หัวข้อหน้า */}
      <div className="pt-8 pb-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <span className="text-2xl bg-amber-100 text-amber-500 w-12 h-12 flex items-center justify-center rounded-xl shadow-sm">📅</span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ประวัติการนัดหมายของคุณ</h1>
            <p className="text-slate-500 text-xs">จัดการตารางเข้าชมอสังหาริมทรัพย์และติดตามสถานะคิวการยืนยันการนัดหมาย</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow">
        {/* 4.2 เมนูแท็บสลับสถานะ */}
        <div className="flex space-x-3 mb-6 border-b border-slate-200 pb-1">
          <button 
            onClick={() => setActiveTab('upcoming')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'upcoming' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            กำลังจะมาถึง / รอยืนยัน 
            {upcomingCount > 0 && (
              <span className="bg-red-500 text-white ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black">{upcomingCount}</span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('past')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'past' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ประวัติที่ผ่านมา
          </button>

          <button 
            onClick={() => setActiveTab('cancelled')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'cancelled' ? 'border-slate-900 text-slate-900 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ยกเลิกแล้ว
            {cancelledCount > 0 && (
              <span className="bg-slate-200 text-slate-700 ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{cancelledCount}</span>
            )}
          </button>
        </div>

        {/* 4.3 รายการการ์ดนัดหมาย */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-slate-100 rounded-2xl text-slate-400 font-bold">
              ไม่มีข้อมูลการนัดหมายในหมวดหมู่นี้
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const statusDetails = getStatusDetails(apt.status);
              const dateObj = new Date(apt.date);
              const dayStr = isNaN(dateObj.getTime()) ? apt.date : dateObj.getDate().toString();
              const monthStr = isNaN(dateObj.getTime()) ? 'ส.ค.' : MONTH_NAMES_TH[dateObj.getMonth()];
              
              return (
                <div 
                  key={apt.id} 
                  className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-sm flex flex-col lg:flex-row gap-4 hover:shadow-md transition relative overflow-hidden ${
                    apt.status === 'cancelled' || apt.status === 'rejected' ? 'bg-slate-50/80 border-slate-200 opacity-85' : 'border-slate-200'
                  }`}
                >
                  {/* แสดงวันที่และรอบเวลา */}
                  <div className="flex gap-3 sm:gap-4 items-center w-full lg:w-1/3">
                    <div className="w-16 h-20 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="text-[10px] font-bold text-red-500 uppercase">{monthStr}</span>
                      <span className="text-2xl font-extrabold text-slate-900 leading-none my-0.5">{dayStr}</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded shadow-sm mt-1">{apt.timeSlotText || apt.timeSlot}</span>
                    </div>
                    <div className="w-full h-20 rounded-lg overflow-hidden relative border border-slate-100">
                      <Image 
                        src={apt.propertyImage || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600"} 
                        width={120} 
                        height={80} 
                        className="w-full h-full object-cover" 
                        alt={apt.propertyName} 
                        unoptimized
                      />
                    </div>
                  </div>

                  {/* รายละเอียดทรัพย์สิน ชื่อนายหน้า และเหตุผลการยกเลิก (ถ้ามี) */}
                  <div className="flex-1 space-y-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-black ${statusDetails.bg} ${statusDetails.color}`}>
                      {statusDetails.text}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{apt.propertyName}</h3>
                    <div className="text-blue-700 font-extrabold text-xs">{apt.propertyPrice}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span>นายหน้า: {apt.agentName} ({apt.agentPhone})</span>
                    </div>
                    {apt.cancelReason && (
                      <div className="mt-1.5 text-xs bg-red-50 text-red-700 p-2 rounded-lg border border-red-100 font-bold flex items-start gap-1">
                        <span>💬</span>
                        <span>เหตุผลการยกเลิก: {apt.cancelReason}</span>
                      </div>
                    )}
                  </div>

                  {/* ปุ่มการทำงาน (แชทกับนายหน้า, ให้คะแนนรีวิว, ยกเลิกนัด) */}
                  <div className="flex items-center justify-end gap-2 border-t lg:border-t-0 pt-3 lg:pt-0">
                    <button 
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/chat/sessions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ propertyId: apt.propertyId })
                          });
                          const data = await res.json();
                          if (data.success && data.sessionId) {
                            window.location.href = `/chat?sessionId=${data.sessionId}`;
                          } else {
                            window.location.href = '/chat';
                          }
                        } catch {
                          window.location.href = '/chat';
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition cursor-pointer"
                    >
                      💬 แชทกับนายหน้า
                    </button>

                    {apt.status === 'completed' && (
                      <button 
                        onClick={() => setReviewModalApt({ id: String(apt.id), agentName: apt.agentName, propertyName: apt.propertyName })}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        ⭐ ให้คะแนนการบริการ
                      </button>
                    )}

                    {(apt.status === 'approved' || apt.status === 'pending') && (
                      <button 
                        onClick={() => openCancelModal(apt)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs transition cursor-pointer active:scale-95"
                      >
                        ยกเลิกนัด
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4.4 โมดัลยืนยันการยกเลิกนัดหมายแบบระบุเหตุผล */}
      {cancelingApt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-red-600 text-base flex items-center gap-1.5">
                <span>🚨</span> ยืนยันการยกเลิกนัดหมาย
              </h3>
              <button onClick={closeCancelModal} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-500">อสังหาริมทรัพย์ที่ขอนัดดู:</p>
              <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{cancelingApt.propertyName}</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">นายหน้า: {cancelingApt.agentName}</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-slate-700">กรุณาเลือกเหตุผลในการยกเลิก:</label>
              
              {[
                "ติดภารกิจด่วน / การเดินทางไม่สะดวก",
                "ได้อสังหาริมทรัพย์หลังอื่นแล้ว",
                "ต้องการเปลี่ยนไปจองวัน/เวลารอบใหม่",
                "งบประมาณหรือแผนเปลี่ยน",
                "อื่นๆ"
              ].map((reasonOpt, idx) => (
                <label key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition cursor-pointer text-xs font-bold text-slate-700">
                  <input 
                    type="radio" 
                    name="cancelReasonOption" 
                    value={reasonOpt} 
                    checked={cancelReasonOption === reasonOpt}
                    onChange={(e) => setCancelReasonOption(e.target.value)}
                    className="accent-red-600"
                  />
                  <span>{reasonOpt}</span>
                </label>
              ))}

              {cancelReasonOption === 'อื่นๆ' && (
                <textarea
                  rows={2}
                  placeholder="พิมพ์ระบุเหตุผลเพิ่มเติม..."
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 mt-2"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeCancelModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={confirmCancelAppointment}
                disabled={submittingCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow disabled:opacity-50"
              >
                {submittingCancel ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกนัด'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4.5 โมดัลสำหรับให้คะแนนรีวิวนายหน้า */}
      {reviewModalApt && (
        <ReviewModal
          isOpen={true}
          appointmentId={reviewModalApt.id}
          agentName={reviewModalApt.agentName}
          propertyName={reviewModalApt.propertyName}
          onClose={() => setReviewModalApt(null)}
          onSuccess={() => {
            setReviewModalApt(null);
            loadAppointments();
          }}
        />
      )}
    </div>
  );
}