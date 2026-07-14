'use client';

/**
 * SearchPage.tsx - หน้าค้นหาและกรองรายการอสังหาริมทรัพย์ทั้งหมด
 * รูปแบบพรีเมียมตามดีไซน์: แบ่ง 2 คอลัมน์ (ตัวกรองขั้นสูงด้านซ้าย และผลลัพธ์การ์ดด้านขวา)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/app/context/AppContext';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // ฟังก์ชันเลื่อนหน้าจอไปยังส่วนผลลัพธ์การค้นหา
  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // === 1. ตัวแปรสถานะสำหรับการกรองข้อมูล (Filter States) ===
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy'); // สถานะ ซื้อ หรือ เช่า
  const [propertyType, setPropertyType] = useState('all');            // ประเภทอสังหาฯ เช่น บ้านเดี่ยว, คอนโด
  const [priceRange, setPriceRange] = useState('all');                // ช่วงราคา
  const [searchTerm, setSearchTerm] = useState('');                  // ข้อความที่ป้อนในช่องค้นหา

  // ตัวกรองขั้นสูง (Advanced Filters) ในแถบข้าง
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [bedrooms, setBedrooms] = useState<string>('any'); // 'any', '1', '2', '3', '4+'
  
  const [facilities, setFacilities] = useState({
    pool: false,
    gym: false,
    parking: false,
    security: false,
  });

  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');

  // === 2. ดึงข้อมูลรายการอสังหาฯ จากฐานข้อมูลกลาง ===
  const { properties, favorites, toggleFavorite } = useApp();

  // ซิงค์ข้อมูลเริ่มต้นจาก Query Parameters (ที่กดมาจากหน้าแรก)
  useEffect(() => {
    const q = searchParams.get('q');
    const tab = searchParams.get('tab');
    const type = searchParams.get('type');
    const price = searchParams.get('price');

    const timer = setTimeout(() => {
      if (q) setSearchTerm(q);
      if (tab === 'rent') setActiveTab('rent');
      if (tab === 'buy') setActiveTab('buy');
      if (type && type !== 'undefined') setPropertyType(type);
      if (price && price !== 'undefined') setPriceRange(price);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams]);

  // ฟังก์ชันล้างค่าตัวกรองทั้งหมด
  const handleClearFilters = () => {
    setSearchTerm('');
    setPropertyType('all');
    setPriceRange('all');
    setPriceMin('');
    setPriceMax('');
    setBedrooms('any');
    setFacilities({
      pool: false,
      gym: false,
      parking: false,
      security: false,
    });
  };

  // === 3. ฟังก์ชันการกรองข้อมูล (Filtering Logic) ===
  const filteredProperties = properties.filter((prop) => {
    // 3.1 กรองตามแท็บ ซื้อ/เช่า
    // ซื้อ = ราคาเสนอขายสูง (฿ ล้านขึ้นไป), เช่า = ค้นหาคำว่า "เช่า" หรือราคาต่ำกว่าหมื่นในคำอธิบาย
    const isRentProp = prop.title.includes('เช่า') || prop.description?.includes('เช่า') || prop.price.includes('เดือน');
    if (activeTab === 'rent' && !isRentProp) return false;
    if (activeTab === 'buy' && isRentProp) return false;

    // 3.2 ค้นหาจากชื่อโครงการ หรือทำเล
    const matchesSearch = prop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prop.location.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 3.3 กรองประเภทอสังหาฯ
    const matchesType = propertyType === 'all' || 
                        (propertyType === 'house' && prop.type.includes('บ้าน')) ||
                        (propertyType === 'condo' && prop.type.includes('คอนโด')) ||
                        (propertyType === 'townhome' && prop.type.includes('ทาวน์โฮม'));
    if (!matchesType) return false;

    // 3.4 กรองตามช่วงราคา (ตัวกรองจาก Header)
    const rawPrice = parseInt(prop.price.replace(/[^\d]/g, ''));
    if (priceRange === 'low' && rawPrice >= 3000000) return false;
    if (priceRange === 'mid' && (rawPrice < 3000000 || rawPrice > 7000000)) return false;
    if (priceRange === 'high' && rawPrice <= 7000000) return false;

    // 3.5 กรองช่วงราคากำหนดเอง (จาก Sidebar)
    if (priceMin && rawPrice < parseInt(priceMin)) return false;
    if (priceMax && rawPrice > parseInt(priceMax)) return false;

    // 3.6 กรองจำนวนห้องนอน
    if (bedrooms !== 'any') {
      if (bedrooms === '4+' && prop.bedrooms < 4) return false;
      if (bedrooms !== '4+' && prop.bedrooms !== parseInt(bedrooms)) return false;
    }

    // 3.7 กรองตามสิ่งอำนวยความสะดวก (สืบค้นข้อความจากรายละเอียด)
    const desc = (prop.description || "").toLowerCase();
    if (facilities.pool && !desc.includes('สระ') && !desc.includes('pool')) return false;
    if (facilities.gym && !desc.includes('ฟิตเนส') && !desc.includes('ยิม') && !desc.includes('gym')) return false;
    if (facilities.parking && !desc.includes('ที่จอดรถ') && !desc.includes('จอดรถ') && !desc.includes('parking')) return false;
    if (facilities.security && !desc.includes('รักษาความปลอดภัย') && !desc.includes('cctv') && !desc.includes('รปภ')) return false;

    return true;
  });

  // === 4. ฟังก์ชันการเรียงลำดับข้อมูล (Sorting) ===
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    const priceA = parseInt(a.price.replace(/[^\d]/g, ''));
    const priceB = parseInt(b.price.replace(/[^\d]/g, ''));
    
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    return 0; // Default: 'latest' (ตามตำแหน่งเดิม)
  });

  // สร้างฟังก์ชันวาดรูปภาพอักษรย่อกรณีไม่มีรูปนายหน้า (เข้ารหัส URI เพื่อความง่ายและเสถียร 100% ทั้งฝั่ง Server และ Client)
  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-16">
      <div className="pt-16"></div>

      {/* 🔍 ส่วนหัวต้อนรับและกล่องแถบค้นหาหลัก (Dark Hero Search Header) */}
      <header className="bg-slate-950 py-10 relative overflow-hidden flex items-center justify-center border-b border-slate-900">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-950"></div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-xl md:text-2xl font-black text-white mb-5 font-sans tracking-tight">
            ค้นหาอสังหาฯ ที่ใช่ สำหรับคุณ
          </h1>

          {/* แผงกรอกข้อมูลแถบค้นหา */}
          <div className="bg-white p-3 rounded-2xl md:rounded-full shadow-2xl border border-slate-200/20 max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {/* ช่องพิมพ์ค้นหาทำเล/โครงการ */}
            <div className="flex-1 flex bg-slate-50 rounded-xl md:rounded-full px-4 py-1.5 border border-slate-100 focus-within:border-blue-500 transition-colors items-center">
              <span className="text-base text-slate-400 mr-2">📍</span>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ระบุทำเล, โครงการ, สถานีรถไฟฟ้า, รหัสไปรษณีย์..." 
                className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 text-xs font-bold placeholder-slate-400 outline-none"
              />
            </div>

            <div className="w-px bg-slate-200 hidden md:block h-6"></div>

            {/* เลือก ซื้อ/เช่า */}
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

            <div className="w-px bg-slate-200 hidden md:block h-6"></div>

            {/* เลือกประเภทอสังหาฯ */}
            <div className="w-full md:w-40">
              <select 
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full bg-transparent border-none py-2 px-3 text-xs font-bold text-slate-700 cursor-pointer outline-none focus:ring-0"
              >
                <option value="all">ประเภททั้งหมด</option>
                <option value="house">บ้านเดี่ยว</option>
                <option value="condo">คอนโดมิเนียม</option>
                <option value="townhome">ทาวน์โฮม</option>
              </select>
            </div>

            {/* ปุ่มค้นหา */}
            <button 
              onClick={() => triggerSearch()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl md:rounded-full transition-all text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer md:w-auto"
            >
              🔍 ค้นหา
            </button>
          </div>
        </div>
      </header>

      {/* 📦 แผงแบ่ง 2 คอลัมน์หลักตามดีไซน์ */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* ==================================================== */}
          {/* 🛠️ คอลัมน์ซ้าย: ตัวกรองขั้นสูง (Advanced Filters)     */}
          {/* ==================================================== */}
          <aside className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="font-extrabold text-slate-900 text-sm">ตัวกรองขั้นสูง</h2>
              <button 
                onClick={handleClearFilters}
                className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
              >
                ล้างค่า
              </button>
            </div>

            {/* ช่วงราคา */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ช่วงราคา (บาท)</label>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  placeholder="ต่ำสุด" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
                <span className="text-slate-400 text-xs">-</span>
                <input 
                  type="number" 
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  placeholder="สูงสุด" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>

            {/* ห้องนอน */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ห้องนอน</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'any', label: 'ไม่ระบุ' },
                  { value: '1', label: '1+' },
                  { value: '2', label: '2+' },
                  { value: '3', label: '3+' },
                  { value: '4+', label: '4+' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setBedrooms(item.value)}
                    className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                      bedrooms === item.value 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* สิ่งอำนวยความสะดวก */}
            <div className="space-y-3">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">สิ่งอำนวยความสะดวก</label>
              <div className="space-y-2 text-xs font-bold text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={facilities.pool}
                    onChange={(e) => setFacilities({ ...facilities, pool: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>🏊 สระว่ายน้ำ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={facilities.gym}
                    onChange={(e) => setFacilities({ ...facilities, gym: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>🏋️ ฟิตเนส / ยิม</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={facilities.parking}
                    onChange={(e) => setFacilities({ ...facilities, parking: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>🚗 ที่จอดรถ</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={facilities.security}
                    onChange={(e) => setFacilities({ ...facilities, security: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <span>🛡️ ระบบรักษาความปลอดภัย 24 ชม.</span>
                </label>
              </div>
            </div>

            {/* ปุ่มค้นหาอีกครั้ง */}
            <button 
              onClick={() => triggerSearch()}
              className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold py-3 rounded-xl transition-all text-xs shadow cursor-pointer active:scale-[0.99] text-center"
            >
              อัปเดตผลการค้นหา
            </button>
          </aside>

          {/* ==================================================== */}
          {/* 🏡 คอลัมน์ขวา: ผลลัพธ์อสังหาริมทรัพย์ (Property Grid)   */}
          {/* ==================================================== */}
          <div ref={resultsRef} className="lg:col-span-3 space-y-6">
            
            {/* หัวเรื่องผลลัพธ์พร้อมแท็บจัดเรียง */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base leading-tight">
                  {propertyType === 'house' ? 'บ้านเดี่ยว' : propertyType === 'condo' ? 'คอนโดมิเนียม' : propertyType === 'townhome' ? 'ทาวน์โฮม' : 'อสังหาริมทรัพย์'}
                  {searchTerm ? ` ใน ${searchTerm}` : 'แนะนำทั้งหมด'}
                </h2>
                <p className="text-slate-400 text-xs font-semibold mt-1">พบอสังหาริมทรัพย์ {sortedProperties.length} รายการ</p>
              </div>

              {/* การจัดเรียงลำดับ */}
              <div className="flex items-center gap-2 text-xs font-bold">
                <button className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 flex items-center gap-1 hover:bg-slate-100 transition">
                  🗺️ ดูแผนที่
                </button>
                <span className="text-slate-400 font-medium">เรียงตาม:</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'latest' | 'price_asc' | 'price_desc')}
                  className="bg-slate-50 border border-slate-200 rounded-lg py-1 px-2.5 text-slate-700 outline-none cursor-pointer"
                >
                  <option value="latest">ล่าสุด</option>
                  <option value="price_asc">ราคาต่ำสุด</option>
                  <option value="price_desc">ราคาสูงสุด</option>
                </select>
              </div>
            </div>

            {/* รายการแสดงข้อมูลอสังหาฯ */}
            {sortedProperties.length === 0 ? (
              <div className="text-center py-24 bg-white border border-slate-200/80 rounded-3xl text-slate-400 text-xs font-bold">
                📭 ไม่พบอสังหาริมทรัพย์ที่สอดคล้องกับเงื่อนไขการค้นหา<br/>
                <span className="font-medium text-slate-300 mt-1 block">กรุณาลองเปลี่ยนชื่อทำเล หรือรีเซ็ตตัวกรองด้านซ้าย</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sortedProperties.map((prop) => {
                  const isFav = favorites.includes(prop.id);
                  return (
                    <div 
                      key={prop.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 flex flex-col justify-between relative group"
                    >
                      {/* ปุ่มถูกใจ */}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(prop.id);
                        }}
                        className="absolute top-3.5 right-3.5 z-10 w-8 h-8 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-115 transition shadow-md cursor-pointer"
                      >
                        <svg 
                          className={`w-4 h-4 ${isFav ? 'text-red-500' : 'text-slate-400'}`} 
                          fill={isFav ? 'currentColor' : 'none'} 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                      </button>

                      {/* แท็กด้านซ้ายบนของภาพ */}
                      <div className="absolute top-3.5 left-3.5 z-10 flex flex-col gap-1.5">
                        <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black shadow uppercase tracking-wide">
                          {prop.tag || 'แนะนำ'}
                        </span>
                        <span className="bg-slate-900/85 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[9px] font-black shadow tracking-wide">
                          {prop.type}
                        </span>
                      </div>

                      {/* ลิงก์รายละเอียดตัวการ์ด */}
                      <Link href={`/property/${prop.id}`} className="block flex-grow">
                        <div className="relative h-44 overflow-hidden bg-slate-100">
                          <img 
                            src={prop.image} 
                            alt={prop.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="p-5 space-y-3">
                          {/* ราคา */}
                          <div className="text-xl font-black text-blue-700 leading-none">
                            {prop.price}
                          </div>
                          
                          {/* ชื่ออสังหาฯ */}
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {prop.title}
                          </h3>

                          {/* ทำเลที่ตั้ง */}
                          <p className="text-slate-400 text-[11px] font-semibold flex items-center gap-1">
                            📍 {prop.location.replace("📍 ", "")}
                          </p>

                          {/* สเปคข้อมูลห้อง */}
                          <div className="flex items-center justify-between text-slate-500 border border-slate-100 py-2.5 bg-slate-50/50 px-3 rounded-xl text-[11px] font-bold">
                            <span>🛏️ {prop.bedrooms} ห้องนอน</span>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <span>🚿 {prop.bathrooms} ห้องน้ำ</span>
                            <div className="w-px h-4 bg-slate-200"></div>
                            <span>📏 {prop.area} ตร.ม.</span>
                          </div>
                        </div>
                      </Link>

                      {/* ลายเซ็นนายหน้าด้านล่าง */}
                      <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-2">
                          <img 
                            src={prop.agentImage || getInitialsAvatar(prop.agentName)} 
                            alt={prop.agentName}
                            referrerPolicy="no-referrer"
                            onError={(e) => { e.currentTarget.src = getInitialsAvatar(prop.agentName); }}
                            className="w-7 h-7 rounded-full border border-white shadow-sm object-cover"
                          />
                          <div>
                            <div className="text-[10px] font-black text-slate-800 leading-none">{prop.agentName}</div>
                            <div className="text-[8px] text-blue-600 font-bold mt-0.5 uppercase tracking-wider">Verified Agent</div>
                          </div>
                        </div>

                        <Link 
                          href={`/property/${prop.id}`}
                          className="text-[10px] text-blue-600 font-black hover:text-blue-700 transition flex items-center gap-0.5"
                        >
                          รายละเอียด &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* แถบเปลี่ยนหมายเลขหน้า (Pagination) */}
            {sortedProperties.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 text-xs font-bold">
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer">&lt;</button>
                <button className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 cursor-pointer">1</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 cursor-pointer">2</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 cursor-pointer">3</button>
                <span className="text-slate-400 px-1">...</span>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 cursor-pointer">12</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer">&gt;</button>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* 📋 ส่วนท้ายเว็บไซต์ (Footer ตามรูปแบบ Screenshot) */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 mt-16 text-xs">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-xs">S</div>
              <span>Srichai<span className="text-blue-500">Property</span></span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              ระบบบริหารจัดการซื้อขายอสังหาริมทรัพย์ สงขลา คัดสรรโดยทีมงาน Srichai Property Agents และนายหน้าที่ได้รับความเชื่อถือในพื้นที่เดียวกัน
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">เมนูหลัก</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Link href="/home" className="hover:text-white transition">ค้นหาบ้าน</Link>
              <Link href="/profile" className="hover:text-white transition">บัญชีของฉัน</Link>
              <Link href="/login" className="hover:text-white transition">ออกจากระบบ</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">ติดต่อเรา</h4>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li>📍 มหาวิทยาลัยสงขลานครินทร์</li>
              <li>📧 contact@srichaiproperty.com</li>
              <li>📞 074-XXXX-XXXX</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 text-center border-t border-slate-900 mt-8 pt-6 text-[10px] text-slate-600">
          &copy; 2026 Srichai Property Agents. โดยระบบระบบบริการจัดการซื้อขายอสังหาริมทรัพย์.
        </div>
      </footer>
    </div>
  );
}
