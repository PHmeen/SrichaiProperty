'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import SearchSidebar from './components/SearchSidebar';
import PropertyCard from '../../../components/PropertyCard';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy');
  const [propertyType, setPropertyType] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [bedrooms, setBedrooms] = useState<string>('any');
  const [facilities, setFacilities] = useState({
    pool: false,
    gym: false,
    parking: false,
    security: false,
  });

  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc'>('latest');

  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedAmphure, setSelectedAmphure] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  const [provincesList, setProvincesList] = useState<{ id: number; name_th: string; name_en: string }[]>([]);
  const [amphuresList, setAmphuresList] = useState<{ id: number; name_th: string; name_en: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ id: number; name_th: string; name_en: string; zip_code: number }[]>([]);

  const { properties, favorites, toggleFavorite } = useApp();

  useEffect(() => {
    fetch('/api/locations?type=provinces')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProvincesList(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedProvince) return;
    fetch(`/api/locations?type=amphures&provinceId=${selectedProvince}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAmphuresList(data);
      })
      .catch(console.error);
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedAmphure) return;
    fetch(`/api/locations?type=districts&amphureId=${selectedAmphure}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDistrictsList(data);
      })
      .catch(console.error);
  }, [selectedAmphure]);

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
    setSelectedProvince('');
    setSelectedAmphure('');
    setSelectedDistrict('');
    setAmphuresList([]);
    setDistrictsList([]);
  };

  const filteredProperties = properties.filter((prop) => {
    const isRentProp = prop.title.includes('เช่า') || prop.description?.includes('เช่า') || prop.price.includes('เดือน');
    if (activeTab === 'rent' && !isRentProp) return false;
    if (activeTab === 'buy' && isRentProp) return false;

    const matchesSearch = prop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          prop.location.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedProvince && prop.province_id !== parseInt(selectedProvince)) return false;
    if (selectedAmphure && prop.amphure_id !== parseInt(selectedAmphure)) return false;
    if (selectedDistrict && prop.district_id !== parseInt(selectedDistrict)) return false;

    const matchesType = propertyType === 'all' || 
                        (propertyType === 'house' && prop.type.includes('บ้าน')) ||
                        (propertyType === 'condo' && prop.type.includes('คอนโด')) ||
                        (propertyType === 'townhome' && prop.type.includes('ทาวน์โฮม'));
    if (!matchesType) return false;

    const rawPrice = parseInt(prop.price.replace(/[^\d]/g, ''));
    if (priceRange === 'low' && rawPrice >= 3000000) return false;
    if (priceRange === 'mid' && (rawPrice < 3000000 || rawPrice > 7000000)) return false;
    if (priceRange === 'high' && rawPrice <= 7000000) return false;

    if (priceMin && rawPrice < parseInt(priceMin)) return false;
    if (priceMax && rawPrice > parseInt(priceMax)) return false;

    if (bedrooms !== 'any') {
      if (bedrooms === '4+' && prop.bedrooms < 4) return false;
      if (bedrooms !== '4+' && prop.bedrooms !== parseInt(bedrooms)) return false;
    }

    const desc = (prop.description || "").toLowerCase();
    if (facilities.pool && !desc.includes('สระ') && !desc.includes('pool')) return false;
    if (facilities.gym && !desc.includes('ฟิตเนส') && !desc.includes('ยิม') && !desc.includes('gym')) return false;
    if (facilities.parking && !desc.includes('ที่จอดรถ') && !desc.includes('จอดรถ') && !desc.includes('parking')) return false;
    if (facilities.security && !desc.includes('รักษาความปลอดภัย') && !desc.includes('cctv') && !desc.includes('รปภ')) return false;

    return true;
  });

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    const priceA = parseInt(a.price.replace(/[^\d]/g, ''));
    const priceB = parseInt(b.price.replace(/[^\d]/g, ''));
    if (sortBy === 'price_asc') return priceA - priceB;
    if (sortBy === 'price_desc') return priceB - priceA;
    return 0;
  });

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-16">
      <div className="pt-16"></div>

      <header className="bg-slate-950 py-10 relative overflow-hidden flex items-center justify-center border-b border-slate-900">
        <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1500&q=80')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-950"></div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-xl md:text-2xl font-black text-white mb-5 tracking-tight">
            ค้นหาอสังหาฯ ที่ใช่ สำหรับคุณ
          </h1>

          <div className="bg-white p-3 rounded-2xl md:rounded-full shadow-2xl border border-slate-200/20 max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2">
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl md:rounded-full transition-all text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              🔍 ค้นหา
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          <SearchSidebar 
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedAmphure={selectedAmphure}
            setSelectedAmphure={setSelectedAmphure}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            provincesList={provincesList}
            amphuresList={amphuresList}
            districtsList={districtsList}
            setAmphuresList={setAmphuresList}
            setDistrictsList={setDistrictsList}
            priceMin={priceMin}
            setPriceMin={setPriceMin}
            priceMax={priceMax}
            setPriceMax={setPriceMax}
            bedrooms={bedrooms}
            setBedrooms={setBedrooms}
            facilities={facilities}
            setFacilities={setFacilities}
            handleClearFilters={handleClearFilters}
          />

          <div ref={resultsRef} className="lg:col-span-3 space-y-5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">อสังหาริมทรัพย์แนะนำทั้งหมด</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">พบอสังหาริมทรัพย์ {sortedProperties.length} รายการ</p>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer">
                  🗺️ ดูแผนที่
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

            {sortedProperties.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-sm space-y-4">
                <div className="text-4xl">🔍</div>
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
                {sortedProperties.map((prop) => {
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

            {sortedProperties.length > 0 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 text-xs font-bold">
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer">&lt;</button>
                <button className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/20 cursor-pointer">1</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-700 cursor-pointer">2</button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 cursor-pointer">&gt;</button>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
