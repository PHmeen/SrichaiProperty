'use client';

import React from 'react';
import { Property } from '../../../context/AppContext';

interface BookingSidebarProps {
  property: Property;
}

export default function BookingSidebar({ property }: BookingSidebarProps) {
  return (
    <div className="lg:col-span-4 flex flex-col gap-5">
      {/* การ์ดรายละเอียดทรัพย์ */}
      <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/70 shadow-sm">
        <div className="h-44 relative bg-slate-100">
          <img src={property.image} className="w-full h-full object-cover" alt={property.title} />
          <span className="absolute top-3 left-3 bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wide shadow-sm">
            {property.tag || 'ขายด่วน'}
          </span>
        </div>
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
            📍 {property.districtName && property.amphureName && property.provinceName 
              ? `${property.districtName}, ${property.amphureName}, ${property.provinceName}` 
              : property.location.replace("📍 ", "")}
          </p>
        </div>
      </div>

      {/* การ์ดผู้ดูแลนายหน้า */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/70 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <img 
            src={property.agentImage} 
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

        {/* ตารางเวลาทำงานของนายหน้า */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
            <span>🕒</span> เวลาทำการของนายหน้า
          </div>
          <ul className="text-[10px] font-semibold text-slate-500 space-y-1 pl-4 list-disc">
            <li>สะดวกเฉพาะ: วันเสาร์-อาทิตย์</li>
            <li>สะดวก: วันหยุดนักขัตฤกษ์</li>
            <li className="text-red-500">ไม่รับนัดวันจันทร์-ศุกร์</li>
          </ul>
        </div>
      </div>

      {/* กล่องรายละเอียดชี้แจงสำคัญ */}
      <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 flex items-start gap-2.5">
        <span className="text-blue-500 text-base leading-none">ℹ️</span>
        <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
          การนัดหมายนี้เป็นการส่งคำขอเบื้องต้น นายหน้าจะทำการติดต่อกลับเพื่อยืนยันเวลาและวันเข้าชมที่แน่นอนอีกครั้งหนึ่ง
        </p>
      </div>
    </div>
  );
}
