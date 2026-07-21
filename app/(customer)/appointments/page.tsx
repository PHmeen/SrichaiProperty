'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const { appointments, cancelAppointment } = useApp();

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
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 hover:shadow-md transition relative overflow-hidden"
                >
                  <div className="flex gap-4 items-center w-full md:w-1/3">
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
                    <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition cursor-pointer">
                      ดูรายละเอียด
                    </button>
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
    </div>
  );
}
