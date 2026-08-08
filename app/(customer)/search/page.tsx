'use client';

/**
 * ==============================================================================
 * หน้าค้นหาอสังหาริมทรัพย์ (Search Page)
 * ==============================================================================
 * ภาพรวมการทำงาน:
 * 1. หน้านี้เป็น Client Component ('use client') เพราะต้องใช้ State และอ่าน/เขียน URL Query String
 * 2. ดึงข้อมูลอสังหาริมทรัพย์ทั้งหมดมาจาก Context กลาง (useApp -> properties)
 * 3. ทำหน้าที่ "กรอง (Filter)" และ "เรียงลำดับ (Sort)" ข้อมูลฝั่ง Client โดยไม่ต้องยิง API ค้นหาใหม่
 * 4. ซิงก์เงื่อนไขค้นหาทั้งหมดลง URL Query String (เช่น ?q=บ้าน&type=condo) เพื่อให้กด Refresh หรือแชร์ลิงก์ได้
 * ==============================================================================
 */

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import SearchSidebar, { FilterState } from '@/components/customer/SearchSidebar';
import PropertyCard from '@/components/customer/PropertyCard';

// ค่าเริ่มต้นสำหรับรีเซ็ตตัวกรองทั้งหมด
const DEFAULT_FILTERS: FilterState = {
  province: '',
  amphure: '',
  district: '',
  priceMin: '',
  priceMax: '',
  bedrooms: 'any',
  bathrooms: 'any',
  areaMin: '',
  areaMax: '',
  facilities: { pool: false, gym: false, parking: false, security: false },
};

function SearchPageContent() {
  // ---- Hooks สำหรับอ่าน/อัปเดต URL และ Context กลาง ----
  const searchParams = useSearchParams(); // อ่าน URL query string เช่น ?q=...
  const router = useRouter();             // อัปเดต URL โดยไม่ reload หน้า
  const pathname = usePathname();         // path ปัจจุบัน (/search)
  const resultsRef = useRef<HTMLDivElement>(null); // อ้างอิงตำแหน่งส่วนแสดงผลลัพธ์เพื่อ scroll ลงมาดู
  const { properties, favorites, toggleFavorite } = useApp(); // ดึงข้อมูลบ้านและรายการโปรดจาก Context

  // ---- 1. State ของเงื่อนไขการค้นหา (อ่านค่าเริ่มต้นจาก URL โดยตรง) ----
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') || '');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>(() => searchParams.get('tab') === 'rent' ? 'rent' : 'buy');
  const [propertyType, setPropertyType] = useState(() => searchParams.get('type') || 'all');

  // รวมตัวกรองละเอียดใน Sidebar ไว้ใน Object เดียว
  const [filters, setFilters] = useState<FilterState>(() => ({
    province: searchParams.get('province') || '',
    amphure: searchParams.get('amphure') || '',
    district: searchParams.get('district') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    bedrooms: searchParams.get('bedrooms') || 'any',
    bathrooms: searchParams.get('bathrooms') || 'any',
    areaMin: searchParams.get('areaMin') || '',
    areaMax: searchParams.get('areaMax') || '',
    facilities: {
      pool: searchParams.get('facilities')?.includes('pool') || false,
      gym: searchParams.get('facilities')?.includes('gym') || false,
      parking: searchParams.get('facilities')?.includes('parking') || false,
      security: searchParams.get('facilities')?.includes('security') || false,
    },
  }));

  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // ---- 2. Debounce: หน่วงเวลาพิมพ์ค้นหา 500ms เพื่อลดการรีเรนเดอร์บ่อยเกินไป ----
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ---- 3. ซิงก์ State ของตัวกรองทั้งหมดกลับไปยัง URL Query String ----
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);
    if (activeTab !== 'buy') params.set('tab', activeTab);
    if (propertyType !== 'all') params.set('type', propertyType);

    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms !== 'any') params.set('bathrooms', filters.bathrooms);
    if (filters.areaMin) params.set('areaMin', filters.areaMin);
    if (filters.areaMax) params.set('areaMax', filters.areaMax);
    if (filters.province) params.set('province', filters.province);
    if (filters.amphure) params.set('amphure', filters.amphure);
    if (filters.district) params.set('district', filters.district);

    const activeFacs = Object.entries(filters.facilities)
      .filter(([, active]) => active)
      .map(([k]) => k)
      .join(',');
    if (activeFacs) params.set('facilities', activeFacs);

    const newQuery = params.toString();
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    // อัปเดต URL โดยไม่สร้างประวัติย้อนกลับ (replace) และไม่เลื่อนจอ (scroll: false)
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearchTerm, activeTab, propertyType, filters, pathname, router, searchParams]);

  // ฟังก์ชันเมื่อกดปุ่ม "ค้นหา" ใน Hero Header
  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // ฟังก์ชันล้างตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น
  const handleClearFilters = () => {
    setSearchTerm('');
    setPropertyType('all');
    setFilters(DEFAULT_FILTERS);
  };

  // ---- 4. Logic การกรองข้อมูล (Filter Properties) ----
  const filteredProperties = properties.filter((prop) => {
    // 4.1 กรองตามแท็บ ซื้อ/เช่า
    if (activeTab === 'rent' && prop.listingType !== 'rent') return false;
    if (activeTab === 'buy' && prop.listingType !== 'sale') return false;

    // 4.2 กรองตามคำค้นหา (ค้นจากชื่อทรัพย์, ที่อยู่, ชื่อจังหวัด/อำเภอ/ตำบล)
    const s = debouncedSearchTerm.toLowerCase().trim();
    if (s && ![prop.title, prop.location, prop.amphureName, prop.provinceName, prop.districtName].some(f => (f || '').toLowerCase().includes(s))) {
      return false;
    }

    // 4.3 กรองตามทำเล (จังหวัด/อำเภอ/ตำบล)
    if (filters.province && prop.province_id !== parseInt(filters.province)) return false;
    if (filters.amphure && prop.amphure_id !== parseInt(filters.amphure)) return false;
    if (filters.district && prop.district_id !== parseInt(filters.district)) return false;

    // 4.4 กรองตามประเภททรัพย์ (บ้าน/คอนโด/ทาวน์โฮม/ที่ดิน)
    const typeMap: Record<string, string> = { house: 'บ้าน', condo: 'คอนโด', townhome: 'ทาวน์โฮม', land: 'ที่ดิน' };
    if (propertyType !== 'all' && typeMap[propertyType] && !prop.type.includes(typeMap[propertyType]) && !(propertyType === 'land' && prop.type.toLowerCase().includes('land'))) {
      return false;
    }

    // 4.5 กรองตามช่วงราคา (แปลงราคาจากข้อความ -> ตัวเลขก่อนเทียบ)
    const price = parseInt(prop.price.replace(/[^\d]/g, '')) || 0;
    if (filters.priceMin && price < parseInt(filters.priceMin)) return false;
    if (filters.priceMax && price > parseInt(filters.priceMax)) return false;

    // 4.6 กรองตามจำนวนห้องนอน และห้องน้ำ
    if (filters.bedrooms !== 'any' && (prop.bedrooms || 0) < parseInt(filters.bedrooms)) return false;
    if (filters.bathrooms !== 'any' && (prop.bathrooms || 0) < parseInt(filters.bathrooms)) return false;

    // 4.7 กรองตามขนาดพื้นที่
    if (filters.areaMin && (prop.area || 0) < parseFloat(filters.areaMin)) return false;
    if (filters.areaMax && (prop.area || 0) > parseFloat(filters.areaMax)) return false;

    // 4.8 กรองตามสิ่งอำนวยความสะดวก (เช็คจากคำในรายละเอียด)
    const desc = prop.description || '';
    if (filters.facilities.pool && !/สระ|pool/i.test(desc)) return false;
    if (filters.facilities.gym && !/ฟิตเนส|ยิม|gym/i.test(desc)) return false;
    if (filters.facilities.parking && !/ที่จอดรถ|จอดรถ|parking/i.test(desc)) return false;
    if (filters.facilities.security && !/รักษาความปลอดภัย|cctv|รปภ/i.test(desc)) return false;

    return true; // ผ่านทุกเงื่อนไข -> ติดในผลลัพธ์
  });

  // ---- 5. Logic การเรียงลำดับข้อมูล (Sort Properties) ----
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (sortBy === 'latest') return 0;
    const priceA = parseInt(a.price.replace(/[^\d]/g, '')) || 0;
    const priceB = parseInt(b.price.replace(/[^\d]/g, '')) || 0;
    return sortBy === 'price_asc' ? priceA - priceB : priceB - priceA;
  });

  // ---- 6. Logic การแบ่งหน้า (Pagination: 6 รายการ/หน้า) ----
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProperties = sortedProperties.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased text-sm pb-16 pt-16">
      {/* -------------------- Hero Header: ส่วนค้นหาหลักด้านบน -------------------- */}
      <header className="bg-slate-900 pt-16 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-sm">
            ค้นหาบ้านที่ใช่ สำหรับคุณ
          </h1>
          <p className="text-slate-300 font-medium mb-8 text-sm max-w-lg mx-auto drop-shadow-sm">
            ค้นพบอสังหาริมทรัพย์ระดับพรีเมียมกว่า 10,000+ รายการ พร้อมให้คุณเป็นเจ้าของแล้ววันนี้
          </p>

          {/* กล่องกรอกคำค้นหา + ซื้อ/เช่า + เลือกประเภท */}
          <div className="bg-white p-3 rounded-2xl md:rounded-full shadow-2xl border border-slate-200/20 max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="flex-1 flex bg-slate-50 rounded-xl md:rounded-full px-4 py-1.5 border border-slate-100 focus-within:border-blue-500 transition-colors items-center">
              <span className="text-base text-slate-400 mr-2">📍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                placeholder="ระบุทำเล, โครงการ, สถานีรถไฟฟ้า, รหัสไปรษณีย์..."
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 text-xs font-bold placeholder-slate-400 outline-none"
              />
            </div>

            <div className="w-px bg-slate-200 hidden md:block h-6" />

            <div className="w-full md:w-36">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as 'buy' | 'rent')}
                className="w-full bg-transparent border-none py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer outline-none focus:ring-0"
              >
                <option value="buy">ซื้อ (Buy)</option>
                <option value="rent">เช่า (Rent)</option>
              </select>
            </div>

            <div className="w-px bg-slate-200 hidden md:block h-6" />

            <div className="w-full md:w-44">
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full bg-transparent border-none py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer outline-none focus:ring-0"
              >
                <option value="all">ประเภททั้งหมด</option>
                <option value="house">บ้านเดี่ยว (House)</option>
                <option value="condo">คอนโดมิเนียม (Condo)</option>
                <option value="townhome">ทาวน์โฮม (Townhome)</option>
              </select>
            </div>

            <button
              onClick={() => triggerSearch()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl md:rounded-full transition-all text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
            >
               ค้นหา
            </button>
          </div>
        </div>
      </header>

      {/* -------------------- Main Section: Sidebar (ซ้าย) + ผลลัพธ์การค้นหา (ขวา) -------------------- */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Sidebar ตัวกรองละเอียด */}
          <SearchSidebar
            filters={filters}
            setFilters={setFilters}
            isMobileDrawerOpen={isMobileDrawerOpen}
            setIsMobileDrawerOpen={setIsMobileDrawerOpen}
            handleClearFilters={handleClearFilters}
          />

          {/* ฝั่งแสดงรายการผลลัพธ์ */}
          <div ref={resultsRef} className="lg:col-span-3 space-y-5">
            {/* แถบหัวข้อ + เลือกการเรียงลำดับ */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">อสังหาริมทรัพย์แนะนำทั้งหมด</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">พบอสังหาริมทรัพย์ {sortedProperties.length} รายการ</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  ตัวกรอง
                </button>

                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-400 font-medium whitespace-nowrap">เรียงตาม:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'price_asc' | 'price_desc')}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 cursor-pointer text-xs focus:ring-0 focus:border-slate-300 outline-none"
                  >
                    <option value="latest">ล่าสุด</option>
                    <option value="price_asc">ราคา: ต่ำ &rarr; สูง</option>
                    <option value="price_desc">ราคา: สูง &rarr; ต่ำ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* แสดงข้อความเมื่อไม่พบผลลัพธ์ หรือแสดง Grid การ์ดบ้าน */}
            {sortedProperties.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm space-y-4">
                <div className="text-4xl"></div>
                <h3 className="font-extrabold text-slate-800 text-sm">ไม่พบอสังหาริมทรัพย์ที่ตรงกับเงื่อนไข</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">กรุณาลองปรับลดตัวกรอง หรือล้างตัวเลือกตัวกรองทั้งหมดแล้วลองค้นหาใหม่อีกครั้ง</p>
                <button
                  onClick={handleClearFilters}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-2 rounded-full text-xs shadow-md transition cursor-pointer"
                >
                  ล้างค่าตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginatedProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    prop={prop}
                    isFav={favorites.includes(prop.id)}
                    toggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

            {/* ปุ่มเปลี่ยนหน้า (Pagination) */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 text-xs font-bold">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
                >
                  &lt;
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-bold transition cursor-pointer flex items-center justify-center ${
                      validCurrentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ห่อด้วย Suspense ตามข้อกำหนดของ Next.js เมื่อมีการใช้ useSearchParams()
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
