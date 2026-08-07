'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PropertyCard from '@/components/customer/PropertyCard';

// หน้าแรกฝั่งลูกค้า (Customer Home) — ประกอบด้วย 3 ส่วนหลัก:
// 1) Hero + ช่องค้นหา (ซื้อ/เช่า, ทำเล, ประเภทอสังหาฯ)
// 2) ทำเลยอดนิยม (คำนวณจากจำนวนประกาศจริงในแต่ละพื้นที่)
// 3) ประกาศแนะนำล่าสุด (ดึงจาก properties ใน AppContext)
export default function CustomerHomePage() {
  // แท็บค้นหา: ซื้อ (sale) หรือ เช่า (rent) — ใช้ส่งต่อไปเป็น query "tab" ที่หน้า /search
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy');
  const [locationInput, setLocationInput] = useState('');
  const [propertyType, setPropertyType] = useState(''); // '' = ทุกประเภท, 'house' | 'townhome' | 'condo'
  const [isTypeOpen, setIsTypeOpen] = useState(false); // เปิด/ปิด dropdown เลือกประเภทอสังหาฯ

  // properties: รายการอสังหาฯ ทั้งหมดที่โหลดจาก DB ผ่าน AppContext
  // propertiesLoading: true ระหว่างรอ fetch ครั้งแรก ใช้แสดง skeleton loading
  const { properties, propertiesLoading, favorites, toggleFavorite, profile, appointments } = useApp();

  // การ์ดประกาศแนะนำ: โชว์แค่ 6 รายการแรกไม่ให้หน้ายาวเกินไป
  const featuredProperties = properties.slice(0, 6);

  // === คำนวณ "ทำเลยอดนิยม" จากข้อมูลจริง ===
  // นับจำนวนประกาศในแต่ละทำเล โดยยึดชื่ออำเภอ > จังหวัด > ข้อความที่อยู่ (ตามลำดับความแม่นยำ)
  const locationGroupsMap: Record<string, { count: number; image: string }> = {};

  properties.forEach((p) => {
    // ถ้าไม่มีชื่ออำเภอ/จังหวัดในระบบ ให้ fallback ไปตัดเอาคำแรกจากข้อความที่อยู่แทน
    const locName = p.amphureName || p.provinceName || (p.location ? p.location.replace(/📍/g, '').split(',')[0].trim() : '');
    if (!locName) return;

    if (!locationGroupsMap[locName]) {
      locationGroupsMap[locName] = {
        count: 1,
        image: p.image || p.images?.[0] || 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=400'
      };
    } else {
      locationGroupsMap[locName].count += 1;
    }
  });

  // เรียงทำเลตามจำนวนประกาศมาก -> น้อย แล้วเอามาแสดงแค่ 4 อันดับแรก
  const locations = Object.entries(locationGroupsMap)
    .map(([name, data]) => ({ name, count: data.count, image: data.image }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">

      {/* ========== Hero Section: ภาพพื้นหลัง + คำทักทาย + ช่องค้นหา ========== */}
      <header className="relative pt-8 pb-16 lg:pt-16 lg:pb-20 flex items-center justify-center min-h-[55vh]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}></div>
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
          {/* คำทักทายผู้ใช้ที่ล็อกอินอยู่ */}
          <div className="mb-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-white text-xs font-medium shadow">
            <span className="text-sm">👋</span> <span>สวัสดีคุณ {profile.fullName}, ยินดีต้อนรับกลับมา</span>
          </div>

          {/* แจ้งเตือนนัดหมายที่กำลังจะถึง (แสดงเฉพาะเมื่อมีนัดหมายอยู่) */}
          {appointments.length > 0 && (
            <div className="mb-5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-3 shadow cursor-pointer hover:bg-white/20 transition max-w-xl w-full">
              <span className="text-xl">📅</span>
              <div className="text-left">
                <p className="font-bold text-xs sm:text-sm text-blue-200">คุณมี {appointments.length} นัดหมายที่กำลังจะมาถึง</p>
              </div>
              <Link href="/appointments" className="ml-auto text-white font-bold text-xs bg-blue-600 px-2.5 py-1 rounded shadow hover:bg-blue-700 transition hidden sm:block">ดูรายละเอียด</Link>
            </div>
          )}

          <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight drop-shadow-md font-sans">
            ค้นพบพื้นที่ความสุข<br />ที่คุณเรียกว่า <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">&quot;บ้าน&quot;</span>
          </h1>
          <p className="text-sm md:text-base text-slate-200 mb-8 max-w-xl font-light drop-shadow">
            Srichai Property Agents ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายเข้าชมและแชทกับนายหน้าโดยตรง
          </p>

          {/* กล่องค้นหา: แท็บซื้อ/เช่า + ทำเล + ประเภท + ปุ่มค้นหา */}
          <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
            {/* แท็บเลือกโหมดค้นหา ซื้อ/เช่า */}
            <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
              <button
                onClick={() => setActiveTab("buy")}
                className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  activeTab === "buy"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ซื้อ
              </button>
              <button
                onClick={() => setActiveTab("rent")}
                className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  activeTab === "rent"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                เช่า
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-stretch bg-slate-50 rounded-xl border border-slate-200 p-1 gap-1.5 transition-all duration-200">

              {/* ช่องกรอกทำเล (ค้นหาแบบ free text ส่งไปเป็น query "q") */}
              <div className="flex-1 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group">
                <span className="text-xl mr-3 text-slate-400">📍</span>
                <div className="flex flex-col text-left w-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ทำเลที่ตั้ง</span>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="หาดใหญ่, สงขลา, สะเดา..."
                    className="w-full bg-transparent focus:outline-none text-slate-800 font-semibold text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="hidden md:block w-px h-10 bg-slate-200 self-center" />

              {/* Dropdown เลือกประเภทอสังหาฯ (คลิกเปิด/ปิดเอง ไม่ใช้ <select> เพื่อคุมดีไซน์เอง) */}
              <div id="property-type-dropdown" className="relative md:w-48 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group cursor-pointer select-none" onClick={() => setIsTypeOpen(!isTypeOpen)}>
                <span className="text-lg mr-3 text-slate-400">🏠</span>
                <div className="flex flex-col text-left w-full">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ประเภทอสังหาฯ</span>
                  <div className="text-slate-800 font-semibold text-sm flex items-center justify-between">
                    <span>
                      {propertyType === "house" && "บ้านเดี่ยว"}
                      {propertyType === "townhome" && "ทาวน์โฮม"}
                      {propertyType === "condo" && "คอนโดมิเนียม"}
                      {propertyType === "" && "ทุกประเภท"}
                    </span>
                    <svg
                      className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
                      style={{ transform: isTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>

                {isTypeOpen && (
                  <>
                    {/* เลเยอร์โปร่งใสเต็มจอ ไว้คลิกข้างนอกเพื่อปิด dropdown */}
                    <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setIsTypeOpen(false); }} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2.5 z-50 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setPropertyType(""); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm">✨</span> ทุกประเภท
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("house"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "house" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm">🏡</span> บ้านเดี่ยว
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("townhome"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "townhome" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm">🏘️</span> ทาวน์โฮม
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("condo"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "condo" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm">🏢</span> คอนโดมิเนียม
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* ปุ่มค้นหา: รวมค่าทั้งหมด (แท็บ/ทำเล/ประเภท) ส่งไปเป็น query string ที่หน้า /search */}
              <Link
                href={`/search?tab=${activeTab}&q=${encodeURIComponent(locationInput)}&type=${propertyType}`}
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition-colors duration-200 flex items-center justify-center gap-2 text-sm w-full md:w-auto h-full min-h-[48px] self-stretch"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <span>ค้นหาเลย</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ========== ทำเลยอดนิยม: การ์ดภาพ 4 อันดับแรกจาก locations ที่คำนวณไว้ด้านบน ========== */}
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
                className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
              >
                <Image
                  src={loc.image}
                  alt={loc.name}
                  width={240}
                  height={176}
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

      {/* ========== ประกาศแนะนำล่าสุด: 3 สถานะ — กำลังโหลด / ไม่มีข้อมูล / แสดงการ์ด ========== */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">ประกาศแนะนำล่าสุด</h2>
              <p className="text-slate-500 text-xs font-medium">อสังหาริมทรัพย์คุณภาพคัดสรรโดยนายหน้ามืออาชีพ</p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center text-slate-700 font-bold hover:text-blue-700 transition bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs group"
            >
              ดูทั้งหมด <span className="ml-1 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Properties Grid */}
          {propertiesLoading ? (
            // สถานะที่ 1: กำลังโหลดข้อมูลจาก DB -> แสดงการ์ด skeleton หลอกไว้ก่อน
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
            // สถานะที่ 2: โหลดเสร็จแล้วแต่ไม่มีประกาศเลย
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm font-medium">ยังไม่มีประกาศแนะนำในขณะนี้</p>
            </div>
          ) : (
            // สถานะที่ 3: มีข้อมูล -> แสดงการ์ดประกาศ พร้อมสถานะรายการโปรด (isFav)
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredProperties.map((prop) => {
                const isFav = favorites.includes(prop.id);
                return (
                  <PropertyCard
                    key={prop.id}
                    prop={prop}
                    isFav={isFav}
                    toggleFavorite={toggleFavorite}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
