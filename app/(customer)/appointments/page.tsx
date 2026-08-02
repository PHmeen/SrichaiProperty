'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import ReviewModal from '@/components/customer/ReviewModal';

interface EditableSlot {
  date: string;
  timeSlot: 'morning' | 'afternoon';
  isBooked: boolean;
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const { appointments, cancelAppointment, editAppointmentDate } = useApp();

  // === ปุ่ม "แก้ไขวัน/รอบ" (เปิดได้เฉพาะนัดหมายที่ยังสถานะ pending) ===
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [slotsForEdit, setSlotsForEdit] = useState<EditableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedNewDate, setSelectedNewDate] = useState<string | null>(null);
  const [selectedNewSlot, setSelectedNewSlot] = useState<'morning' | 'afternoon' | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const editingAppointment = appointments.find(a => a.id === editingId) || null;

  const openEditModal = async (apt: typeof appointments[number]) => {
    setEditingId(apt.id);
    setEditError('');
    setSelectedNewDate(apt.date);
    setSelectedNewSlot((apt.rawTimeSlot as 'morning' | 'afternoon') || 'morning');
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
    const result = await editAppointmentDate(editingAppointment.id, selectedNewDate, selectedNewSlot);
    setSavingEdit(false);
    if (result.success) {
      closeEditModal();
    } else {
      setEditError(result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
  };

  // จัดกลุ่มวันว่างตามวันที่ เพื่อแสดงเป็นรายการเลือกในโมดัล
  // - ตัดวันที่ผ่านมาแล้วออก (กันข้อมูลเก่าตกค้างโผล่มาให้เลือก) ยกเว้นวันที่จองอยู่ตอนนี้ (ต้องเห็นไว้เทียบ)
  // - เรียงให้ "วันที่ลูกค้าจองอยู่ตอนนี้" ขึ้นเป็นอันดับแรกเสมอ ตามด้วยวันอื่นๆ เรียงจากใกล้ไปไกล
  const todayKeyForEdit = new Date().toISOString().split('T')[0];
  const datesGroup = Array.from(new Set(slotsForEdit.map(s => s.date)))
    .filter(d => d >= todayKeyForEdit || d === editingAppointment?.date)
    .sort((a, b) => {
      const currentDate = editingAppointment?.date;
      if (a === currentDate) return -1;
      if (b === currentDate) return 1;
      return a.localeCompare(b);
    });

  const upcomingCount = appointments.filter(
    apt => apt.status === 'upcoming' || apt.status === 'pending'
  ).length;

  const getStatusDetails = (status: string) => {
    switch (status) {
      case 'upcoming':
        return { text: "ยืนยันแล้ว", bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-700" };
      case 'pending':
        return { text: "รอยืนยันคิว", bg: "bg-amber-50 border-amber-200", color: "text-amber-700" };
      case 'cancelled':
        return { text: "ยกเลิกแล้ว", bg: "bg-red-50 border-red-200", color: "text-red-700" };
      default:
        return { text: "เข้าชมแล้ว", bg: "bg-slate-100 border-slate-200", color: "text-slate-600" };
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'upcoming') {
      return apt.status === 'upcoming' || apt.status === 'pending';
    }
    return apt.status === activeTab;
  });

  const [reviewModalApt, setReviewModalApt] = useState<{ id: string; agentName: string; propertyName: string } | null>(null);

  const handleOpenReview = (id: string, agentName: string, propertyName: string) => {
    setReviewModalApt({ id, agentName, propertyName });
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
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
        <div className="flex space-x-3 mb-6 border-b border-slate-200 pb-1">
          <button 
            onClick={() => setActiveTab('upcoming')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'upcoming' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            กำลังจะมาถึง / รอยืนยัน 
            {upcomingCount > 0 && (
              <span className="bg-red-500 text-white ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold">{upcomingCount}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('past')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'past' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ประวัติที่ผ่านมา
          </button>
          <button 
            onClick={() => setActiveTab('cancelled')} 
            className={`px-4 py-2 border-b-2 font-bold text-xs whitespace-nowrap transition cursor-pointer ${activeTab === 'cancelled' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            ยกเลิกแล้ว
          </button>
        </div>

        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-100 rounded-2xl text-slate-400">
              ไม่มีข้อมูลการนัดหมายในหมวดหมู่นี้
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const statusDetails = getStatusDetails(apt.status);
              const dateObj = new Date(apt.date);
              const dayStr = isNaN(dateObj.getTime()) ? apt.date : dateObj.getDate().toString();
              const monthStr = isNaN(dateObj.getTime()) ? 'ก.ค.' : dateObj.toLocaleDateString('th-TH', { month: 'short' });
              
              return (
                <div 
                  key={apt.id} 
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 hover:shadow-md transition relative overflow-hidden"
                >
                  <div className="flex gap-3 sm:gap-4 items-center w-full lg:w-1/3">
                    <div className="w-16 h-20 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="text-[10px] font-bold text-red-500 uppercase">{monthStr}</span>
                      <span className="text-2xl font-extrabold text-slate-900 leading-none my-0.5">{dayStr}</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded shadow-sm mt-1">{apt.timeSlot}</span>
                    </div>
                    <div className="w-full h-20 rounded-lg overflow-hidden relative">
                      <Image src={apt.propertyImage} width={120} height={80} className="w-full h-full object-cover" alt={apt.propertyName} />
                      <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">{apt.propertyType}</div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-bold ${statusDetails.bg} ${statusDetails.color}`}>
                      {statusDetails.text}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{apt.propertyName}</h3>
                    <div className="text-blue-700 font-extrabold text-xs">{apt.propertyPrice}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Image src={apt.agentImage} width={20} height={20} className="w-5 h-5 rounded-full" alt={apt.agentName} />
                      <span>นายหน้า: {apt.agentName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-3 md:pt-0">
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
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        แก้ไขวัน/รอบ
                      </button>
                    )}
                    {apt.status === 'past' && (
                      <button 
                        onClick={() => handleOpenReview(String(apt.id), apt.agentName, apt.propertyName)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-xs transition cursor-pointer flex items-center gap-1"
                      >
                        ⭐ ให้คะแนนการบริการ
                      </button>
                    )}
                    {(apt.status === 'upcoming' || apt.status === 'pending') && (
                      <button 
                        onClick={() => {
                          if (confirm('คุณแน่ใจหรือไม่ว่าต้องการยกเลิกนัดหมายนี้?')) {
                            cancelAppointment(apt.id);
                          }
                        }}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs transition cursor-pointer"
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

      {/* ===== Modal: แก้ไขวัน/รอบที่จอง ===== */}
      {editingAppointment && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">แก้ไขวัน/รอบเข้าชม</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{editingAppointment.propertyName}</p>
              </div>
              <button onClick={closeEditModal} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-sm">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500 font-bold">
                วันเดิมที่จอง: {editingAppointment.date} — {editingAppointment.timeSlot}
              </p>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : datesGroup.length === 0 ? (
                <p className="text-center text-slate-400 font-bold text-xs py-6">ยังไม่มีวันว่างที่เปิดให้จองสำหรับบ้านหลังนี้</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {datesGroup.map(dateStr => (
                    <div key={dateStr}>
                      <p className="text-[10px] font-black text-slate-700 mb-1.5">{dateStr}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['morning', 'afternoon'] as const).map(slot => {
                          const found = slotsForEdit.find(s => s.date === dateStr && s.timeSlot === slot);
                          if (!found) return null;

                          const isCurrentSlot = editingAppointment.date === dateStr && editingAppointment.rawTimeSlot === slot;
                          const isDisabled = found.isBooked && !isCurrentSlot;
                          const isSelected = selectedNewDate === dateStr && selectedNewSlot === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => { setSelectedNewDate(dateStr); setSelectedNewSlot(slot); }}
                              className={`p-2.5 rounded-xl border text-left transition ${
                                isDisabled
                                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : isSelected
                                    ? 'border-blue-500 bg-blue-50 cursor-pointer'
                                    : 'border-slate-200 hover:border-blue-400 cursor-pointer'
                              }`}
                            >
                              <p className="text-[10px] font-black">{slot === 'morning' ? 'รอบเช้า' : 'รอบบ่าย'}</p>
                              <p className="text-[9px] font-bold text-slate-400">{slot === 'morning' ? '09:00 - 12:00' : '13:00 - 17:00'}</p>
                              {isCurrentSlot && <p className="text-[9px] font-black text-blue-600 mt-1">รอบที่จองอยู่</p>}
                              {isDisabled && <p className="text-[9px] font-black text-red-400 mt-1">ถูกจองแล้ว</p>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editError && (
                <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{editError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={closeEditModal} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs">ยกเลิก</button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingEdit || !selectedNewDate || !selectedNewSlot}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs disabled:opacity-50"
                >
                  {savingEdit ? 'กำลังบันทึก...' : 'ยืนยันการแก้ไข'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal รีวิวนายหน้า */}
      {reviewModalApt && (
        <ReviewModal
          isOpen={Boolean(reviewModalApt)}
          appointmentId={reviewModalApt.id}
          agentName={reviewModalApt.agentName}
          propertyName={reviewModalApt.propertyName}
          onClose={() => setReviewModalApt(null)}
        />
      )}
    </div>
  );
}