'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์การ์ดข้างแสดงข้อมูลสรุปทรัพย์และนายหน้า (BookingSidebar Component)
 * /components/customer/BookingSidebar.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงการ์ดสรุปรายละเอียดอสังหาริมทรัพย์ที่ลูกค้าระบุเลือกจอง (รูปหลัก, ชื่อประกาศ, ราคา, ประเภท, ทำเล)
 * 2. แสดงการ์ดโปรไฟล์นายหน้าผู้ดูแลประกาศ (รูปประจำตัว, ชื่อ-นามสกุล, ป้ายยืนยันตัวตน)
 * 3. แสดงข้อแนะนำการเข้าชม และคำชี้แจงสำคัญเกี่ยวกับกระบวนการส่งคำขอนัดหมาย
 * ==============================================================================
 */

import React from 'react';
import Image from 'next/image';
import { Property } from '@/context/AppContext';

// อินเทอร์เฟซกำหนด Props รับออบเจกต์อสังหาริมทรัพย์ (property) มาจากหน้าแม่
interface BookingSidebarProps {
  property: Property;
}

export default function BookingSidebar({ property }: BookingSidebarProps) {
  
  // จัดข้อความทำเลสถานที่: ถ้ามีชื่อ ตำบล/อำเภอ/จังหวัด ให้ต่อประโยคเข้าด้วยกัน ถ้าไม่มีให้ใช้อีโมจิที่ตัดสัญลักษณ์นำออก
  const locationText = property.districtName && property.amphureName && property.provinceName 
    ? `${property.districtName}, ${property.amphureName}, ${property.provinceName}` 
    : property.location.replace("📍 ", "");

  return (
    <div className="lg:col-span-4 flex flex-col gap-5">
      
      {/* ========================================================================
          การ์ดส่วนที่ 1: สรุปข้อมูลอสังหาริมทรัพย์ (PROPERTY SUMMARY CARD)
          ======================================================================== */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-sm">
        {/* รูปภาพหลักอสังหาริมทรัพย์ + แท็กสถานะ (เช่น ขายด่วน/ทรัพย์พรีเมียม) */}
        <div className="h-44 relative bg-slate-100">
          <Image 
            src={property.image} 
            width={300} 
            height={176} 
            unoptimized 
            className="w-full h-full object-cover" 
            alt={property.title} 
          />
          <span className="absolute top-3 left-3 bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black shadow-sm">
            {property.tag || 'ขายด่วน'}
          </span>
        </div>

        {/* ประเภทอสังหาฯ, ชื่อประกาศ, ราคา และทำเลที่ตั้ง */}
        <div className="p-5 space-y-2">
          <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold inline-block">
            {property.type}
          </span>
          <h3 className="text-slate-900 font-extrabold text-sm leading-snug line-clamp-2">
            {property.title}
          </h3>
          <p className="text-lg font-black text-blue-700 leading-none pt-1">
            {property.price}
          </p>
          <p className="text-slate-400 text-[10px] font-bold flex items-center gap-1 pt-1.5 border-t border-slate-100">
            📍 {locationText}
          </p>
        </div>
      </div>

      {/* ========================================================================
          การ์ดส่วนที่ 2: โปรไฟล์นายหน้าผู้ดูแล (AGENT PROFILE CARD)
          ======================================================================== */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
        {/* รูปประจำตัว ชื่อ และป้ายยืนยันตัวตนของนายหน้า */}
        <div className="flex items-center gap-3">
          <Image 
            src={property.agentImage} 
            width={44}
            height={44}
            unoptimized
            className="w-11 h-11 rounded-full object-cover shadow-sm border border-slate-100" 
            alt={property.agentName} 
          />
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">นายหน้าผู้ดูแล</p>
            <h4 className="text-xs font-black text-slate-800">{property.agentName}</h4>
            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded mt-1 inline-block">
              ✓ ยืนยันตัวตนแล้ว
            </span>
          </div>
        </div>

        {/* กล่องข้อแนะนำวันเวลาเข้าชมสถานที่ */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
            <span>🕒</span> ข้อแนะนำการเข้าชม
          </div>
          <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
            รอบเวลาว่างขึ้นอยู่กับวันที่นายหน้าเปิดให้จองล่วงหน้าในปฏิทิน กรุณาเลือกรอบเวลาที่สะดวก
          </p>
        </div>
      </div>

      {/* ========================================================================
          กล่องส่วนที่ 3: คำชี้แจงสำคัญเรื่องกระบวนการนัดหมาย (NOTICE BOX)
          ======================================================================== */}
      <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex items-start gap-2.5">
        <span className="text-blue-500 text-base leading-none">ℹ️</span>
        <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
          การนัดหมายนี้เป็นการส่งคำขอเบื้องต้น นายหน้าจะทำการติดต่อกลับเพื่อยืนยันเวลาและวันเข้าชมที่แน่นอนอีกครั้งหนึ่ง
        </p>
      </div>

    </div>
  );
}
