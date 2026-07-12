'use client';

import React, { useState, useEffect } from 'react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // ตรวจสอบว่าผู้ใช้เคยยอมรับคุกกี้ไปแล้วหรือยัง
    const consent = localStorage.getItem('srichai_cookie_consent');
    if (!consent) {
      // หากยังไม่มี ให้รอ 1.5 วินาทีแล้วค่อยแสดงขึ้นมาอย่างนุ่มนวล
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('srichai_cookie_consent', 'accepted_all');
    setShowBanner(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('srichai_cookie_consent', 'essential_only');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md z-50 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl p-5 font-sans animate-fade-in transition-all duration-300">
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">🍪</span>
        <div className="space-y-1.5">
          <h4 className="font-extrabold text-slate-900 text-sm">การตั้งค่าคุกกี้และนโยบายความเป็นส่วนตัว</h4>
          <p className="text-slate-600 text-xs leading-relaxed">
            เว็บไซต์ Srichai Property Agents ใช้คุกกี้เพื่อเพิ่มประสิทธิภาพและประสบการณ์ที่ดีในการค้นหาบ้าน รวมถึงเก็บรวบรวมข้อมูลส่วนบุคคลตาม
            <a href="#" className="text-blue-600 font-bold hover:underline mx-1">นโยบายความเป็นส่วนตัว</a> ของเรา
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500 max-h-32 overflow-y-auto">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-700">1. คุกกี้ที่จำเป็น (Essential Cookies)</span>
            <span className="text-blue-600 font-bold">เปิดใช้งานเสมอ</span>
          </div>
          <p className="leading-relaxed">ใช้สำหรับรักษาสถานะการเข้าสู่ระบบ (Session) และข้อมูลความปลอดภัยขั้นพื้นฐานของเว็บไซต์</p>
          
          <div className="flex justify-between items-center pt-2">
            <span className="font-bold text-slate-700">2. คุกกี้เพื่อการวิเคราะห์ (Analytical Cookies)</span>
            <span className="text-slate-400">ปิดใช้งานชั่วคราว</span>
          </div>
          <p className="leading-relaxed">ช่วยจำลองพฤติกรรมการค้นหาทำเลที่ยอดนิยม เพื่อนำไปพัฒนาฟังก์ชันและแสดงการแนะนำบ้านที่ตรงใจคุณมากขึ้น</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-end">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-slate-500 hover:text-slate-700 font-bold py-2 px-3 rounded-lg hover:bg-slate-100 transition cursor-pointer text-center"
        >
          {showDetails ? "ซ่อนการตั้งค่า" : "ตั้งค่าคุกกี้"}
        </button>
        <button 
          onClick={handleAcceptEssential}
          className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold py-2 px-4 rounded-xl transition cursor-pointer text-center"
        >
          ยอมรับที่จำเป็น
        </button>
        <button 
          onClick={handleAcceptAll}
          className="text-xs text-white bg-blue-700 hover:bg-blue-800 font-bold py-2 px-4 rounded-xl transition shadow-md shadow-blue-700/10 cursor-pointer text-center"
        >
          ยอมรับทั้งหมด
        </button>
      </div>
    </div>
  );
}
