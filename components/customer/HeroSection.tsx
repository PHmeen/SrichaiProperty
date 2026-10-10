'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์แบนเนอร์ค้นหาหน้าแรก (HeroSection Component)
 * ไฟล์: /components/customer/HeroSection.tsx
 * ==============================================================================
 * หน้าที่หลัก:
 * 1. แสดงแบนเนอร์ส่วนหัว (Hero Banner) ต้อนรับผู้ใช้งานบนหน้าแรก (Landing Page)
 * 2. เป็นจุดรับข้อมูลการค้นหาเริ่มต้นจากผู้ใช้ (แท็บ ซื้อ/เช่า, ทำเล, ประเภทอสังหาฯ)
 * 3. รวบรวมเงื่อนไขแล้วส่งต่อ (Redirect) ไปยังหน้าค้นหาหลัก (/search) ผ่าน URL Query String
 * 4. มีปุ่มลัด (Quick Landmark Chips) สำหรับคลิกค้นหาทำเลยอดนิยมได้ในคลิกเดียว
 * ==============================================================================
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// ใช้ดึงข้อมูล Session การล็อกอิน เพื่อเช็คว่าผู้ใช้เป็น Agent หรือ Admin หรือไม่
import { useSession } from 'next-auth/react'; 
// ใช้ไอคอน Lucide React ตามมาตรฐานของโปรเจกต์ (ห้ามใช้อิโมจิดิบใน UI)
import { MapPin, Search } from 'lucide-react';

export default function HeroSection() {
  // ดึงข้อมูล session ของผู้ใช้ที่ล็อกอินอยู่ในปัจจุบัน
  const { data: session } = useSession();
  
  // router ใช้สำหรับการสั่งเปลี่ยนหน้าเว็บด้วยโค้ด (Programmatic Navigation)
  const router = useRouter();

  // ----------------------------------------------------------------------------
  // 1. STATE สำหรับเก็บค่าที่ผู้ใช้งานเลือกในกล่องค้นหา
  // ----------------------------------------------------------------------------
  // activeTab: เก็บแท็บที่เลือก ปัจจุบันมี 3 สถานะ คือ 'buy' (ซื้อ), 'rent' (เช่า), 'sell' (ขาย)
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy');
  
  // locationInput: เก็บข้อความที่ผู้ใช้พิมพ์ในช่องค้นหาทำเลหรือแลนด์มาร์ก
  const [locationInput, setLocationInput] = useState('');
  
  // propertyType: เก็บประเภทอสังหาฯ ที่เลือกจาก Dropdown (เช่น 'house', 'townhome', 'condo')
  const [propertyType, setPropertyType] = useState('');

  // ----------------------------------------------------------------------------
  // 2. ตรวจสอบสิทธิ์ (Role Authorization)
  // ----------------------------------------------------------------------------
  // ดึงบทบาทของผู้ใช้ (role) จาก session เช่น 'customer', 'agent', 'admin'
  const userRole = (session?.user as { role?: string })?.role;
  // อนุญาตให้เห็นแท็บ "ขาย" เฉพาะผู้ใช้ที่เป็นนายหน้า (agent) หรือผู้ดูแลระบบ (admin) เท่านั้น
  const canSell = userRole === 'agent' || userRole === 'admin';

  // ----------------------------------------------------------------------------
  // 3. ฟังก์ชันประมวลผลการค้นหา (Search Handler)
  // ----------------------------------------------------------------------------
  const handleSearch = () => {
    // กรณีถ้าเป็นนายหน้า/แอดมิน แล้วกดแท็บ "ขาย" ให้พาไปหน้าลงประกาศทรัพย์ใหม่ทันที
    if (canSell && activeTab === 'sell') {
      router.push('/agent/add-property');
      return;
    }

    // สร้างอ็อบเจกต์ URLSearchParams เพื่อประกอบ Query String เช่น ?tab=buy&q=ม.อ.&type=condo
    const params = new URLSearchParams();
    
    // ใส่แท็บการค้นหา (ซื้อ หรือ เช่า)
    if (activeTab) params.set('tab', activeTab);
    
    // ใส่ข้อความค้นหาทำเล (ตัดช่องว่างหน้าหลังด้วย trim())
    if (locationInput.trim()) params.set('q', locationInput.trim());
    
    // ใส่ประเภทอสังหาฯ ถ้ามีการเลือก
    if (propertyType) params.set('type', propertyType);

    // สั่งนำทางไปยังหน้า /search พร้อมกับพารามิเตอร์ที่ประกอบไว้
    router.push(`/search?${params.toString()}`);
  };

  return (
    // <header>: ส่วนหัวหลักของหน้า มีรูปภาพพื้นหลังพร้อมฟิลเตอร์มืดเพื่อให้ตัวหนังสือเด่น
    <header className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 overflow-hidden flex items-center justify-center min-h-[50vh]">
      {/* ภาพพื้นหลัง (Background Image) พร้อมเอฟเฟกต์ซูมช้าๆ เมื่อนำเมาส์มาวาง */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] hover:scale-105" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}
      />
      {/* เลเยอร์สีดำโปร่งแสงซ้อนทับ (Overlay) เพื่อให้ข้อความสีขาวอ่านง่าย ชัดเจน */}
      <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
      
      {/* กล่องเนื้อหาตรงกลาง */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* หัวข้อหลัก (Title) */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 leading-tight tracking-tight drop-shadow-md">
          ค้นหาบ้าน คอนโด และที่ดิน<br />ทำเลคุณภาพใน <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">หาดใหญ่และสงขลา</span>
        </h1>
        {/* คำบรรยายรอง (Subtitle) */}
        <p className="text-xs sm:text-sm md:text-base text-slate-200 mb-6 sm:mb-8 max-w-xl font-light drop-shadow">
          Srichai Property ศูนย์รวมอสังหาริมทรัพย์คัดสรร พร้อมทีมงานนายหน้ามืออาชีพดูแลทุกขั้นตอน นัดชมโครงการจริงได้สะดวกและปลอดภัย
        </p>

        {/* ---------------------------------------------------------------------- */}
        {/* กล่องสีขาวสำหรับฟอร์มค้นหา (Main Search Box Card)                      */}
        {/* ---------------------------------------------------------------------- */}
        <div className="w-full max-w-4xl bg-white border border-slate-200 shadow-lg rounded-2xl p-3 sm:p-5">
          
          {/* ส่วนสลับแท็บ: ซื้อ / เช่า / ขาย */}
          <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
            {/* แท็บ ซื้อ */}
            <button 
              type="button"
              onClick={() => setActiveTab("buy")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "buy" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ซื้อ
            </button>
            {/* แท็บ เช่า */}
            <button 
              type="button"
              onClick={() => setActiveTab("rent")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "rent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              เช่า
            </button>
            {/* แท็บ ขาย (แสดงเฉพาะ Agent / Admin) */}
            {canSell && (
              <button 
                type="button"
                onClick={() => setActiveTab("sell")} 
                className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === "sell" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ขาย
              </button>
            )}
          </div>

          {/* ส่วนแถบกรอกข้อมูลค้นหา (Input Row) */}
          <div className="flex flex-col md:flex-row items-stretch bg-slate-50 rounded-xl border border-slate-200 p-1 gap-1.5 transition-all duration-200">
            
            {/* 1. ช่องกรอกค้นหาทำเลหรือแลนด์มาร์ก */}
            <div className="flex-1 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group">
              <div className="flex flex-col text-left w-full">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ค้นหาทำเลหรือแลนด์มาร์ก</span>
                <input 
                  type="text" 
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  // ดักจับการกดปุ่ม Enter ให้สั่งค้นหาได้ทันทีโดยไม่ต้องคลิกเมาส์
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="เช่น บ้านแถวเซ็นทรัล, คอนโดใกล้สนามบิน, แถว ม.อ...." 
                  className="w-full bg-transparent focus:outline-none text-slate-800 font-semibold text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            
            {/* เส้นคั่นแนวตั้ง (แสดงเฉพาะหน้าจอขนาดกลางขึ้นไป) */}
            <div className="hidden md:block w-px h-10 bg-slate-200 self-center" />
            
            {/* 2. เมนูดรอปดาวน์เลือกประเภทอสังหาฯ */}
            <div className="md:w-48 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group select-none">
              <div className="flex flex-col text-left w-full">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ประเภทอสังหาฯ</span>
                <select 
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-slate-800 font-semibold text-sm cursor-pointer outline-none"
                >
                  <option value="">ทุกประเภท</option>
                  <option value="house">บ้านเดี่ยว</option>
                  <option value="townhome">ทาวน์โฮม</option>
                  <option value="condo">คอนโดมิเนียม</option>
                </select>
              </div>
            </div>

            {/* 3. ปุ่มกดค้นหา หรือปุ่มลงประกาศขาย */}
            {canSell && activeTab === "sell" ? (
              // ถ้านายหน้าเลือกแท็บขาย ให้แสดงปุ่ม "ลงประกาศขาย"
              <Link
                href="/agent/add-property"
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition-colors duration-200 flex items-center justify-center text-sm w-full md:w-auto h-full min-h-[48px] self-stretch"
              >
                ลงประกาศขาย
              </Link>
            ) : (
              // กรณีทั่วไปแสดงปุ่ม "ค้นหาเลย"
              <button
                type="button"
                onClick={handleSearch}
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition-colors duration-200 flex items-center justify-center gap-1.5 text-sm w-full md:w-auto h-full min-h-[48px] self-stretch cursor-pointer active:scale-98"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>ค้นหาเลย</span>
              </button>
            )}
          </div>

          {/* -------------------------------------------------------------------- */}
          {/* 4. ปุ่มชิปทางลัดค้นหาทำเลยอดนิยม (Quick Landmark Chips)               */}
          {/* -------------------------------------------------------------------- */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              ลองค้นหา:
            </span>
            {/* วนลูปแสดงรายชื่อทำเลยอดนิยม กดแล้วจะพาไปหน้า /search พร้อมใส่คำค้นหานั้นทันที */}
            {[
              'บ้านแถวเซ็นทรัล',
              'คอนโดใกล้สนามบิน',
              'บ้านแถว ม.อ.',
              'แถวตลาดกิมหยง',
              'บ้านแถวเกาะยอ',
            ].map((chip) => (
              <Link
                key={chip}
                // ถ้า activeTab เป็น sell ให้เปลี่ยนเป็น buy เพื่อป้องกัน error ตอนค้นหา
                href={`/search?tab=${activeTab === 'sell' ? 'buy' : activeTab}&q=${encodeURIComponent(chip)}`}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-medium text-[11px] transition-colors border border-slate-200/60"
              >
                {chip}
              </Link>
            ))}
          </div>

        </div>
      </div>
    </header>
  );
}

