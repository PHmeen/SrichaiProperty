/**
 * ==============================================================================
 * หน้า "ค้นหาอสังหาริมทรัพย์" (Search Page) — ฝั่งลูกค้า (customer)
 * ==============================================================================
 * ภาพรวมการทำงาน:
 * 1) หน้านี้เป็น Client Component ('use client') เพราะต้องใช้ state, effect,
 *    และอ่าน/เขียน URL query string (useSearchParams/useRouter) ซึ่งทำได้เฉพาะ
 *    ฝั่ง client เท่านั้น
 * 2) ข้อมูลอสังหาริมทรัพย์ทั้งหมดถูกดึงมาจาก Context กลาง (useApp -> properties)
 *    ซึ่งเชื่อมกับฐานข้อมูลจริงแล้ว จากนั้นหน้านี้ทำหน้าที่ "กรอง (filter)"
 *    และ "เรียงลำดับ (sort)" ข้อมูลที่ได้มาอีกทีด้วยเงื่อนไขต่างๆ ที่ผู้ใช้เลือก
 *    (คำค้นหา, จังหวัด/อำเภอ/ตำบล, ประเภททรัพย์, ช่วงราคา, ห้องนอน/น้ำ, พื้นที่,
 *    สิ่งอำนวยความสะดวก) ทั้งหมดทำงานฝั่ง client (ไม่ยิง API ค้นหาซ้ำ)
 * 3) เงื่อนไขการค้นหาทั้งหมดจะถูก sync ไปเก็บไว้ใน URL query string ด้วย
 *    (เช่น ?q=...&tab=buy&type=condo) ทำให้สามารถ copy ลิงก์ไปแชร์ หรือกด
 *    refresh หน้าแล้วเงื่อนไขเดิมยังอยู่ครบ (deep-linkable / shareable search)
 * 4) โครงสร้างหน้าแบ่งเป็น 2 ส่วนหลัก:
 *    - Header: กล่องค้นหาแบบ hero (คำค้นหา, ซื้อ/เช่า, ประเภททรัพย์, ปุ่มค้นหา)
 *    - Main: แบ่งเป็น Sidebar (ตัวกรองละเอียด) ทางซ้าย + รายการผลลัพธ์
 *      (การ์ดทรัพย์ + pagination) ทางขวา
 * ==============================================================================
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import SearchSidebar from '@/components/customer/SearchSidebar';
import PropertyCard from '@/components/customer/PropertyCard';

// Component หลักของหน้า ต้องอยู่ "ใน" Suspense เพราะใช้ useSearchParams()
// ซึ่ง Next.js กำหนดให้ component ที่อ่าน search params ต้องถูกห่อด้วย Suspense
// (ดูตัวห่อ Suspense ที่ default export ด้านล่างสุดของไฟล์)
function SearchPageContent() {
  const searchParams = useSearchParams(); // อ่านค่าพารามิเตอร์จาก URL (?q=...&tab=...)
  const router = useRouter();             // ใช้ router.replace() เพื่ออัปเดต URL โดยไม่ reload หน้า
  const pathname = usePathname();         // path ปัจจุบัน (/search) ใช้ประกอบตอนสร้าง URL ใหม่
  const resultsRef = React.useRef<HTMLDivElement>(null); // ใช้เลื่อนจอไปยังส่วนผลลัพธ์เมื่อกดค้นหา

  const [isInitialized, setIsInitialized] = useState(false); // ป้องกันไม่ให้ effect sync URL ทำงานก่อนที่จะโหลดค่าจาก URL เข้ามาใน state ให้ครบก่อน
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // คำค้นหาที่ "หน่วงเวลา" แล้ว ใช้จริงตอนกรองข้อมูล เพื่อไม่ให้กรองข้อมูลทุกครั้งที่พิมพ์แต่ละตัวอักษร

  // ฟังก์ชันเมื่อผู้ใช้กดปุ่ม "ค้นหา" (หรือกด Enter)
  // จะบังคับอัปเดตคำค้นหาทันที (ข้าม debounce 500ms) และเลื่อนจอลงไปยังผลลัพธ์
  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ---- State ของเงื่อนไขค้นหา/กรอง (filter state) ----
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>('buy'); // แท็บ ซื้อ/เช่า
  const [propertyType, setPropertyType] = useState('all');          // ประเภททรัพย์: all/house/condo/townhome/land
  const [priceRange, setPriceRange] = useState('all');               // ช่วงราคาแบบสำเร็จรูป (low/mid/high) จากช่องใน Header
  const [searchTerm, setSearchTerm] = useState('');                  // คำค้นหาดิบ (ตามที่ผู้ใช้พิมพ์แบบ real-time)

  const [priceMin, setPriceMin] = useState('');   // ราคาต่ำสุด (กรอกเองใน Sidebar)
  const [priceMax, setPriceMax] = useState('');   // ราคาสูงสุด (กรอกเองใน Sidebar)
  const [bedrooms, setBedrooms] = useState<string>('any');  // จำนวนห้องนอนขั้นต่ำ ('any' = ไม่กรอง, '4+' = ตั้งแต่ 4 ขึ้นไป)
  const [bathrooms, setBathrooms] = useState<string>('any'); // จำนวนห้องน้ำขั้นต่ำ (เหมือนห้องนอน)
  const [areaMin, setAreaMin] = useState('');   // พื้นที่ต่ำสุด (ตร.ม./ตร.วา ตามข้อมูลจริง)
  const [areaMax, setAreaMax] = useState('');   // พื้นที่สูงสุด

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false); // เปิด/ปิดลิ้นชักตัวกรองบนมือถือ (Sidebar จะกลายเป็น drawer)
  const [facilities, setFacilities] = useState({ // สิ่งอำนวยความสะดวกที่ต้องการ (เช็คจากคำในคำอธิบายทรัพย์)
    pool: false,
    gym: false,
    parking: false,
    security: false,
  });

  const [sortBy, setSortBy] = useState<'latest' | 'price_asc' | 'price_desc'>('latest'); // การเรียงลำดับผลลัพธ์

  // ---- State ตำแหน่งที่ตั้ง (จังหวัด > อำเภอ > ตำบล) เป็นแบบ cascading dropdown ----
  const [selectedProvince, setSelectedProvince] = useState<string>('');  // จังหวัดที่เลือก (เก็บเป็น id แบบ string)
  const [selectedAmphure, setSelectedAmphure] = useState<string>('');    // อำเภอที่เลือก (ขึ้นกับจังหวัด)
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');  // ตำบลที่เลือก (ขึ้นกับอำเภอ)

  // รายการตัวเลือกที่ดึงมาจาก API เพื่อ populate ลง dropdown ใน Sidebar
  const [provincesList, setProvincesList] = useState<{ id: number; name_th: string; name_en: string }[]>([]);
  const [amphuresList, setAmphuresList] = useState<{ id: number; name_th: string; name_en: string }[]>([]);
  const [districtsList, setDistrictsList] = useState<{ id: number; name_th: string; name_en: string; zip_code: number }[]>([]);

  // ดึงข้อมูลอสังหาริมทรัพย์ทั้งหมด + รายการ favorite ของผู้ใช้ จาก Context กลาง (เชื่อมฐานข้อมูลจริง)
  const { properties, favorites, toggleFavorite } = useApp();

  // โหลดรายชื่อ "จังหวัด" ทั้งหมดครั้งเดียวตอนหน้าถูก mount
  useEffect(() => {
    fetch('/api/locations?type=provinces')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProvincesList(data);
      })
      .catch(console.error);
  }, []);

  // เมื่อผู้ใช้เลือก "จังหวัด" แล้ว -> โหลดรายชื่อ "อำเภอ" ของจังหวัดนั้นมาแสดง (cascading dropdown)
  useEffect(() => {
    if (!selectedProvince) return;
    fetch(`/api/locations?type=amphures&provinceId=${selectedProvince}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAmphuresList(data);
      })
      .catch(console.error);
  }, [selectedProvince]);

  // เมื่อผู้ใช้เลือก "อำเภอ" แล้ว -> โหลดรายชื่อ "ตำบล" ของอำเภอนั้นมาแสดง (cascading dropdown)
  useEffect(() => {
    if (!selectedAmphure) return;
    fetch(`/api/locations?type=districts&amphureId=${selectedAmphure}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDistrictsList(data);
      })
      .catch(console.error);
  }, [selectedAmphure]);

  // ============================================================
  // EFFECT #1: อ่านค่าเงื่อนไขค้นหาจาก URL query string (ตอนโหลดหน้าครั้งแรก)
  // แล้วนำมาตั้งค่าให้ state ต่างๆ ด้านบน (ทำให้กด refresh/แชร์ลิงก์แล้ว
  // เงื่อนไขค้นหาเดิมยังอยู่ครบ) ทำงานแค่ครั้งเดียวเพราะเช็ค isInitialized
  // ============================================================
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
      setIsInitialized(true); // เสร็จแล้ว เปิดทางให้ EFFECT #3 (sync state -> URL) เริ่มทำงานได้
    }, 0); // setTimeout(0) เพื่อดัน logic นี้ไปทำหลัง render แรกเสร็จ (เลี่ยงปัญหา hydration/ลำดับ state update)

    return () => clearTimeout(timer);
  }, [searchParams, isInitialized]);

  // ============================================================
  // EFFECT #2: Debounce คำค้นหา
  // ทุกครั้งที่ผู้ใช้พิมพ์ (searchTerm เปลี่ยน) จะรอ 500ms ก่อนค่อยอัปเดต
  // debouncedSearchTerm จริงๆ (ซึ่งเป็นค่าที่ใช้กรองข้อมูลด้านล่าง)
  // เพื่อไม่ให้กรอง/re-render ทุกครั้งที่กดแป้นพิมพ์ ช่วยลด lag
  // (ถ้าผู้ใช้กดปุ่ม "ค้นหา" เอง จะข้าม debounce นี้ผ่าน triggerSearch())
  // ============================================================
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ============================================================
  // EFFECT #3: Sync state ของเงื่อนไขค้นหาทั้งหมด "กลับไป" เก็บใน URL query string
  // ทำงานทุกครั้งที่ค่าตัวกรองใดๆ เปลี่ยนแปลง (หลังจาก initialize เสร็จแล้ว)
  // ใช้ router.replace() (ไม่ใช่ push) เพื่อไม่สร้างประวัติ back ใหม่ทุกครั้ง
  // และ { scroll: false } เพื่อไม่ให้หน้ากระโดดขึ้นบนตอนอัปเดต URL
  // ============================================================
  useEffect(() => {
    if (!isInitialized) return;

    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    // helper: ใส่ค่าพารามิเตอร์ลง URL ถ้ามีค่าที่ "มีความหมาย" (ไม่ใช่ค่าว่าง/ค่า default/'all')
    // ถ้าค่ากลับไปเป็นค่า default ก็จะลบ key นั้นออกจาก URL เพื่อให้ URL สั้นและสะอาด
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

  // รีเซ็ตตัวกรองทั้งหมดกลับเป็นค่าเริ่มต้น (เรียกจากปุ่ม "ล้างค่าตัวกรองทั้งหมด")
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

  const [currentPage, setCurrentPage] = useState(1); // หน้าปัจจุบันของผลลัพธ์ (pagination)
  const itemsPerPage = 6; // จำนวนการ์ดทรัพย์ต่อหน้า

  // ==============================================================
  // ขั้นตอนที่ 1: กรองข้อมูล (filter) — วนเช็คทรัพย์ทุกรายการใน properties
  // ทีละเงื่อนไข ถ้าไม่ผ่านเงื่อนไขไหนก็ return false ทันที (ตัดทิ้ง)
  // ทุกเงื่อนไข "และ" กันหมด (ต้องผ่านทุกอันถึงจะติดผลลัพธ์)
  // ==============================================================
  const filteredProperties = properties.filter((prop) => {
    // 1.1 กรองตามแท็บ ซื้อ/เช่า
    if (activeTab === 'rent' && prop.listingType !== 'rent') return false;
    if (activeTab === 'buy' && prop.listingType !== 'sale') return false;

    // 1.2 กรองตามคำค้นหา (ค้นจาก ชื่อทรัพย์, ที่อยู่, ชื่ออำเภอ/จังหวัด/ตำบล)
    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower ||
                          prop.title.toLowerCase().includes(searchLower) ||
                          prop.location.toLowerCase().includes(searchLower) ||
                          (prop.amphureName || '').toLowerCase().includes(searchLower) ||
                          (prop.provinceName || '').toLowerCase().includes(searchLower) ||
                          (prop.districtName || '').toLowerCase().includes(searchLower);
    if (!matchesSearch) return false;

    // 1.3 กรองตามตำแหน่งที่ตั้งที่เลือกไว้ใน Sidebar (จังหวัด/อำเภอ/ตำบล) โดยเทียบ id
    if (selectedProvince && prop.province_id !== parseInt(selectedProvince)) return false;
    if (selectedAmphure && prop.amphure_id !== parseInt(selectedAmphure)) return false;
    if (selectedDistrict && prop.district_id !== parseInt(selectedDistrict)) return false;

    // 1.4 กรองตามประเภททรัพย์ (เช็คจากคำในชื่อประเภท เช่น "บ้าน", "คอนโด")
    const matchesType = propertyType === 'all' ||
                        (propertyType === 'house' && prop.type.includes('บ้าน')) ||
                        (propertyType === 'condo' && prop.type.includes('คอนโด')) ||
                        (propertyType === 'townhome' && prop.type.includes('ทาวน์โฮม')) ||
                        (propertyType === 'land' && (prop.type.includes('ที่ดิน') || prop.type.includes('land')));
    if (!matchesType) return false;

    // แปลงราคาจาก string (เช่น "3,500,000 บาท") เป็นตัวเลขล้วนๆ เพื่อนำไปเปรียบเทียบ
    const rawPrice = parseInt(prop.price.replace(/[^\d]/g, ''));

    // 1.5 กรองตามช่วงราคาแบบสำเร็จรูปจาก Header (low < 3 ล้าน, mid 3-7 ล้าน, high > 7 ล้าน)
    if (priceRange === 'low' && rawPrice >= 3000000) return false;
    if (priceRange === 'mid' && (rawPrice < 3000000 || rawPrice > 7000000)) return false;
    if (priceRange === 'high' && rawPrice <= 7000000) return false;

    // 1.6 กรองตามช่วงราคาที่กรอกเองใน Sidebar (priceMin/priceMax)
    if (priceMin && rawPrice < parseInt(priceMin)) return false;
    if (priceMax && rawPrice > parseInt(priceMax)) return false;

    // 1.7 กรองตามจำนวนห้องนอนขั้นต่ำ ('4+' หมายถึงตั้งแต่ 4 ห้องขึ้นไป)
    if (bedrooms !== 'any') {
      const bedCount = prop.bedrooms || 0;
      if (bedrooms === '4+') {
        if (bedCount < 4) return false;
      } else {
        if (bedCount < parseInt(bedrooms)) return false;
      }
    }

    // 1.8 กรองตามจำนวนห้องน้ำขั้นต่ำ (ตรรกะเดียวกับห้องนอน)
    if (bathrooms !== 'any') {
      const bathCount = prop.bathrooms || 0;
      if (bathrooms === '4+') {
        if (bathCount < 4) return false;
      } else {
        if (bathCount < parseInt(bathrooms)) return false;
      }
    }

    // 1.9 กรองตามพื้นที่ขั้นต่ำ/สูงสุด
    if (areaMin) {
      if ((prop.area || 0) < parseFloat(areaMin)) return false;
    }
    if (areaMax) {
      if ((prop.area || 0) > parseFloat(areaMax)) return false;
    }

    // 1.10 กรองตามสิ่งอำนวยความสะดวก — เนื่องจากไม่มี field แยกในฐานข้อมูล
    // จึงใช้วิธี "ค้นหาคำ" ในคำอธิบายทรัพย์ (description) แทน เช่น ถ้าติ๊ก
    // "สระว่ายน้ำ" จะต้องเจอคำว่า "สระ" หรือ "pool" ในคำอธิบาย ไม่งั้นตัดทิ้ง
    const desc = (prop.description || "").toLowerCase();
    if (facilities.pool && !desc.includes('สระ') && !desc.includes('pool')) return false;
    if (facilities.gym && !desc.includes('ฟิตเนส') && !desc.includes('ยิม') && !desc.includes('gym')) return false;
    if (facilities.parking && !desc.includes('ที่จอดรถ') && !desc.includes('จอดรถ') && !desc.includes('parking')) return false;
    if (facilities.security && !desc.includes('รักษาความปลอดภัย') && !desc.includes('cctv') && !desc.includes('รปภ')) return false;

    return true; // ผ่านทุกเงื่อนไข -> เก็บไว้ในผลลัพธ์
  });

  // ==============================================================
  // ขั้นตอนที่ 2: เรียงลำดับผลลัพธ์ (sort) ตามตัวเลือก sortBy
  // ใช้ [...filteredProperties] เพื่อ copy array ก่อน sort (ไม่แก้ array เดิม)
  // 'latest' ไม่ต้องเรียง (คืน 0 เสมอ) เพราะข้อมูลจาก properties เรียงมาแล้ว
  // ==============================================================
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    const priceA = parseInt(a.price.replace(/[^\d]/g, ''));
    const priceB = parseInt(b.price.replace(/[^\d]/g, ''));
    if (sortBy === 'price_asc') return priceA - priceB;   // ราคาน้อย -> มาก
    if (sortBy === 'price_desc') return priceB - priceA;  // ราคามาก -> น้อย
    return 0;
  });

  // ==============================================================
  // ขั้นตอนที่ 3: แบ่งหน้า (pagination) — ตัด sortedProperties เฉพาะ
  // ช่วงของหน้าปัจจุบัน (6 รายการต่อหน้า) ไปแสดงผล
  // validCurrentPage ป้องกันกรณีเปลี่ยนตัวกรองแล้วจำนวนหน้าลดลง
  // จนหน้าที่ค้างอยู่เกินจำนวนหน้าทั้งหมด
  // ==============================================================
  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProperties = sortedProperties.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-16">
      <div className="pt-16"></div> {/* เว้นระยะด้านบนให้พ้น navbar แบบ fixed ของ layout */}

      {/* ===================== HEADER: กล่องค้นหาแบบ Hero ===================== */}
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

          {/* กล่องค้นหาหลัก: ช่องคำค้นหา + เลือกซื้อ/เช่า + เลือกประเภท + ปุ่มค้นหา */}
          <div className="bg-white p-3 rounded-2xl md:rounded-full shadow-2xl border border-slate-200/20 max-w-4xl mx-auto flex flex-col md:flex-row items-stretch md:items-center gap-2">
            {/* ช่องกรอกคำค้นหา (ทำเล/โครงการ/สถานีรถไฟฟ้า/รหัสไปรษณีย์) — ผูกกับ searchTerm ที่จะถูก debounce */}
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

            {/* เลือกประเภทรายการ: ซื้อ (sale) หรือ เช่า (rent) */}
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

            {/* เลือกประเภททรัพย์แบบย่อ (ตัวกรองละเอียดกว่านี้อยู่ใน Sidebar) */}
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
              {/* จำนวนทรัพย์ทั้งหมดในระบบ (ไม่ใช่จำนวนหลังกรอง) เพื่อความน่าเชื่อถือ */}
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                ✨ ค้นหาจาก {properties.length} รายการ
              </div>

              {/* ปุ่มค้นหา: เรียก triggerSearch() เพื่อบังคับอัปเดตผลลัพธ์ทันที + เลื่อนจอลงไปดูผลลัพธ์ */}
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

      {/* ===================== MAIN: Sidebar ตัวกรอง (ซ้าย) + ผลลัพธ์ (ขวา) ===================== */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

          {/* Sidebar ตัวกรองละเอียด: ทำเล (จังหวัด/อำเภอ/ตำบล), ราคา, ห้องนอน/น้ำ,
              พื้นที่, สิ่งอำนวยความสะดวก — ส่ง state+setState ทั้งหมดลงไปเป็น props
              เพราะ state ทั้งหมดอยู่ที่หน้านี้ (single source of truth) */}
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

          {/* คอลัมน์ผลลัพธ์: resultsRef ใช้เป็นจุดเลื่อนจอลงมาเมื่อกดปุ่ม "ค้นหา" ใน Header */}
          <div ref={resultsRef} className="lg:col-span-3 space-y-5">
            {/* แถบหัวข้อผลลัพธ์: จำนวนที่พบ / ปุ่มเปิดตัวกรองบนมือถือ / ปุ่มแผนที่ / ตัวเลือกเรียงลำดับ */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">อสังหาริมทรัพย์แนะนำทั้งหมด</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">พบอสังหาริมทรัพย์ {sortedProperties.length} รายการ</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* ปุ่มนี้แสดงเฉพาะจอเล็ก (lg:hidden) เพื่อเปิด Sidebar แบบ drawer เนื่องจาก
                    ปกติ Sidebar จะถูกซ่อนบนมือถือ (ไปแสดงเป็น grid คอลัมน์เดียวแทน) */}
                <button
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                  ตัวกรอง
                </button>
                {/* ปุ่มดูแผนที่ — ปัจจุบันยังไม่มี handler ทำงาน (placeholder / ฟีเจอร์ยังไม่เปิดใช้) */}
                <button className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer">
                  🗺️ ดูแผนที่
                </button>

                {/* dropdown เลือกวิธีเรียงลำดับผลลัพธ์ */}
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

            {/* ถ้าไม่พบผลลัพธ์เลย -> แสดงข้อความแจ้งเตือน + ปุ่มล้างตัวกรอง
                ถ้าพบ -> แสดงการ์ดทรัพย์เป็น grid 2 คอลัมน์ (จอใหญ่) / 1 คอลัมน์ (มือถือ) */}
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
                {/* paginatedProperties = เฉพาะรายการของหน้าปัจจุบัน (6 รายการ) */}
                {paginatedProperties.map((prop) => {
                  const isFav = favorites.includes(prop.id); // เช็คว่าทรัพย์นี้อยู่ใน favorite ของผู้ใช้หรือไม่ เพื่อแสดงไอคอนหัวใจให้ถูก
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

            {/* แถบเปลี่ยนหน้า (pagination) — แสดงเฉพาะเมื่อมีมากกว่า 1 หน้า */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 text-xs font-bold">
                {/* ปุ่มถอยหน้าก่อนหน้า (disabled ถ้าอยู่หน้าแรกแล้ว) */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
                >
                  &lt;
                </button>

                {/* ปุ่มหมายเลขหน้า — สร้างจาก 1 ถึง totalPages ทั้งหมด (ไม่มีการย่อ ... สำหรับหน้าจำนวนมาก) */}
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

                {/* ปุ่มไปหน้าถัดไป (disabled ถ้าอยู่หน้าสุดท้ายแล้ว) */}
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

// Default export: ห่อ SearchPageContent ด้วย Suspense ตามข้อกำหนดของ Next.js
// (component ที่เรียก useSearchParams() ต้องอยู่ใต้ Suspense boundary)
// ระหว่างที่ยังโหลดอยู่ (เช่นตอน build/prerender) จะแสดง spinner หมุนแทน
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
