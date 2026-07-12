'use client';

/**
 * page.tsx (Appointments List) - หน้ารายการประวัติการนัดหมายทั้งหมด
 * เหมาะสำหรับมือใหม่: แสดงวิธีการจัดหมวดหมู่ข้อมูลด้วยแท็บ (Tabs Filter)
 * และผูกคิวนัดหมายจาก Context ให้ยกเลิกและอัปเดตสถานะแบบเรียลไทม์
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';

export default function AppointmentsPage() {
  // === 1. ตัวแปรสำหรับเปลี่ยนแท็บเมนู ===
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // === 2. ดึงรายการนัดหมายและประวัติโปรไฟล์จากระบบ Context ===
  const { appointments, cancelAppointment, profile } = useApp();

  // คำนวณจำนวนนัดหมายที่ยังไม่เกิดขึ้นจริง (สำหรับแสดงเลขสีแดงที่ป้ายสัญลักษณ์)
  const upcomingCount = appointments.filter(
    apt => apt.status === 'upcoming' || apt.status === 'pending'
  ).length;

  // ฟังก์ชันย่อย: แสดงสีและข้อความของสถานะให้เหมาะสม
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

  // กรองนัดหมายตามแท็บที่เลือกขณะนั้น
  const filteredAppointments = appointments.filter(apt => {
    if (activeTab === 'upcoming') {
      return apt.status === 'upcoming' || apt.status === 'pending';
    }
    return apt.status === activeTab;
  });

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      
      {/* 🧭 เมนูนำทางด้านบน */}
      <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* โลโก้เว็บไซต์ */}
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-700/30 group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Srichai<span className="text-blue-600">Property</span>
              </span>
            </Link>

            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">นายหน้าของเรา</Link>
              <Link href="/appointments" className="text-blue-700 bg-white shadow-sm rounded-full px-4 py-1.5 text-xs font-bold transition">ประวัติการนัดหมาย</Link>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-1 border-r border-slate-200 pr-3">
                {/* ลิงก์ไปหน้าบันทึกที่ชอบ */}
                <Link href="/favorites" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition cursor-pointer" title="รายการโปรด">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </Link>
                
                {/* ลิงก์ไปห้องสนทนา (แชท) */}
                <Link href="/chat" className="relative p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition cursor-pointer" title="ข้อความแชท">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863-0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 border border-white"></span>
                  </span>
                </Link>
              </div>

              {/* เมนูหน้าโปรไฟล์แบบ Dropdown */}
              <div className="relative group">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-sm cursor-pointer hover:bg-slate-100 transition">
                  <img src="https://i.pravatar.cc/150?img=68" alt="Profile" className="w-7 h-7 rounded-full border border-white shadow-sm object-cover group-hover:scale-105 transition-transform" />
                  <div className="flex flex-col hidden sm:flex">
                    <span className="text-xs font-bold text-slate-900 leading-none">{profile.fullName}</span>
                    <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                      {profile.role === 'buyer' ? 'ผู้สนใจซื้อ' : profile.role === 'agent' ? 'นายหน้า' : 'ผู้ดูแลระบบ'}
                    </span>
                  </div>
                </div>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right z-50">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{profile.fullName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{profile.email}</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link href="/profile" className="block px-3 py-1.5 text-xs text-slate-600 font-medium hover:bg-slate-50 hover:text-blue-600 rounded-lg transition">ตั้งค่าโปรไฟล์</Link>
                    {profile.role === 'agent' && (
                      <Link href="/agent/dashboard" className="block px-3 py-1.5 text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition">🖥️ แดชบอร์ดนายหน้า</Link>
                    )}
                    {profile.role === 'admin' && (
                      <Link href="/admin/dashboard" className="block px-3 py-1.5 text-xs text-purple-600 font-bold hover:bg-purple-50 rounded-lg transition">🖥️ แดชบอร์ดผู้ดูแลระบบ</Link>
                    )}
                  </div>
                  <div className="p-1.5 border-t border-slate-100">
                    <Link href="/login" className="block px-3 py-1.5 text-xs text-red-600 font-bold hover:bg-red-50 rounded-lg transition">ออกจากระบบ</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* หัวข้อย่อยของหน้าการนัดหมาย */}
      <div className="pt-24 pb-6 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <span className="text-2xl bg-amber-100 text-amber-500 w-12 h-12 flex items-center justify-center rounded-xl shadow-sm">📅</span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ประวัติการนัดหมายของคุณ</h1>
            <p className="text-slate-500 text-xs">จัดการตารางเข้าชมอสังหาริมทรัพย์และติดตามสถานะคิวการยืนยันการนัดหมาย</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow">
        
        {/* เมนูแถบแท็บการสลับมุมมอง */}
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

        {/* ส่วนแสดงรายการนัดหมายแต่ละชิ้น */}
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
                  {/* แสดงกล่องปฏิทิน และรูปภาพอสังหาฯ ทางซ้าย */}
                  <div className="flex gap-4 items-center w-full md:w-1/3">
                    <div className="w-16 h-20 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center flex-shrink-0 shadow-inner">
                      <span className="text-[10px] font-bold text-red-500 uppercase">{monthStr}</span>
                      <span className="text-2xl font-extrabold text-slate-900 leading-none my-0.5">{dayStr}</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded shadow-sm mt-1">{apt.timeSlot}</span>
                    </div>
                    <div className="w-full h-20 rounded-lg overflow-hidden relative">
                      <img src={apt.propertyImage} className="w-full h-full object-cover" alt={apt.propertyName} />
                      <div className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">{apt.propertyType}</div>
                    </div>
                  </div>

                  {/* แสดงข้อมูลอสังหาฯ และนายหน้าที่ดูแล */}
                  <div className="flex-1 space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded border text-[9px] font-bold ${statusDetails.bg} ${statusDetails.color}`}>
                      {statusDetails.text}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{apt.propertyName}</h3>
                    <div className="text-blue-700 font-extrabold text-xs">{apt.propertyPrice}</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <img src={apt.agentImage} className="w-5 h-5 rounded-full" alt={apt.agentName} />
                      <span>นายหน้า: {apt.agentName}</span>
                    </div>
                  </div>

                  {/* ปุ่มคำสั่งจัดการการนัดหมายทางขวา */}
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
