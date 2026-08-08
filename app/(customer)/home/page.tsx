'use client';

/**
 * ==============================================================================
 * หน้าหลักสำหรับฝั่งลูกค้า (Customer Home Page) - /app/(customer)/home/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. ต้อนรับผู้ใช้งานด้วยข้อมูลโปรไฟล์ และแจ้งเตือนนัดหมายที่กำลังจะมาถึง
 * 2. เป็นจุดเริ่มต้นในการค้นหาบ้าน/คอนโด (เลือก แท็บ ซื้อ/เช่า, พิมพ์ทำเล, เลือกประเภทอสังหาฯ)
 * 3. แสดง "ทำเลยอดนิยม" 4 อันดับแรก โดยคำนวณจากจำนวนประกาศจริงในฐานข้อมูล
 * 4. แสดง "ประกาศแนะนำล่าสุด" 6 รายการแรก ดึงจากฐานข้อมูลจริง
 * ==============================================================================
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PropertyCard from '@/components/customer/PropertyCard';

/**
 * รายการประเภทอสังหาริมทรัพย์คงที่ (Static Reference Data)
 * ใช้สำหรับแสดงผลใน Dropdown เมนูค้นหาประเภทบ้าน/คอนโด
 */
const PROPERTY_TYPES = [
  { val: '', label: 'ทุกประเภท' },
  { val: 'house', label: 'บ้านเดี่ยว' },
  { val: 'townhome', label: 'ทาวน์โฮม' },
  { val: 'condo', label: 'คอนโดมิเนียม' },
];

export default function CustomerHomePage() {
  // ----------------------------------------------------------------------------
  // 1. STATE การทำงานภายในหน้าจอ (Local Component State)
  // ----------------------------------------------------------------------------
  // activeTab: แท็บเลือกรูปแบบการค้นหา 'buy' (ซื้อ) หรือ 'rent' (เช่า)
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy');
  
  // locationInput: ข้อความคำค้นหาทำเลที่ตั้งที่ผู้ใช้พิมพ์ลงในช่องค้นหา
  const [locationInput, setLocationInput] = useState('');
  
  // propertyType: ค่าประเภทอสังหาฯ ที่เลือก ('', 'house', 'townhome', 'condo')
  const [propertyType, setPropertyType] = useState('');
  
  // isTypeOpen: สถานะเปิด/ปิด เมนู Dropdown เลือกประเภทอสังหาริมทรัพย์
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  // ----------------------------------------------------------------------------
  // 2. GLOBAL CONTEXT (ดึงข้อมูลกลางจาก AppContext ที่เชื่อมต่อฐานข้อมูลเรียบร้อยแล้ว)
  // ----------------------------------------------------------------------------
  const { 
    properties,        // รายชื่ออสังหาฯ ทั้งหมดในระบบ (ดึงจาก DB ผ่าน /api/properties)
    propertiesLoading, // สถานะกำลังโหลดข้อมูลอสังหาฯ (true = กำลังโหลด)
    favorites,         // อาร์เรย์ ID อสังหาฯ ที่ผู้ใช้กดถูกใจไว้ (ดึงจาก DB ผ่าน /api/user/saved-properties)
    toggleFavorite,    // ฟังก์ชันกดสลับบันทึก/ยกเลิกรายการโปรดไปยัง DB
    profile,           // ข้อมูลโปรไฟล์ของผู้ใช้ปัจจุบัน (เช่น ชื่อเต็ม, อีเมล)
    appointments       // รายการนัดหมายทั้งหมดของผู้ใช้ (ดึงจาก DB ผ่าน /api/appointments)
  } = useApp();

  // ----------------------------------------------------------------------------
  // 3. COMPUTED & MEMOIZED DATA (การคำนวณข้อมูลด้วย useMemo เพื่อประสิทธิภาพสูงสุด)
  // ----------------------------------------------------------------------------
  
  // 3.1 คัดเลือกเฉพาะ 6 ประกาศแรกจาก DB เพื่อนำมาแสดงในส่วน "ประกาศแนะนำล่าสุด"
  const featuredProperties = useMemo(() => properties.slice(0, 6), [properties]);

  // 3.2 คำนวณ "ทำเลยอดนิยม" 4 อันดับแรกแบบไดนามิกจากข้อมูลจริงใน DB
  // วิธีการทำงาน: นับจำนวนประกาศในแต่ละอำเภอ/จังหวัด แล้วจัดอันดับจากมากไปน้อย
  const locations = useMemo(() => {
    const map: Record<string, { count: number; image: string }> = {};

    properties.forEach((p) => {
      // ดึงชื่อทำเลโดยลำดับความสำคัญ: ชื่ออำเภอ > ชื่อจังหวัด > คำแรกจากข้อความที่อยู่
      const name = p.amphureName || p.provinceName || (p.location ? p.location.replace(/📍/g, '').split(',')[0].trim() : '');
      if (!name) return;

      // สรุปจำนวนประกาศและเลือกภาพหน้าปกแรกของทำเลนั้น
      if (!map[name]) {
        map[name] = { 
          count: 0, 
          image: p.image || p.images?.[0] || 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400' 
        };
      }
      map[name].count += 1;
    });

    // แปลง Map เป็น Array แล้วเรียงลำดับจำนวนประกาศมาก -> น้อย และดึงมาแค่ 4 ทำเลแรก
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [properties]);

  // 3.3 นับจำนวนนัดหมายที่กำลังจะมาถึง (สถานะ 'upcoming', 'pending', หรือ 'approved')
  const upcomingCount = useMemo(() => 
    appointments.filter((a) => ['upcoming', 'pending', 'approved'].includes(a.status)).length
  , [appointments]);

  // ----------------------------------------------------------------------------
  // 4. RENDERING SECTION (การแสดงผล UI)
  // ----------------------------------------------------------------------------
  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased text-sm">

      {/* ========================================================================
          ส่วนที่ 1: HERO SECTION (ภาพพื้นหลัง + คำทักทาย + กล่องค้นหาอสังหาฯ)
          ======================================================================== */}
      <header className="relative pt-8 pb-16 lg:pt-16 lg:pb-20 flex items-center justify-center min-h-[55vh]">
        {/* ภาพพื้นหลัง Hero และ Overlay สีเข้มเพื่อให้อ่านข้อความชัดเจน */}
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=2000&q=80')" }} />
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
          
          {/* Badge แสดงคำทักทายชื่อผู้ใช้งานที่ล็อกอิน */}
          <div className="mb-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-white text-xs font-medium shadow">
            <span>👋</span> <span>สวัสดีคุณ {profile.fullName}, ยินดีต้อนรับกลับมา</span>
          </div>

          {/* แถบแจ้งเตือนนัดหมายที่กำลังจะมาถึง (แสดงเฉพาะเมื่อมีนัดหมายอย่างน้อย 1 รายการ) */}
          {upcomingCount > 0 && (
            <div className="mb-5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-3 shadow max-w-xl w-full">
              <span className="text-xl">📅</span>
              <p className="font-bold text-xs sm:text-sm text-blue-200">คุณมี {upcomingCount} นัดหมายที่กำลังจะมาถึง</p>
              <Link href="/appointments" className="ml-auto text-white font-bold text-xs bg-blue-600 px-2.5 py-1 rounded shadow hover:bg-blue-700 transition hidden sm:block">
                ดูรายละเอียด
              </Link>
            </div>
          )}

          {/* สโลแกนหน้าแรก */}
          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight drop-shadow-md">
            ค้นพบพื้นที่ความสุข<br />ที่คุณเรียกว่า <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">&quot;บ้าน&quot;</span>
          </h1>
          <p className="text-sm md:text-base text-slate-200 mb-8 max-w-xl font-light drop-shadow">
            Srichai Property Agents ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายและแชทกับนายหน้าโดยตรง
          </p>

          {/* --------------------------------------------------------------------
              กล่องค้นหา (Search Box Window)
              -------------------------------------------------------------------- */}
          <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
            
            {/* แท็บเลือกโหมด: ซื้อ (buy) หรือ เช่า (rent) */}
            <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
              {(['buy', 'rent'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeTab === tab ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab === 'buy' ? 'ซื้อ' : 'เช่า'}
                </button>
              ))}
            </div>

            {/* ฟอร์มรับข้อมูลการค้นหา (ทำเล + ประเภทอสังหาฯ + ปุ่มกดค้นหา) */}
            <div className="flex flex-col md:flex-row items-stretch bg-slate-50 rounded-xl border border-slate-200 p-1 gap-1.5">
              
              {/* ช่องกรอกข้อความค้นหาทำเล (Location Input) */}
              <div className="flex-1 flex items-center px-4 py-2">
                <span className="text-xl mr-3 text-slate-400">📍</span>
                <div className="flex flex-col text-left w-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ทำเลที่ตั้ง</span>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="หาดใหญ่, สงขลา, สะเดา..."
                    className="w-full bg-transparent text-slate-800 font-semibold text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* เส้นแบ่งแนวตั้งในมุมมอง Desktop */}
              <div className="hidden md:block w-px h-10 bg-slate-200 self-center" />

              {/* Dropdown เมนูเลือกประเภทอสังหาริมทรัพย์ (Custom Select Dropdown) */}
              <div
                id="property-type-dropdown"
                className="relative md:w-48 flex items-center px-4 py-2 cursor-pointer select-none"
                onClick={() => setIsTypeOpen(!isTypeOpen)}
              >
                <span className="text-lg mr-3 text-slate-400">🏠</span>
                <div className="flex flex-col text-left w-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ประเภทอสังหาฯ</span>
                  <div className="text-slate-800 font-semibold text-sm flex items-center justify-between">
                    <span>{PROPERTY_TYPES.find((t) => t.val === propertyType)?.label}</span>
                    <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTypeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* เมนูตัวเลือกเมื่อ Dropdown ถูกเปิดอยู่ (isTypeOpen === true) */}
                {isTypeOpen && (
                  <>
                    {/* ฉากหลังโปร่งใส (Backdrop Overlay) ไว้รับการคลิกข้างนอกเพื่อปิด Dropdown */}
                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsTypeOpen(false); }} />
                    
                    {/* กล่องรายการตัวเลือก */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50" onClick={(e) => e.stopPropagation()}>
                      {PROPERTY_TYPES.map((t) => (
                        <button
                          key={t.val}
                          type="button"
                          onClick={() => { setPropertyType(t.val); setIsTypeOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${
                            propertyType === t.val ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ปุ่มกดค้นหา: ส่ง Query Parameters ไปยังหน้า /search */}
              <Link
                href={`/search?tab=${activeTab}&q=${encodeURIComponent(locationInput)}&type=${propertyType}`}
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition flex items-center justify-center gap-2 text-sm w-full md:w-auto min-h-[48px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>ค้นหาเลย</span>
              </Link>

            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================
          ส่วนที่ 2: ทำเลยอดนิยม (POPULAR LOCATIONS SECTION)
          แสดงทำเลที่มีจำนวนประกาศมากที่สุด 4 อันดับแรกจากการคำนวณแบบ Real-time
          ======================================================================== */}
      <section className="py-10 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 mb-1">ทำเลยอดนิยม</h2>
            <p className="text-slate-500 text-xs">ค้นหาอสังหาริมทรัพย์ในพื้นที่ยอดฮิต</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {locations.map((loc, i) => (
              <Link
                key={i}
                href={`/search?q=${encodeURIComponent(loc.name)}`}
                className="relative h-44 rounded-2xl overflow-hidden group shadow-sm border border-slate-100 block"
              >
                <Image 
                  src={loc.image} 
                  alt={loc.name} 
                  width={240} 
                  height={176} 
                  unoptimized 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-white text-base font-bold mb-0.5">{loc.name}</h3>
                  <p className="text-slate-300 text-[10px]">{loc.count} ประกาศ</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================
          ส่วนที่ 3: ประกาศแนะนำล่าสุด (FEATURED PROPERTIES SECTION)
          แสดงอสังหาริมทรัพย์ 6 รายการแรก พร้อมจัดการ 3 สถานะ (Loading, Empty, Data)
          ======================================================================== */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">ประกาศแนะนำล่าสุด</h2>
              <p className="text-slate-500 text-xs font-medium">อสังหาริมทรัพย์คุณภาพคัดสรรโดยนายหน้ามืออาชีพ</p>
            </div>
            <Link href="/search" className="inline-flex items-center text-slate-700 font-bold hover:text-blue-700 transition bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs group">
              ดูทั้งหมด <span className="ml-1 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* แสดงผลตามสถานะการดึงข้อมูลจาก DB */}
          {propertiesLoading ? (
            // สถานะที่ 1: กำลังโหลดข้อมูลจาก DB (แสดง Skeleton Loading Card)
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden animate-pulse">
                  <div className="h-44 bg-slate-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredProperties.length === 0 ? (
            // สถานะที่ 2: โหลดเสร็จสิ้นแล้ว แต่ไม่พบประกาศในฐานข้อมูล
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm font-medium">ยังไม่มีประกาศแนะนำในขณะนี้</p>
            </div>
          ) : (
            // สถานะที่ 3: โหลดข้อมูลสำเร็จ แสดงการ์ดอสังหาริมทรัพย์ 6 รายการ
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProperties.map((prop) => (
                <PropertyCard
                  key={prop.id}
                  prop={prop}
                  isFav={favorites.includes(prop.id)}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
