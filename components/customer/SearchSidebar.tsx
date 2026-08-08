'use client';

/**
 * ==============================================================================
 * หน้าจอแถบตัวกรองการค้นหาอสังหาริมทรัพย์ฝั่งซ้าย (Search Sidebar Component)
 * ==============================================================================
 * หน้าที่หลัก:
 * 1. รับค่าตัวกรองทั้งหมด (`filters`) และฟังก์ชันสำหรับอัปเดต (`setFilters`) จากหน้าแม่ (search/page.tsx)
 * 2. ทำหน้าที่ดึงข้อมูลทำเลที่ตั้งแบบลำดับขั้น (จังหวัด -> อำเภอ -> ตำบล) ผ่าน API `/api/locations`
 * 3. เป็นส่วนที่ให้ผู้ใช้งานกรอก/เลือกเงื่อนไขต่างๆ เช่น ช่วงราคา, จำนวนห้องนอน, ห้องน้ำ, พื้นที่ และสิ่งอำนวยความสะดวก
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';

/**
 * ------------------------------------------------------------------------------
 * โครงสร้างข้อมูลประเภทตัวกรองทั้งหมด (Filter State Interface)
 * ------------------------------------------------------------------------------
 * รวบรวมฟิลด์เงื่อนไขทั้งหมดที่ผู้ใช้สามารถเลือกหรือกรอกได้ใน Sidebar
 */
export interface FilterState {
  province: string;  // ID จังหวัดที่เลือก (เช่น '90' สำหรับสงขลา)
  amphure: string;   // ID อำเภอที่เลือก (เช่น '9001' สำหรับหาดใหญ่)
  district: string;  // ID ตำบลที่เลือก
  priceMin: string;  // ราคาต่ำสุดที่ต้องการค้นหา (บาท)
  priceMax: string;  // ราคาสูงสุดที่ต้องการค้นหา (บาท)
  bedrooms: string;  // จำนวนห้องนอนขั้นต่ำ ('any', '1', '2', '3', '4+')
  bathrooms: string; // จำนวนห้องน้ำขั้นต่ำ ('any', '1', '2', '3', '4+')
  areaMin: string;   // ขนาดพื้นที่ต่ำสุด (ตารางเมตร)
  areaMax: string;   // ขนาดพื้นที่สูงสุด (ตารางเมตร)
  facilities: {      // สิ่งอำนวยความสะดวกที่ต้องการ (เปิดเป็น true, ปิดเป็น false)
    pool: boolean;     // สระว่ายน้ำ
    gym: boolean;      // ฟิตเนส / ยิม
    parking: boolean;  // ที่จอดรถ
    security: boolean; // ระบบรักษาความปลอดภัย / CCTV
  };
}

/**
 * โครงสร้างข้อมูลสถานที่ (จังหวัด / อำเภอ / ตำบล) ที่ส่งกลับมาจาก API หลังบ้าน
 */
interface LocationItem {
  id: number;        // รหัสประจำสถานที่ในฐานข้อมูล
  name_th: string;   // ชื่อสถานที่ภาษาไทย (เช่น "สงขลา", "หาดใหญ่")
  name_en: string;   // ชื่อสถานที่ภาษาอังกฤษ
}

/**
 * Props ที่รับมาจากคอมโพเนนต์แม่ (search/page.tsx)
 */
interface SearchSidebarProps {
  filters: FilterState;                                           // วัตถุเก็บค่าตัวกรองปัจจุบัน
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;  // ฟังก์ชันสำหรับอัปเดตตัวกรอง
  isMobileDrawerOpen?: boolean;                                   // สถานะเปิด/ปิดแถบตัวกรองบนจอมือถือ
  setIsMobileDrawerOpen?: (val: boolean) => void;                // ฟังก์ชันปิดแถบตัวกรองบนจอมือถือ
  handleClearFilters: () => void;                                 // ฟังก์ชันล้างค่าตัวกรองทั้งหมด
}

/**
 * รายการตัวเลือกสำหรับปุ่มกดเลือกจำนวนห้องนอน / ห้องน้ำ
 */
const ROOM_OPTIONS = [
  { value: 'any', label: 'ไม่ระบุ' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4+', label: '4+' },
];

export default function SearchSidebar({
  filters,
  setFilters,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  handleClearFilters,
}: SearchSidebarProps) {
  // ---- State สำหรับเก็บรายการตัวเลือกใน Dropdowns ที่ดึงมาจาก API ----
  const [provincesList, setProvincesList] = useState<LocationItem[]>([]); // รายชื่อจังหวัดทั้งหมด
  const [amphuresList, setAmphuresList] = useState<LocationItem[]>([]);   // รายชื่ออำเภอในจังหวัดที่เลือก
  const [districtsList, setDistrictsList] = useState<LocationItem[]>([]); // รายชื่อตำบลในอำเภอที่เลือก

  // ============================================================================
  // 1: โหลดรายชื่อจังหวัดทั้งหมดจาก API เมื่อเปิดหน้าเว็บครั้งแรก
  // ============================================================================
  useEffect(() => {
    async function loadProvinces() {
      try {
        const res = await fetch('/api/locations?type=provinces');
        const data = await res.json();
        // ตรวจสอบว่าเป็น Array แล้วอัปเดตลง State รายชื่อจังหวัด
        if (Array.isArray(data)) setProvincesList(data);
      } catch (err) {
        console.error('Failed to load provinces:', err);
      }
    }
    loadProvinces();
  }, []); // [] = ทำงานแค่ครั้งเดียวเมื่อคอมโพเนนต์แสดงผลครั้งแรก

  // ============================================================================
  // 2: โหลดรายชื่ออำเภอเฉพาะเมื่อผู้ใช้เลือก "จังหวัด" (filters.province เปลี่ยน)
  // ============================================================================
  useEffect(() => {
    // ถ้ายังไม่ได้เลือกจังหวัด ให้ข้าม ไม่ต้องยิง API
    if (!filters.province) return;

    let active = true; // ตัวแปรเช็คสถานะการทำ async ป้องกัน race condition
    async function loadAmphures() {
      try {
        const res = await fetch(`/api/locations?type=amphures&provinceId=${filters.province}`);
        const data = await res.json();
        // ถ้าคอมโพเนนต์ยังอยู่ และข้อมูลเป็น Array ให้อัปเดตรายการอำเภอ
        if (active && Array.isArray(data)) setAmphuresList(data);
      } catch (err) {
        console.error('Failed to load amphures:', err);
      }
    }

    loadAmphures();
    return () => {
      active = false; // ยกเลิกการอัปเดตผลลัพธ์ถ้าผู้ใช้เปลี่ยนจังหวัดไวกว่า API คืนค่า
    };
  }, [filters.province]); // ทำงานใหม่ทุกครั้งที่ผู้ใช้เลือกจังหวัดใหม่

  // ============================================================================
  // 3: โหลดรายชื่อตำบลเฉพาะเมื่อผู้ใช้เลือก "อำเภอ" (filters.amphure เปลี่ยน)
  // ============================================================================
  useEffect(() => {
    // ถ้ายังไม่ได้เลือกอำเภอ ให้ข้าม ไม่ต้องยิง API
    if (!filters.amphure) return;

    let active = true;
    async function loadDistricts() {
      try {
        const res = await fetch(`/api/locations?type=districts&amphureId=${filters.amphure}`);
        const data = await res.json();
        if (active && Array.isArray(data)) setDistrictsList(data);
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    }

    loadDistricts();
    return () => {
      active = false;
    };
  }, [filters.amphure]); // ทำงานใหม่ทุกครั้งที่ผู้ใช้เลือกอำเภอใหม่

  // ============================================================================
  // ฟังก์ชันจัดการการเปลี่ยนค่า
  // ============================================================================

  /**
   * ฟังก์ชันช่วยอัปเดตค่าใน `filters` ทีละฟิลด์อย่างปลอดภัย (Generics Type-Safe)
   */
  const updateFilter = <K extends keyof FilterState>(key: K, val: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
  };

  /**
   * ฟังก์ชันเมื่อผู้ใช้เปลี่ยน "จังหวัด"
   * -> ตั้งค่าจังหวัดใหม่ และรีเซ็ตค่าอำเภอ/ตำบลย่อยให้เป็นค่าว่าง พร้อมล้าง Dropdown
   */
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, province: val, amphure: '', district: '' }));
    setAmphuresList([]);
    setDistrictsList([]);
  };

  /**
   * ฟังก์ชันเมื่อผู้ใช้เปลี่ยน "อำเภอ"
   * -> ตั้งค่าอำเภอใหม่ และรีเซ็ตค่าตำบลย่อยให้เป็นค่าว่าง
   */
  const handleAmphureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFilters((prev) => ({ ...prev, amphure: val, district: '' }));
    setDistrictsList([]);
  };

  /**
   * ฟังก์ชันเมื่อกดปุ่ม "ล้างค่าตัวกรองทั้งหมด"
   */
  const onResetAll = () => {
    setAmphuresList([]);
    setDistrictsList([]);
    handleClearFilters(); // เรียกฟังก์ชันล้างค่าใน page.tsx
  };

  return (
    <>
      {/* -------------------- Mobile Backdrop Overlay (ฉากหลังสีดำเมื่อเปิดบนมือถือ) -------------------- */}
      {isMobileDrawerOpen && setIsMobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity" 
          onClick={() => setIsMobileDrawerOpen(false)} 
        />
      )}
      
      {/* -------------------- กล่องหลักของ Sidebar (รองรับทั้ง Responsive & Mobile Drawer) -------------------- */}
      <aside className={`bg-white p-5 rounded-t-3xl lg:rounded-2xl border border-slate-200/80 shadow-lg lg:shadow-sm space-y-6 lg:sticky lg:top-24
        fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-auto transition-transform duration-300 ease-in-out lg:transform-none overflow-y-auto max-h-[85vh] lg:max-h-none lg:block
        ${isMobileDrawerOpen ? 'translate-y-0' : 'translate-y-full'} lg:translate-y-0
      `}>
        {/* หัวข้อ Sidebar + ปุ่มล้างค่า */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="font-extrabold text-slate-900 text-sm">ตัวกรองขั้นสูง</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={onResetAll}
              className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
            >
              ล้างค่า
            </button>
            {setIsMobileDrawerOpen && (
              <button 
                onClick={() => setIsMobileDrawerOpen(false)} 
                className="lg:hidden w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* -------------------- 1. ส่วนเลือกทำเลที่ตั้ง (จังหวัด -> อำเภอ -> ตำบล) -------------------- */}
        <div className="space-y-3 pb-3 border-b border-slate-100">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ทำเลที่ตั้ง (ระบุตามเขตพื้นที่)</label>
          
          <div className="space-y-2">
            {/* เลือกจังหวัด */}
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-bold text-slate-500">จังหวัด</span>
              <select 
                value={filters.province}
                onChange={handleProvinceChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer"
              >
                <option value="">-- เลือกจังหวัด --</option>
                {provincesList.map((prov) => (
                  <option key={prov.id} value={prov.id}>{prov.name_th}</option>
                ))}
              </select>
            </div>

            {/* เลือกอำเภอ (ปิดไม่ให้กดเลือกจนกว่าจะเลือกจังหวัดก่อน) */}
            <div className="flex flex-col gap-1 text-xs">
              <span className={`font-bold ${filters.province ? 'text-slate-500' : 'text-slate-300'}`}>อำเภอ / เขต</span>
              <select 
                value={filters.amphure}
                onChange={handleAmphureChange}
                disabled={!filters.province}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- เลือกอำเภอ --</option>
                {amphuresList.map((amp) => (
                  <option key={amp.id} value={amp.id}>{amp.name_th}</option>
                ))}
              </select>
            </div>

            {/* เลือกตำบล (ปิดไม่ให้กดเลือกจนกว่าจะเลือกอำเภอก่อน) */}
            <div className="flex flex-col gap-1 text-xs">
              <span className={`font-bold ${filters.amphure ? 'text-slate-500' : 'text-slate-300'}`}>ตำบล / แขวง</span>
              <select 
                value={filters.district}
                onChange={(e) => updateFilter('district', e.target.value)}
                disabled={!filters.amphure}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- เลือกตำบล --</option>
                {districtsList.map((dist) => (
                  <option key={dist.id} value={dist.id}>{dist.name_th}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* -------------------- 2. ส่วนกรอกช่วงราคา (ต่ำสุด - สูงสุด) -------------------- */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ช่วงราคา (บาท)</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={filters.priceMin}
              onChange={(e) => updateFilter('priceMin', e.target.value)}
              placeholder="ต่ำสุด" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="number" 
              value={filters.priceMax}
              onChange={(e) => updateFilter('priceMax', e.target.value)}
              placeholder="สูงสุด" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {/* -------------------- 3. ส่วนเลือกจำนวนห้องนอน -------------------- */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ห้องนอน</label>
          <div className="flex flex-wrap gap-1.5">
            {ROOM_OPTIONS.map((item) => (
              <button
                key={item.value}
                onClick={() => updateFilter('bedrooms', item.value)}
                className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                  filters.bedrooms === item.value 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* -------------------- 4. ส่วนเลือกจำนวนห้องน้ำ -------------------- */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ห้องน้ำ</label>
          <div className="flex flex-wrap gap-1.5">
            {ROOM_OPTIONS.map((item) => (
              <button
                key={item.value}
                onClick={() => updateFilter('bathrooms', item.value)}
                className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                  filters.bathrooms === item.value 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* -------------------- 5. ส่วนกรอกขนาดพื้นที่ (ตร.ม.) -------------------- */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">พื้นที่ (ตร.ม.)</label>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={filters.areaMin}
              onChange={(e) => updateFilter('areaMin', e.target.value)}
              placeholder="ต่ำสุด" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input 
              type="number" 
              value={filters.areaMax}
              onChange={(e) => updateFilter('areaMax', e.target.value)}
              placeholder="สูงสุด" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
            />
          </div>
        </div>

        {/* -------------------- 6. ส่วนติ๊กเลือกสิ่งอำนวยความสะดวก -------------------- */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">สิ่งอำนวยความสะดวก</label>
          <div className="space-y-2 text-xs font-bold text-slate-600">
            {[
              { key: 'pool', label: 'สระว่ายน้ำ' },
              { key: 'gym', label: 'ฟิตเนส / ยิม' },
              { key: 'parking', label: 'ที่จอดรถ' },
              { key: 'security', label: 'รักษาความปลอดภัย / CCTV' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                <input 
                  type="checkbox" 
                  checked={filters.facilities[key as keyof typeof filters.facilities]}
                  onChange={(e) => updateFilter('facilities', { ...filters.facilities, [key]: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
