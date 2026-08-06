'use client';

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
  agentName: string;
  agentPhone: string;
  agentImage?: string;
}

interface EditableSlot {
  date: string;
  timeSlot: 'morning' | 'afternoon';
  isBooked: boolean;
}

const MONTH_NAMES_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // === ดึงข้อมูลคิวนัดหมายจริงจาก PostgreSQL API ===
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

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        if (!ignore && data.success && Array.isArray(data.appointments)) {
          setAppointments(data.appointments);
        }
      } catch (err) {
        console.error('Error fetching appointments:', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchData();
    return () => { ignore = true; };
  }, []);

  // === กดยกเลิกนัดหมาย (ส่ง DELETE ลง DB จริง + อัปเดต UI ทันที) ===
  const handleCancelAppointment = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกนัดหมายนี้?')) return;

    // 1) อัปเดต UI ทันที 0 วินาที
    setAppointments(prev => prev.map(a => String(a.id) === String(id) ? { ...a, status: 'cancelled' } : a));
    setActiveTab('cancelled');

    try {
      // 2) ส่ง DELETE ลง PostgreSQL จริง
      const res = await fetch(`/api/appointments?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadAppointments();
      }
    } catch (err) {
      console.error('Cancel appointment error:', err);
    }
  };

  // === ปุ่ม "แก้ไขวัน/รอบ" ===
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slotsForEdit, setSlotsForEdit] = useState<EditableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedNewDate, setSelectedNewDate] = useState<string | null>(null);
  const [selectedNewSlot, setSelectedNewSlot] = useState<'morning' | 'afternoon' | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const editingAppointment = appointments.find(a => String(a.id) === String(editingId)) || null;

  const openEditModal = async (apt: AppointmentItem) => {
    setEditingId(apt.id);
    setEditError('');
    setSelectedNewDate(apt.date);
    setSelectedNewSlot((apt.timeSlot as 'morning' | 'afternoon') || 'morning');
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/properties/viewing-slots?propertyId=${apt.propertyId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setSlotsForEdit(data.slots);
      } else {
        setSlotsForEdit([]);
      }
    } catch {
      setSlotsForEdit([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const closeEditModal = () => {
    setEditingId(null);
    setSlotsForEdit([]);
    setSelectedNewDate(null);
    setSelectedNewSlot(null);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment || !selectedNewDate || !selectedNewSlot) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingAppointment.id, date: selectedNewDate, timeSlot: selectedNewSlot })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadAppointments();
        closeEditModal();
      } else {
        setEditError(data.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    } catch {
      setEditError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSavingEdit(false);
    }
  };

  // แยกกลุ่มแท็บและนับจำนวน
  const upcomingCount = appointments.filter(
    apt => apt.status === 'approved' || apt.status === 'pending' || apt.status === 'upcoming'
  ).length;

  const cancelledCount = appointments.filter(
    apt => apt.status === 'cancelled' || apt.status === 'rejected'
  ).length;

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'approved':
      case 'upcoming':
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

  // 📌 การกรองข้อมูลสำหรับแท็บ (100% strict)
  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'upcoming') {
      return apt.status === 'approved' || apt.status === 'pending';
    }
    if (activeTab === 'past') {
      return apt.status === 'completed';
    }
    if (activeTab === 'cancelled') {
      return apt.status === 'cancelled' || apt.status === 'rejected';
    }
    return false;
  });

  const [reviewModalApt, setReviewModalApt] = useState<{ id: string; agentName: string; propertyName: string } | null>(null);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      {/* Header Bar */}
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
        {/* Tabs Bar */}
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

        {/* List Section */}
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
                  {/* วันที่และเวลา */}
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

                  {/* รายละเอียดบ้านและนายหน้า */}
                  <div className="flex-1 space-y-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-black ${statusDetails.bg} ${statusDetails.color}`}>
                      {statusDetails.text}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{apt.propertyName}</h3>
                    <div className="text-blue-700 font-extrabold text-xs">{apt.propertyPrice}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                      <span>นายหน้า: {apt.agentName} ({apt.agentPhone})</span>
                    </div>
                  </div>

                  {/* ปุ่มกดกระทำ */}
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

                    {apt.status === 'pending' && (
                      <button
                        onClick={() => openEditModal(apt)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        แก้ไขวัน/รอบ
                      </button>
                    )}

                    {apt.status === 'completed' && (
                      <button 
                        onClick={() => setReviewModalApt({ id: String(apt.id), agentName: apt.agentName, propertyName: apt.propertyName })}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        ⭐ ให้คะแนนการบริการ
                      </button>
                    )}

                    {(apt.status === 'approved' || apt.status === 'upcoming' || apt.status === 'pending') && (
                      <button 
                        onClick={() => handleCancelAppointment(String(apt.id))}
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

      {/* Edit Appointment Modal */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">✏️ แก้ไขวัน / รอบเวลานัดหมาย</h3>
              <button onClick={closeEditModal} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
            </div>
            
            <div>
              <p className="text-xs font-bold text-slate-500">อสังหาริมทรัพย์:</p>
              <p className="text-sm font-extrabold text-slate-900">{editingAppointment.propertyName}</p>
            </div>

            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                ⚠️ {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกวันที่ต้องการเปลี่ยน:</label>
                <input 
                  type="date" 
                  value={selectedNewDate || ''} 
                  onChange={(e) => setSelectedNewDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">เลือกรอบเวลา:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNewSlot('morning')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer transition ${
                      selectedNewSlot === 'morning' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🌅 ช่วงเช้า (10:00 - 12:00 น.)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedNewSlot('afternoon')}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold cursor-pointer transition ${
                      selectedNewSlot === 'afternoon' ? 'bg-blue-600 text-white border-blue-600 shadow' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    🌇 ช่วงบ่าย (14:00 - 16:00 น.)
                  </button>
                </div>
              </div>

              {loadingSlots && (
                <p className="text-[11px] text-slate-400 font-bold text-center">กำลังตรวจสอบรอบเวลาที่ว่าง...</p>
              )}

              {slotsForEdit.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700">รอบที่ว่างของบ้านนี้:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {slotsForEdit.map((s, idx) => (
                      <span 
                        key={idx} 
                        onClick={() => {
                          setSelectedNewDate(s.date);
                          setSelectedNewSlot(s.timeSlot);
                        }}
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold cursor-pointer ${
                          selectedNewDate === s.date && selectedNewSlot === s.timeSlot ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 hover:bg-blue-50'
                        }`}
                      >
                        {s.date} ({s.timeSlot === 'morning' ? 'เช้า' : 'บ่าย'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow disabled:opacity-50"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
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