'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import SearchSidebar from '@/components/customer/SearchSidebar';
import PropertyCard from '@/components/customer/PropertyCard';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const resultsRef = React.useRef<HTMLDivElement>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
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
  const [bathrooms, setBathrooms] = useState<string>('any');
  const [areaMin, setAreaMin] = useState('');
  const [areaMax, setAreaMax] = useState('');
  
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
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
    if (isInitialized) return;
    
    const q = searchParams.get('q');
    const tab = searchParams.get('tab');
    const type = searchParams.get('type');
    const price = searchParams.get('price');
    const pMin = searchParams.get('priceMin');
    const pMax = searchParams.get('priceMax');
    const beds = searchParams.get('bedrooms');
    const baths = searchParams.get('bathrooms');
    const aMin = searchParams.get('areaMin');
    const aMax = searchParams.get('areaMax');
    const prov = searchParams.get('province');
    const amph = searchParams.get('amphure');
    const dist = searchParams.get('district');
    const facs = searchParams.get('facilities');

    const timer = setTimeout(() => {
      if (q) { setSearchTerm(q); setDebouncedSearchTerm(q); }
      if (tab === 'rent') setActiveTab('rent');
      if (tab === 'buy') setActiveTab('buy');
      if (type && type !== 'undefined') setPropertyType(type);
      if (price && price !== 'undefined') setPriceRange(price);
      if (pMin) setPriceMin(pMin);
      if (pMax) setPriceMax(pMax);
      if (beds) setBedrooms(beds);
      if (baths) setBathrooms(baths);
      if (aMin) setAreaMin(aMin);
      if (aMax) setAreaMax(aMax);
      if (prov) setSelectedProvince(prov);
      if (amph) setSelectedAmphure(amph);
      if (dist) setSelectedDistrict(dist);
      
      if (facs) {
        const activeFacs = facs.split(',');
        setFacilities({
          pool: activeFacs.includes('pool'),
          gym: activeFacs.includes('gym'),
          parking: activeFacs.includes('parking'),
          security: activeFacs.includes('security'),
        });
      }
      setIsInitialized(true);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams, isInitialized]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    const updateParam = (key: string, value: string, defaultValue: string = '') => {
      if (value && value !== defaultValue && value !== 'all') {
        if (params.get(key) !== value) {
          params.set(key, value);
          hasChanges = true;
        }
      } else {
        if (params.has(key)) {
          params.delete(key);
          hasChanges = true;
        }
      }
    };

    updateParam('q', debouncedSearchTerm);
    updateParam('tab', activeTab);
    updateParam('type', propertyType, 'all');
    updateParam('price', priceRange, 'all');
    updateParam('priceMin', priceMin);
    updateParam('priceMax', priceMax);
    updateParam('bedrooms', bedrooms, 'any');
    updateParam('bathrooms', bathrooms, 'any');
    updateParam('areaMin', areaMin);
    updateParam('areaMax', areaMax);
    updateParam('province', selectedProvince);
    updateParam('amphure', selectedAmphure);
    updateParam('district', selectedDistrict);
    
    const activeFacilities = Object.entries(facilities)
      .filter(([, isActive]) => isActive)
      .map(([key]) => key)
      .join(',');
    updateParam('facilities', activeFacilities);

    if (hasChanges) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [debouncedSearchTerm, activeTab, propertyType, priceRange, priceMin, priceMax, bedrooms, bathrooms, areaMin, areaMax, selectedProvince, selectedAmphure, selectedDistrict, facilities, isInitialized, pathname, router, searchParams]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setPropertyType('all');
    setPriceRange('all');
    setPriceMin('');
    setPriceMax('');
    setBedrooms('any');
    setBathrooms('any');
    setAreaMin('');
    setAreaMax('');
    setFacilities({ pool: false, gym: false, parking: false, security: false });
    setSelectedProvince('');
    setSelectedAmphure('');
    setSelectedDistrict('');
    setAmphuresList([]);
    setDistrictsList([]);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const filteredProperties = properties.filter((prop) => {
    if (activeTab === 'rent' && prop.listingType !== 'rent') return false;
    if (activeTab === 'buy' && prop.listingType !== 'sale') return false;

    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower || 
                          prop.title.toLowerCase().includes(searchLower) || 
                          prop.location.toLowerCase().includes(searchLower) ||
                          (prop.amphureName || '').toLowerCase().includes(searchLower) ||
                          (prop.provinceName || '').toLowerCase().includes(searchLower) ||
                          (prop.districtName || '').toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    if (selectedProvince && prop.province_id !== parseInt(selectedProvince)) return false;
    if (selectedAmphure && prop.amphure_id !== parseInt(selectedAmphure)) return false;
    if (selectedDistrict && prop.district_id !== parseInt(selectedDistrict)) return false;

    const matchesType = propertyType === 'all' || 
                        (propertyType === 'house' && prop.type.includes('บ้าน')) ||
                        (propertyType === 'condo' && prop.type.includes('คอนโด')) ||
                        (propertyType === 'townhome' && prop.type.includes('ทาวน์โฮม')) ||
                        (propertyType === 'land' && (prop.type.includes('ที่ดิน') || prop.type.includes('land')));
    if (!matchesType) return false;

    const rawPrice = parseInt(prop.price.replace(/[^\d]/g, ''));
    if (priceRange === 'low' && rawPrice >= 3000000) return false;
    if (priceRange === 'mid' && (rawPrice < 3000000 || rawPrice > 7000000)) return false;
    if (priceRange === 'high' && rawPrice <= 7000000) return false;

    if (priceMin && rawPrice < parseInt(priceMin)) return false;
    if (priceMax && rawPrice > parseInt(priceMax)) return false;

    if (bedrooms !== 'any') {
      const bedCount = prop.bedrooms || 0;
      if (bedrooms === '4+') {
        if (bedCount < 4) return false;
      } else {
        if (bedCount < parseInt(bedrooms)) return false;
      }
    }

    if (bathrooms !== 'any') {
      const bathCount = prop.bathrooms || 0;
      if (bathrooms === '4+') {
        if (bathCount < 4) return false;
      } else {
        if (bathCount < parseInt(bathrooms)) return false;
      }
    }
    
    if (areaMin) {
      if ((prop.area || 0) < parseFloat(areaMin)) return false;
    }
    if (areaMax) {
      if ((prop.area || 0) > parseFloat(areaMax)) return false;
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

  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProperties = sortedProperties.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-16">
      <div className="pt-16"></div>

      <header className="bg-slate-900 pt-16 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50"></div>
        
        <div className="max-w-5xl mx-auto px-4 relative z-10 flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-sm text-center">
            ค้นหาบ้านที่ใช่ สำหรับคุณ
          </h1>
          <p className="text-slate-300 font-medium mb-8 text-sm max-w-lg text-center drop-shadow-sm">
            ค้นพบอสังหาริมทรัพย์ระดับพรีเมียมกว่า 10,000+ รายการ พร้อมให้คุณเป็นเจ้าของแล้ววันนี้
          </p>

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

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between mt-2 pt-2 border-t border-slate-100 gap-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                ✨ ค้นหาจาก {properties.length} รายการ
              </div>

              <button 
                onClick={(e) => triggerSearch(e)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                🔍 ค้นหา
              </button>
            </div>
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
            bathrooms={bathrooms}
            setBathrooms={setBathrooms}
            areaMin={areaMin}
            setAreaMin={setAreaMin}
            areaMax={areaMax}
            setAreaMax={setAreaMax}
            isMobileDrawerOpen={isMobileDrawerOpen}
            setIsMobileDrawerOpen={setIsMobileDrawerOpen}
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
                <button 
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                  ตัวกรอง
                </button>
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
                {paginatedProperties.map((prop) => {
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
