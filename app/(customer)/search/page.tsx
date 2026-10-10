'use client';

/**
 * ==============================================================================
 * หน้าค้นหาอสังหาริมทรัพย์ (Search Page)
 * ==============================================================================
 * ออกแบบใหม่เพื่อความสะดวก เรียบง่าย ใช้งานได้จริง และเหมาะสมสำหรับลูกค้า:
 * 1. ระบบค้นหาอัจฉริยะแบบแยกคำ (Multi-keyword Token Search) พิมพ์หาพร้อมกันได้หลายคำ
 * 2. แนะนำคำค้นหายอดนิยม และประวัติการค้นหาล่าสุด (Recent Searches)
 * 3. ตัวเลือกการเรียงลำดับที่ตอบโจทย์: ล่าสุด, ราคา, ราคาต่อ ตร.ม. คุ้มสุด, พื้นที่มากสุด, คะแนนรีวิวนายหน้า
 * 4. สลับมุมมองตาราง (Grid View) และแนวนอน (List View)
 * 5. Skeleton Loading สวยงามนุ่มนวลระหว่างรอโหลดข้อมูล
 * 6. Smart Empty State พร้อมแนะนำทรัพย์เด่นแทนการปล่อยให้หน้าว่าง
 * 7. ใช้ไอคอน Lucide React ถูกต้องตามมาตรฐาน ไม่ใช้อิโมจิดิบ
 * ==============================================================================
 */

import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import SearchSidebar, { FilterState } from '@/components/customer/SearchSidebar';
import PropertyCard from '@/components/customer/PropertyCard';
import { 
  parseSearchIntent, 
  calculateDistanceKm, 
  formatDistanceText, 
  getPopularLandmarks, 
  LandmarkTarget 
} from '@/lib/services/landmarkService';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  PawPrint, 
  Car, 
  Banknote, 
  Sparkles, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  SearchX, 
  Waves, 
  Dumbbell, 
  ShieldCheck, 
  Bed, 
  Bath, 
  ChevronDown, 
  Check,
  LayoutGrid,
  List,
  Map,
  Navigation,
  MapPin,
  Clock,
  TrendingUp,
  Maximize2,
  Sofa,
  Compass
} from 'lucide-react';

// โหลดแผนที่ Leaflet แบบ SSR-safe
const SearchProximityMap = dynamic(() => import('@/components/customer/SearchProximityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[560px] bg-slate-100 rounded-2xl animate-pulse flex items-center justify-center text-slate-400 font-bold text-xs">
      กำลังโหลดแผนที่ตำแหน่งอสังหาริมทรัพย์...
    </div>
  )
});

/**
 * คอมโพเนนต์ Dropdown สไตล์มินิมอล พร้อม Lucide Icon สวยงามสำหรับ Hero Search และ Sort
 */
function HeroCustomSelect<T extends string>({
  value,
  onChange,
  options,
  className = '',
  buttonClassName = '',
}: {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  buttonClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-1.5 py-2 px-3 text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer rounded-xl md:rounded-full hover:bg-slate-50 focus:outline-hidden ${buttonClassName}`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 min-w-[190px] w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${
                  isSelected 
                    ? 'bg-blue-50 text-blue-700 font-extrabold' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// โครงจำลอง Shimmer ระหว่างโหลดข้อมูล (Skeleton Loading)
function PropertyCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col sm:flex-row gap-4 animate-pulse">
        <div className="sm:w-72 h-44 bg-slate-200 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 py-1">
          <div className="h-5 bg-slate-200 rounded-md w-3/4" />
          <div className="h-4 bg-slate-100 rounded-md w-1/2" />
          <div className="h-4 bg-slate-100 rounded-md w-1/3" />
          <div className="flex gap-2 pt-2">
            <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            <div className="h-6 w-16 bg-slate-100 rounded-lg" />
            <div className="h-6 w-20 bg-slate-100 rounded-lg" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="h-8 w-28 bg-slate-200 rounded-md" />
            <div className="h-8 w-20 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs animate-pulse">
      <div className="h-48 bg-slate-200 w-full" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-slate-200 rounded-md w-1/2" />
        <div className="h-4 bg-slate-100 rounded-md w-4/5" />
        <div className="h-3 bg-slate-100 rounded-md w-3/5" />
        <div className="h-8 bg-slate-50 rounded-xl border border-slate-100" />
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-slate-200 rounded-full" />
            <div className="h-3 w-16 bg-slate-200 rounded-md" />
          </div>
          <div className="h-7 w-16 bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const DEFAULT_FILTERS: FilterState = {
  province: '',
  amphure: '',
  district: '',
  priceMin: '',
  priceMax: '',
  bedrooms: 'any',
  bathrooms: 'any',
  parking: 'any',
  areaMin: '',
  areaMax: '',
  isPremiumOnly: false,
  facilities: {
    petFriendly: false,
    pool: false,
    gym: false,
    parking: false,
    security: false,
    furnished: false,
  },
};

const POPULAR_SEARCH_TAGS = [
  'บ้านแถวเซ็นทรัล',
  'คอนโดใกล้สนามบิน',
  'บ้านแถว ม.อ.',
  'บ้านพร้อมสระว่ายน้ำ',
  'ต่ำกว่า 3 ล้าน'
];

type SortKey = 'distance_asc' | 'latest' | 'price_asc' | 'price_desc' | 'price_sqm_asc' | 'area_desc' | 'rating_desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'latest', label: 'ล่าสุด (Newest)' },
  { value: 'price_asc', label: 'ราคา: ต่ำ → สูง' },
  { value: 'price_desc', label: 'ราคา: สูง → ต่ำ' },
  { value: 'price_sqm_asc', label: 'ราคา/ตร.ม. คุ้มที่สุด' },
  { value: 'area_desc', label: 'พื้นที่ใช้สอยมากสุด' },
  { value: 'rating_desc', label: 'คะแนนรีวิวนายหน้าสูงสุด' },
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchInputContainerRef = useRef<HTMLDivElement>(null);
  const { properties, propertiesLoading, favorites, toggleFavorite } = useApp();

  const initialQuery = searchParams.get('q') || '';
  const initialIntent = initialQuery ? parseSearchIntent(initialQuery) : null;

  const [searchTerm, setSearchTerm] = useState(() => initialQuery);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [activeTab, setActiveTab] = useState<'buy' | 'rent'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'rent') return 'rent';
    if (tab === 'buy') return 'buy';
    if (initialIntent?.listingType === 'rent') return 'rent';
    return 'buy';
  });
  const [propertyType, setPropertyType] = useState(() => {
    const pType = searchParams.get('type');
    if (pType) return pType;
    if (initialIntent?.propertyType) return initialIntent.propertyType;
    return 'all';
  });
  const [agentId, setAgentId] = useState(() => searchParams.get('agentId') || '');

  const [filters, setFilters] = useState<FilterState>(() => ({
    province: searchParams.get('province') || '',
    amphure: searchParams.get('amphure') || '',
    district: searchParams.get('district') || '',
    priceMin: searchParams.get('priceMin') || initialIntent?.priceMin || '',
    priceMax: searchParams.get('priceMax') || initialIntent?.priceMax || '',
    bedrooms: searchParams.get('bedrooms') || initialIntent?.bedrooms || 'any',
    bathrooms: searchParams.get('bathrooms') || 'any',
    parking: searchParams.get('parking') || 'any',
    areaMin: searchParams.get('areaMin') || '',
    areaMax: searchParams.get('areaMax') || '',
    isPremiumOnly: searchParams.get('premium') === 'true',
    facilities: {
      petFriendly: searchParams.get('facilities')?.includes('petFriendly') || initialIntent?.facilities?.petFriendly || false,
      pool: searchParams.get('facilities')?.includes('pool') || initialIntent?.facilities?.pool || false,
      gym: searchParams.get('facilities')?.includes('gym') || initialIntent?.facilities?.gym || false,
      parking: searchParams.get('facilities')?.includes('parking') || initialIntent?.facilities?.parking || false,
      security: searchParams.get('facilities')?.includes('security') || initialIntent?.facilities?.security || false,
      furnished: searchParams.get('facilities')?.includes('furnished') || initialIntent?.facilities?.furnished || false,
    },
  }));

  const [sortBy, setSortBy] = useState<SortKey>(() => {
    return initialIntent?.detectedLandmark ? 'distance_asc' : 'latest';
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // ข้อมูลการค้นหาอิงแลนด์มาร์กและระยะทาง (Landmark Proximity Search State)
  const [landmarkRadius, setLandmarkRadius] = useState<number>(() => {
    const r = searchParams.get('radius');
    return r && !isNaN(Number(r)) ? Number(r) : 10;
  });
  const [dynamicLandmark, setDynamicLandmark] = useState<LandmarkTarget | null>(null);
  const [manualLandmark, setManualLandmark] = useState<LandmarkTarget | null>(() => {
    return initialIntent?.detectedLandmark || null;
  });
  const popularLandmarks = useMemo(() => getPopularLandmarks(), []);

  // วิเคราะห์เจตนาค้นหาอิงแลนด์มาร์กจากคำค้นหา (Derived Landmark จาก Query)
  const parsedIntent = useMemo(() => {
    const raw = debouncedSearchTerm.trim();
    if (!raw) return null;
    return parseSearchIntent(raw);
  }, [debouncedSearchTerm]);

  const activeLandmark = manualLandmark || parsedIntent?.detectedLandmark || dynamicLandmark;

  // Suggestions & Recent Searches
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('srichai_recent_searches');
      return stored ? JSON.parse(stored).slice(0, 5) : [];
    } catch {
      return [];
    }
  });

  // บันทึกคำค้นหาล่าสุดลง LocalStorage
  const saveRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('srichai_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }, [recentSearches]);

  const removeRecentSearch = (itemToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = recentSearches.filter(s => s !== itemToRemove);
      setRecentSearches(updated);
      localStorage.setItem('srichai_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // ปิด Dropdown คำแนะนำเมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchInputContainerRef.current && !searchInputContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (searchTerm.trim().length >= 2) {
        saveRecentSearch(searchTerm);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, saveRecentSearch]);

  // ซิงค์ URL Query Parameters
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (debouncedSearchTerm) params.set('q', debouncedSearchTerm);
    if (activeTab !== 'buy') params.set('tab', activeTab);
    if (propertyType !== 'all') params.set('type', propertyType);
    if (agentId) params.set('agentId', agentId);

    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.bedrooms !== 'any') params.set('bedrooms', filters.bedrooms);
    if (filters.bathrooms !== 'any') params.set('bathrooms', filters.bathrooms);
    if (filters.parking !== 'any') params.set('parking', filters.parking);
    if (filters.areaMin) params.set('areaMin', filters.areaMin);
    if (filters.areaMax) params.set('areaMax', filters.areaMax);
    if (filters.province) params.set('province', filters.province);
    if (filters.amphure) params.set('amphure', filters.amphure);
    if (filters.district) params.set('district', filters.district);
    if (filters.isPremiumOnly) params.set('premium', 'true');

    const activeFacs = Object.entries(filters.facilities)
      .filter(([, active]) => active)
      .map(([k]) => k)
      .join(',');
    if (activeFacs) params.set('facilities', activeFacs);
    if (activeLandmark && landmarkRadius !== 10) params.set('radius', landmarkRadius.toString());

    const newQuery = params.toString();
    const newUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [debouncedSearchTerm, activeTab, propertyType, agentId, filters, activeLandmark, landmarkRadius, pathname, router, searchParams]);

  // ดึงพิกัดแลนด์มาร์กเพิ่มเติมผ่าน API สำหรับสถานที่นอกพจนานุกรม (Asynchronous External Resolver)
  useEffect(() => {
    if (parsedIntent?.spatialIntent && !parsedIntent.detectedLandmark && parsedIntent.landmarkCandidate) {
      let isCancelled = false;
      fetch(`/api/landmarks/resolve?q=${encodeURIComponent(parsedIntent.landmarkCandidate)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isCancelled && data.success && data.landmark) {
            setDynamicLandmark(data.landmark);
            setSortBy('distance_asc');
          }
        })
        .catch(() => {});
      return () => {
        isCancelled = true;
      };
    }
  }, [parsedIntent?.spatialIntent, parsedIntent?.detectedLandmark, parsedIntent?.landmarkCandidate]);

  const triggerSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm);
      const intent = parseSearchIntent(searchTerm.trim());
      if (intent.propertyType && propertyType === 'all') {
        setPropertyType(intent.propertyType);
      }
      if (intent.listingType) {
        const mappedTab = intent.listingType === 'rent' ? 'rent' : 'buy';
        if (activeTab !== mappedTab) setActiveTab(mappedTab);
      }
      if (intent.priceMax) {
        setFilters((prev) => ({ ...prev, priceMax: intent.priceMax! }));
      }
      if (intent.priceMin) {
        setFilters((prev) => ({ ...prev, priceMin: intent.priceMin! }));
      }
      if (intent.bedrooms) {
        setFilters((prev) => ({ ...prev, bedrooms: intent.bedrooms! }));
      }
      if (intent.facilities) {
        setFilters((prev) => ({
          ...prev,
          facilities: {
            ...prev.facilities,
            ...(intent.facilities?.pool ? { pool: true } : {}),
            ...(intent.facilities?.petFriendly ? { petFriendly: true } : {}),
            ...(intent.facilities?.parking ? { parking: true } : {}),
            ...(intent.facilities?.gym ? { gym: true } : {}),
            ...(intent.facilities?.furnished ? { furnished: true } : {}),
            ...(intent.facilities?.security ? { security: true } : {}),
          }
        }));
      }
      if (intent.detectedLandmark) {
        setManualLandmark(intent.detectedLandmark);
        setSortBy('distance_asc');
      }
    }
    setIsSearchFocused(false);
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setManualLandmark(null);
    setDynamicLandmark(null);
    setLandmarkRadius(10);
    setPropertyType('all');
    setAgentId('');
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  };

  // ----------------------------------------------------------------------------
  // ระบบกรองอัจฉริยะ (Smart Filter Engine) รองรับการค้นหาคำสำคัญและระยะทาง
  // ----------------------------------------------------------------------------
  const filteredProperties = useMemo(() => {
    // 1. คำนวณระยะทางจาก Landmark (ถ้ามี Landmark Active)
    const baseList = properties.map((prop) => {
      if (
        activeLandmark &&
        prop.latitude != null &&
        prop.longitude != null &&
        !isNaN(Number(prop.latitude)) &&
        !isNaN(Number(prop.longitude))
      ) {
        const distKm = calculateDistanceKm(
          activeLandmark.lat,
          activeLandmark.lng,
          Number(prop.latitude),
          Number(prop.longitude)
        );
        return {
          ...prop,
          distanceKm: distKm,
          distanceText: formatDistanceText(distKm)
        };
      }
      return {
        ...prop,
        distanceKm: undefined,
        distanceText: undefined
      };
    });

    return baseList.filter((prop) => {
      // กรอง ซื้อ / เช่า (คำนึงถึง Tab หรือ Intent จากคำค้นหา)
      const effectiveTab = activeTab !== 'buy' ? activeTab : (parsedIntent?.listingType === 'rent' ? 'rent' : 'buy');
      if (effectiveTab === 'rent' && prop.listingType !== 'rent') return false;
      if (effectiveTab === 'buy' && prop.listingType !== 'sale') return false;

      // กรองเฉพาะนายหน้าที่เลือก
      if (agentId && prop.agent_id !== agentId) return false;

      // กรองทรัพย์พรีเมียม
      if (filters.isPremiumOnly && !prop.isPremium) return false;

      // กรองตามรัศมีแลนด์มาร์ก (ถ้ามีการระบุ Landmark)
      if (activeLandmark && landmarkRadius > 0) {
        if (prop.distanceKm == null || prop.distanceKm > landmarkRadius) {
          return false;
        }
      }

      // กรองประเภททรัพย์ (คำนึงถึงตัวกรองหลักและ Intent)
      const effectiveType = propertyType !== 'all' ? propertyType : (parsedIntent?.propertyType || 'all');
      const typeMap: Record<string, string> = { house: 'บ้าน', condo: 'คอนโด', townhome: 'ทาวน์โฮม', land: 'ที่ดิน' };
      if (effectiveType !== 'all' && typeMap[effectiveType] && !prop.type.includes(typeMap[effectiveType]) && !(effectiveType === 'land' && prop.type.toLowerCase().includes('land'))) {
        return false;
      }

      // กรองราคา (คำนึงถึงตัวกรองหลักและ Intent)
      const price = parseInt(prop.price.replace(/[^\d]/g, ''), 10) || 0;
      const effectivePriceMin = filters.priceMin || parsedIntent?.priceMin;
      const effectivePriceMax = filters.priceMax || parsedIntent?.priceMax;
      if (effectivePriceMin && price < parseInt(effectivePriceMin, 10)) return false;
      if (effectivePriceMax && price > parseInt(effectivePriceMax, 10)) return false;

      // กรองห้องนอน (คำนึงถึงตัวกรองหลักและ Intent)
      const effectiveBedrooms = filters.bedrooms !== 'any' ? filters.bedrooms : (parsedIntent?.bedrooms || 'any');
      if (effectiveBedrooms !== 'any') {
        if (effectiveBedrooms === '0') {
          const isZeroBed = (prop.bedrooms === 0 || !prop.bedrooms);
          const hasStudioWord = /สตูดิโอ|studio/i.test(`${prop.title} ${prop.description} ${prop.type}`);
          if (!isZeroBed && !hasStudioWord) return false;
        } else {
          if ((prop.bedrooms || 0) < parseInt(effectiveBedrooms, 10)) return false;
        }
      }
      if (filters.bathrooms !== 'any' && (prop.bathrooms || 0) < parseInt(filters.bathrooms, 10)) return false;
      if (filters.parking !== 'any' && (prop.parking || 0) < parseInt(filters.parking, 10)) return false;

      // กรองพื้นที่ใช้สอย
      if (filters.areaMin && (prop.area || 0) < parseFloat(filters.areaMin)) return false;
      if (filters.areaMax && (prop.area || 0) > parseFloat(filters.areaMax)) return false;

      // กรองสิ่งอำนวยความสะดวก (คำนึงถึงตัวกรองหลักและ Intent)
      const desc = prop.description || '';
      const propAmenities = prop.amenities || [];
      const hasAmenity = (pattern: RegExp) => propAmenities.some((a) => pattern.test(a)) || pattern.test(desc);

      const wantFurnished = filters.facilities.furnished || parsedIntent?.facilities?.furnished;
      const wantPet = filters.facilities.petFriendly || parsedIntent?.facilities?.petFriendly;
      const wantPool = filters.facilities.pool || parsedIntent?.facilities?.pool;
      const wantGym = filters.facilities.gym || parsedIntent?.facilities?.gym;
      const wantParking = filters.facilities.parking || parsedIntent?.facilities?.parking;
      const wantSecurity = filters.facilities.security || parsedIntent?.facilities?.security;

      if (wantFurnished && !hasAmenity(/เฟอร์นิเจอร์|แต่งครบ|พร้อมอยู่|furnished|เฟอร์ฯ|เฟอร์/i)) return false;
      if (wantPet && !hasAmenity(/สัตว์เลี้ยง|pet/i)) return false;
      if (wantPool && !hasAmenity(/สระ|pool/i)) return false;
      if (wantGym && !hasAmenity(/ฟิตเนส|ยิม|gym/i)) return false;
      if (wantParking && !hasAmenity(/ที่จอดรถ|จอดรถ|parking/i) && (prop.parking || 0) <= 0) return false;
      if (wantSecurity && !hasAmenity(/รักษาความปลอดภัย|cctv|รปภ|security/i)) return false;

      // ค้นหาคำสำคัญ (Full-Text Search โดยตัดคำ intent ที่ถูกนำไปเป็นตัวกรองแล้ว)
      const s = debouncedSearchTerm.toLowerCase().trim();
      if (s) {
        let cleaned = s;

        // 1. ตัดชื่อแลนด์มาร์กที่กำลังค้นหาอยู่
        if (activeLandmark) {
          cleaned = cleaned.replace(new RegExp(activeLandmark.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
          if (activeLandmark.aliases) {
            for (const alias of activeLandmark.aliases) {
              cleaned = cleaned.replace(new RegExp(alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
            }
          }
        }

        // 2. ตัดคำบอกตำแหน่ง (Spatial Prepositions)
        cleaned = cleaned.replace(/แถวๆ|แถว|ใกล้ๆ|ใกล้|รอบๆ|รอบ|ติดกับ|ติด|โซน|ย่าน|บริเวณ|ทางไป|ตรงข้าม|หน้า|หลัง|ข้าง/g, ' ');

        // 3. ตัดคำบอกประเภททรัพย์และสัญญาที่ถูกจัดการโดยตัวกรองแล้ว
        cleaned = cleaned.replace(/บ้านเดี่ยว|บ้านแฝด|บ้านสองชั้น|บ้านพัก|บ้าน|คอนโดมิเนียม|คอนโด|ทาวน์โฮม|ทาวน์เฮ้าส์|ทาวน์เฮาส์|ที่ดิน|แปลงที่ดิน/g, ' ');
        cleaned = cleaned.replace(/เช่า|ให้เช่า|ค่าเช่า|ขาย|ซื้อ|ขายขาด/g, ' ');

        // 4. ตัดคำบอกงบประมาณ / ราคา (ที่ถูกแปลงเป็นตัวกรองราคาแล้ว)
        cleaned = cleaned
          .replace(/(\d+(?:\.\d+)?)\s*(?:-|ถึง)\s*(\d+(?:\.\d+)?)\s*ล้าน/g, ' ')
          .replace(/(?:ไม่เกิน|ต่ำกว่า|งบไม่เกิน|งบ|มากกว่า|เกิน|ตั้งแต่)\s*(\d+(?:\.\d+)?)\s*(?:ล้าน|แสน)/g, ' ')
          .replace(/(?:ไม่เกิน|ต่ำกว่า|งบไม่เกิน|งบ)\s*(\d[\d,]{3,})\s*(?:บาท)?/g, ' ')
          .replace(/\b\d+(?:\.\d+)?\s*(?:ล้าน|แสน|บาท)\b/g, ' ')
          .replace(/ราคา|งบ/g, ' ');

        // 5. ตัดคำบอกห้องนอน / ห้องน้ำ / ที่จอดรถ
        cleaned = cleaned
          .replace(/\d+\s*(?:ห้องนอน|ห้อง นอน|นอน|beds?|bedroom)/g, ' ')
          .replace(/สตูดิโอ|studio/g, ' ')
          .replace(/\d+\s*(?:ห้องน้ำ|น้ำ)/g, ' ')
          .replace(/\d+\s*(?:ที่จอดรถ|จอดรถ|คัน)/g, ' ');

        // 6. ตัดคำบอกสิ่งอำนวยความสะดวก
        cleaned = cleaned.replace(/สระว่ายน้ำ|สระน้ำ|มีสระ|pool/g, ' ');
        cleaned = cleaned.replace(/สัตว์เลี้ยงได้|เลี้ยงสัตว์ได้|เลี้ยงสัตว์|สัตว์เลี้ยง|pet friendly|pet/g, ' ');
        cleaned = cleaned.replace(/ที่จอดรถ|จอดรถ|ที่จอด|parking/g, ' ');
        cleaned = cleaned.replace(/ฟิตเนส|ยิม|fitness|gym/g, ' ');
        cleaned = cleaned.replace(/แต่งครบ|พร้อมอยู่|เฟอร์นิเจอร์|เฟอร์ฯ ครบ|เฟอร์ครบ|furnished/g, ' ');
        cleaned = cleaned.replace(/รักษาความปลอดภัย|cctv|รปภ|security/g, ' ');

        // 7. ตัดคำเชื่อมทั่วไป
        cleaned = cleaned.replace(/มี|พร้อม|และ|กับ|ห้อง|แบบ|โครงการ|หลัง|แปลง|ยูนิต/g, ' ');

        const remainingTokens = cleaned.trim().split(/\s+/).filter((t) => t.length >= 2);

        if (remainingTokens.length > 0) {
          const searchableBag = [
            prop.title,
            prop.location,
            prop.amphureName,
            prop.provinceName,
            prop.districtName,
            prop.agentName,
            prop.type,
            prop.description,
            prop.tag,
            ...(prop.amenities || []),
            ...(prop.nearbies?.map((n) => n.name) || [])
          ].map((f) => (f || '').toLowerCase()).join(' ');

          const matchesAll = remainingTokens.every((token) => searchableBag.includes(token));
          if (!matchesAll) return false;
        }
      }

      // กรองทำเล จังหวัด / อำเภอ / ตำบล (หากไม่ได้กำลังค้นหา Landmark)
      if (!activeLandmark) {
        if (filters.province && prop.province_id !== parseInt(filters.province, 10)) return false;
        if (filters.amphure && prop.amphure_id !== parseInt(filters.amphure, 10)) return false;
        if (filters.district && prop.district_id !== parseInt(filters.district, 10)) return false;
      }

      return true;
    });
  }, [properties, activeTab, agentId, filters, debouncedSearchTerm, propertyType, activeLandmark, landmarkRadius, parsedIntent]);

  // ----------------------------------------------------------------------------
  // ระบบเรียงลำดับผลลัพธ์ (Sort Engine)
  // ----------------------------------------------------------------------------
  const sortedProperties = useMemo(() => {
    return [...filteredProperties].sort((a, b) => {
      const priceA = parseInt(a.price.replace(/[^\d]/g, ''), 10) || 0;
      const priceB = parseInt(b.price.replace(/[^\d]/g, ''), 10) || 0;

      switch (sortBy) {
        case 'distance_asc':
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'price_sqm_asc': {
          const sqmA = a.area && a.area > 0 ? priceA / a.area : Infinity;
          const sqmB = b.area && b.area > 0 ? priceB / b.area : Infinity;
          return sqmA - sqmB;
        }
        case 'area_desc':
          return (b.area || 0) - (a.area || 0);
        case 'rating_desc':
          return (b.agentRating || 0) - (a.agentRating || 0);
        case 'latest':
        default:
          if (activeLandmark && a.distanceKm != null && b.distanceKm != null) {
            return a.distanceKm - b.distanceKm;
          }
          return Number(b.id) - Number(a.id);
      }
    });
  }, [filteredProperties, sortBy, activeLandmark]);

  // แบ่งหน้า (Pagination) 8 รายการต่อหน้า
  const itemsPerPage = 8;
  const totalPages = Math.max(1, Math.ceil(sortedProperties.length / itemsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProperties = sortedProperties.slice((validCurrentPage - 1) * itemsPerPage, validCurrentPage * itemsPerPage);

  // ทรัพย์แนะนำเมื่อค้นหาไม่เจอ (Recommended Properties)
  const recommendedProperties = useMemo(() => {
    if (sortedProperties.length > 0) return [];
    return properties.filter(p => p.isPremium || p.isVerifiedPro).slice(0, 4);
  }, [sortedProperties.length, properties]);

  // ตัวเลือกการเรียงลำดับผลลัพธ์ (Sort Options)
  const currentSortOptions = useMemo(() => {
    if (activeLandmark) {
      return [
        { value: 'distance_asc' as SortKey, label: 'ใกล้ที่สุด (Closest)' },
        ...SORT_OPTIONS
      ];
    }
    return SORT_OPTIONS;
  }, [activeLandmark]);

  // รายการ Active Filter Chips
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; icon?: React.ReactNode; onRemove: () => void }[] = [];

    if (activeLandmark) {
      chips.push({
        id: 'landmark',
        label: `แถว ${activeLandmark.name} (${landmarkRadius > 0 ? `${landmarkRadius} กม.` : 'ทั้งหมด'})`,
        icon: <Navigation className="w-3 h-3 text-rose-500" />,
        onRemove: () => {
          setManualLandmark(null);
          setDynamicLandmark(null);
          setSearchTerm('');
          setDebouncedSearchTerm('');
        }
      });
    }

    if (debouncedSearchTerm && !activeLandmark) {
      chips.push({
        id: 'search',
        label: `"${debouncedSearchTerm}"`,
        icon: <Search className="w-3 h-3 text-slate-500" />,
        onRemove: () => { setSearchTerm(''); setDebouncedSearchTerm(''); },
      });
    }

    if (propertyType !== 'all') {
      const typeMap: Record<string, string> = { house: 'บ้านเดี่ยว', condo: 'คอนโด', townhome: 'ทาวน์โฮม', land: 'ที่ดิน' };
      chips.push({
        id: 'type',
        label: typeMap[propertyType] || propertyType,
        onRemove: () => setPropertyType('all'),
      });
    }

    if (agentId) {
      const matchedAgentProp = properties.find(p => p.agent_id === agentId);
      const agentLabel = matchedAgentProp?.agentName ? `นายหน้า: ${matchedAgentProp.agentName}` : 'นายหน้าที่เลือก';
      chips.push({
        id: 'agentId',
        label: agentLabel,
        onRemove: () => setAgentId(''),
      });
    }

    if (filters.priceMin || filters.priceMax) {
      let label = 'งบ: ';
      if (filters.priceMin && filters.priceMax) {
        label += `฿${Number(filters.priceMin).toLocaleString()} - ฿${Number(filters.priceMax).toLocaleString()}`;
      } else if (filters.priceMin) {
        label += `>= ฿${Number(filters.priceMin).toLocaleString()}`;
      } else {
        label += `<= ฿${Number(filters.priceMax).toLocaleString()}`;
      }
      chips.push({
        id: 'price',
        label,
        icon: <Banknote className="w-3 h-3 text-emerald-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, priceMin: '', priceMax: '' })),
      });
    }

    if (filters.bedrooms !== 'any') {
      chips.push({
        id: 'bedrooms',
        label: filters.bedrooms === '0' ? 'สตูดิโอ' : `${filters.bedrooms}+ นอน`,
        icon: <Bed className="w-3 h-3 text-blue-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, bedrooms: 'any' })),
      });
    }

    if (filters.bathrooms !== 'any') {
      chips.push({
        id: 'bathrooms',
        label: `${filters.bathrooms}+ น้ำ`,
        icon: <Bath className="w-3 h-3 text-blue-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, bathrooms: 'any' })),
      });
    }

    if (filters.parking !== 'any') {
      chips.push({
        id: 'parking',
        label: `${filters.parking}+ จอดรถ`,
        icon: <Car className="w-3 h-3 text-blue-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, parking: 'any' })),
      });
    }

    if (filters.areaMin || filters.areaMax) {
      let label = 'พื้นที่: ';
      if (filters.areaMin && filters.areaMax) {
        label += `${Number(filters.areaMin).toLocaleString()} - ${Number(filters.areaMax).toLocaleString()} ตร.ม.`;
      } else if (filters.areaMin) {
        label += `>= ${Number(filters.areaMin).toLocaleString()} ตร.ม.`;
      } else {
        label += `<= ${Number(filters.areaMax).toLocaleString()} ตร.ม.`;
      }
      chips.push({
        id: 'area',
        label,
        icon: <Maximize2 className="w-3 h-3 text-blue-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, areaMin: '', areaMax: '' })),
      });
    }

    if (filters.facilities.furnished) {
      chips.push({
        id: 'furnished',
        label: 'แต่งครบ / เฟอร์ฯ ครบ',
        icon: <Sofa className="w-3 h-3 text-indigo-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, furnished: false } })),
      });
    }

    if (filters.facilities.petFriendly) {
      chips.push({
        id: 'petFriendly',
        label: 'สัตว์เลี้ยงได้',
        icon: <PawPrint className="w-3 h-3 text-amber-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, petFriendly: false } })),
      });
    }

    if (filters.facilities.pool) {
      chips.push({
        id: 'pool',
        label: 'สระว่ายน้ำ',
        icon: <Waves className="w-3 h-3 text-cyan-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, pool: false } })),
      });
    }

    if (filters.facilities.gym) {
      chips.push({
        id: 'gym',
        label: 'ฟิตเนส',
        icon: <Dumbbell className="w-3 h-3 text-purple-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, gym: false } })),
      });
    }

    if (filters.facilities.parking) {
      chips.push({
        id: 'facParking',
        label: 'ที่จอดรถ',
        icon: <Car className="w-3 h-3 text-slate-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, parking: false } })),
      });
    }

    if (filters.facilities.security) {
      chips.push({
        id: 'security',
        label: 'รปภ./CCTV',
        icon: <ShieldCheck className="w-3 h-3 text-emerald-600" />,
        onRemove: () => setFilters(prev => ({ ...prev, facilities: { ...prev.facilities, security: false } })),
      });
    }

    if (filters.isPremiumOnly) {
      chips.push({
        id: 'premium',
        label: 'ทรัพย์พรีเมียม',
        icon: <Sparkles className="w-3 h-3 text-amber-500" />,
        onRemove: () => setFilters(prev => ({ ...prev, isPremiumOnly: false })),
      });
    }

    return chips;
  }, [debouncedSearchTerm, propertyType, agentId, properties, filters, activeLandmark, landmarkRadius]);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased text-sm pb-16">
      {/* Hero Header */}
      <header className="bg-slate-900 pt-10 sm:pt-14 pb-10 sm:pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50" />
        
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight drop-shadow-xs">
            ค้นหาบ้านที่ใช่ สำหรับคุณ
          </h1>
          <p className="text-slate-300 font-medium mb-6 text-xs sm:text-sm max-w-lg mx-auto drop-shadow-xs">
            ค้นพบอสังหาริมทรัพย์คุณภาพ พร้อมให้คุณเป็นเจ้าของหรือเช่าอยู่แล้ววันนี้
          </p>

          {/* แถบค้นหาหลัก */}
          <div className="relative max-w-4xl mx-auto" ref={searchInputContainerRef}>
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl md:rounded-full shadow-2xl border border-slate-200/20 flex flex-col md:flex-row items-stretch md:items-center gap-2">
              <div className="flex-1 flex bg-slate-50 rounded-xl md:rounded-full px-4 py-2 border border-slate-100 focus-within:border-blue-500 transition-colors items-center">
                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => e.key === 'Enter' && triggerSearch()}
                  placeholder="พิมพ์ 'บ้านแถวเซ็นทรัล', 'คอนโดใกล้สนามบิน', 'แถว ม.อ.'..."
                  className="w-full bg-transparent border-none p-0 focus:ring-0 text-slate-800 text-xs font-bold placeholder-slate-400 outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => { setSearchTerm(''); setDebouncedSearchTerm(''); }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer rounded-full hover:bg-slate-200 transition"
                    aria-label="ล้างคำค้นหา"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-px bg-slate-200 hidden md:block h-6" />

              {/* ดรอปดาวน์ ซื้อ / เช่า */}
              <div className="w-full md:w-36">
                <HeroCustomSelect
                  value={activeTab}
                  onChange={(val) => setActiveTab(val as 'buy' | 'rent')}
                  options={[
                    { value: 'buy', label: 'ซื้อ (Buy)' },
                    { value: 'rent', label: 'เช่า (Rent)' },
                  ]}
                />
              </div>

              <div className="w-px bg-slate-200 hidden md:block h-6" />

              {/* ดรอปดาวน์ ประเภทอสังหาฯ */}
              <div className="w-full md:w-44">
                <HeroCustomSelect
                  value={propertyType}
                  onChange={(val) => setPropertyType(val)}
                  options={[
                    { value: 'all', label: 'ประเภททั้งหมด' },
                    { value: 'house', label: 'บ้านเดี่ยว (House)' },
                    { value: 'condo', label: 'คอนโดมิเนียม (Condo)' },
                    { value: 'townhome', label: 'ทาวน์โฮม (Townhome)' },
                    { value: 'land', label: 'ที่ดิน (Land)' },
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={() => triggerSearch()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl md:rounded-full transition-all text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <span>ค้นหา</span>
              </button>
            </div>

            {/* Dropdown แสดงคำค้นหายอดนิยม และประวัติการค้นหาล่าสุด */}
            {isSearchFocused && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-left z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* ประวัติการค้นหาล่าสุด */}
                {recentSearches.length > 0 && (
                  <div className="mb-3.5">
                    <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>ค้นหาล่าสุด</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchTerm(s);
                            setDebouncedSearchTerm(s);
                            setIsSearchFocused(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition"
                        >
                          <span>{s}</span>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(s, e)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="ลบ"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* แนะนำค้นหาตามแลนด์มาร์กยอดนิยม */}
                <div className="mb-3.5">
                  <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      ค้นหาตามทำเลและแลนด์มาร์ก (ใกล้เคียง)
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">คำนวณระยะทางจริง</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {popularLandmarks.map((lm) => (
                      <button
                        key={lm.id}
                        type="button"
                        onClick={() => {
                          const query = `บ้านแถว${lm.aliases[0] || lm.name}`;
                          setSearchTerm(query);
                          setDebouncedSearchTerm(query);
                          setManualLandmark(lm);
                          setSortBy('distance_asc');
                          saveRecentSearch(query);
                          setIsSearchFocused(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-800 text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-blue-200/60"
                      >
                        <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                        <span>{lm.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* คำค้นหายอดนิยม */}
                <div>
                  <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <span>คำค้นหายอดนิยม</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSearchTerm(tag);
                          setDebouncedSearchTerm(tag);
                          saveRecentSearch(tag);
                          setIsSearchFocused(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Landmark Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3.5 max-w-2xl mx-auto text-xs">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
              ลองค้นหา:
            </span>
            {[
              'บ้านแถวเซ็นทรัล',
              'คอนโดใกล้สนามบิน',
              'บ้านแถว ม.อ.',
              'แถวตลาดกิมหยง',
              'บ้านแถวเกาะยอ',
            ].map((chip) => {
              const isSelected = debouncedSearchTerm === chip || activeLandmark?.name.includes(chip.replace(/บ้านแถว|คอนโดใกล้|แถว/g, ''));
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSearchTerm(chip);
                    setDebouncedSearchTerm(chip);
                    saveRecentSearch(chip);
                    const intent = parseSearchIntent(chip);
                    if (intent.propertyType && propertyType === 'all') {
                      setPropertyType(intent.propertyType);
                    }
                    if (intent.detectedLandmark) {
                      setManualLandmark(intent.detectedLandmark);
                      setSortBy('distance_asc');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer backdrop-blur-xs border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-400 shadow-xs font-bold'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/20'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 max-w-2xl mx-auto text-xs">
            <span className="text-slate-400 font-medium text-[11px] mr-1 hidden sm:inline">ปุ่มลัด:</span>
            
            {/* 1. สัตว์เลี้ยงได้ */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({
                ...prev,
                facilities: { ...prev.facilities, petFriendly: !prev.facilities.petFriendly }
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                filters.facilities.petFriendly 
                  ? 'bg-amber-400 text-slate-900 ring-2 ring-white/60 font-black' 
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20'
              }`}
            >
              <PawPrint className="w-3.5 h-3.5" />
              <span>สัตว์เลี้ยงได้</span>
            </button>

            {/* 2. ที่จอดรถ 2 คัน+ */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({
                ...prev,
                parking: prev.parking === '2' ? 'any' : '2'
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                filters.parking === '2' 
                  ? 'bg-blue-400 text-slate-900 ring-2 ring-white/60 font-black' 
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>ที่จอดรถ 2 คัน+</span>
            </button>

            {/* 3. ผ่อนสบาย */}
            <button
              type="button"
              onClick={() => {
                const targetMax = activeTab === 'rent' ? '15000' : '3000000';
                setFilters(prev => ({
                  ...prev,
                  priceMin: '',
                  priceMax: prev.priceMax === targetMax ? '' : targetMax
                }));
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                filters.priceMax === (activeTab === 'rent' ? '15000' : '3000000')
                  ? 'bg-emerald-400 text-slate-900 ring-2 ring-white/60 font-black' 
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{activeTab === 'rent' ? 'ไม่เกิน 15,000/ด.' : 'ต่ำกว่า 3 ล้าน'}</span>
            </button>

            {/* 4. ทรัพย์พรีเมียม */}
            <button
              type="button"
              onClick={() => setFilters(prev => ({
                ...prev,
                isPremiumOnly: !prev.isPremiumOnly
              }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                filters.isPremiumOnly 
                  ? 'bg-amber-500 text-white ring-2 ring-white/60 font-black' 
                  : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs border border-white/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ทรัพย์พรีเมียม</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar (4 ใน 12 ส่วน) */}
          <div className="lg:col-span-4 xl:col-span-4">
            <SearchSidebar
              filters={filters}
              setFilters={setFilters}
              activeTab={activeTab}
              isMobileDrawerOpen={isMobileDrawerOpen}
              setIsMobileDrawerOpen={setIsMobileDrawerOpen}
              handleClearFilters={handleClearFilters}
              totalResults={sortedProperties.length}
              activeLandmark={activeLandmark}
              landmarkRadius={landmarkRadius}
              setLandmarkRadius={setLandmarkRadius}
              onClearLandmark={() => {
                setManualLandmark(null);
                setDynamicLandmark(null);
                setSearchTerm('');
                setDebouncedSearchTerm('');
              }}
            />
          </div>

          {/* Results Column (8 ใน 12 ส่วน) */}
          <div ref={resultsRef} className="lg:col-span-8 xl:col-span-8 space-y-5">
            {/* Header + Sort + View Mode Switcher */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">รายการอสังหาริมทรัพย์</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  พบ <span className="font-bold text-blue-600">{sortedProperties.length}</span> รายการที่ตรงกับเงื่อนไข
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
                {/* ปุ่มเปิดตัวกรองบนมือถือ */}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>ตัวกรอง</span>
                  {activeChips.length > 0 && <span className="text-blue-600 font-extrabold">({activeChips.length})</span>}
                </button>

                {/* สลับมุมมอง Grid / List / Map */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="มุมมองตาราง"
                    aria-label="มุมมองตาราง"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'list' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="มุมมองรายการ"
                    aria-label="มุมมองรายการ"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('map')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                      viewMode === 'map' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="มุมมองแผนที่พร้อมระยะทาง"
                    aria-label="มุมมองแผนที่พร้อมระยะทาง"
                  >
                    <Map className="w-4 h-4" />
                    <span className="text-[11px] font-bold hidden sm:inline">แผนที่</span>
                  </button>
                </div>

                {/* เรียงลำดับ */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium whitespace-nowrap hidden sm:inline">เรียงตาม:</span>
                  <HeroCustomSelect
                    value={sortBy}
                    onChange={(val) => setSortBy(val as SortKey)}
                    className="w-40 sm:w-44"
                    buttonClassName="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
                    options={currentSortOptions}
                  />
                </div>
              </div>
            </div>

            {/* แบนเนอร์แลนด์มาร์กและการปรับรัศมีค้นหา (Landmark Proximity Banner) */}
            {activeLandmark && (
              <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 shadow-xs animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-100/90 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Navigation className="w-3 h-3 text-blue-600" />
                          ค้นหาตามพิกัดและระยะทาง
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          พบ {filteredProperties.filter((p) => p.distanceKm != null).length} ทรัพย์ในบริเวณนี้
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base mt-0.5 flex items-center gap-1.5">
                        <span>อสังหาริมทรัพย์รอบ {activeLandmark.name}</span>
                        {activeLandmark.province && (
                          <span className="text-xs font-medium text-slate-500">({activeLandmark.province})</span>
                        )}
                      </h3>
                    </div>
                  </div>

                  {/* ตัวเลือกปรับรัศมี (Radius Filter Pills) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">รัศมี:</span>
                    {[
                      { label: '3 กม.', value: 3 },
                      { label: '5 กม.', value: 5 },
                      { label: '10 กม.', value: 10 },
                      { label: '20 กม.', value: 20 },
                      { label: 'ไม่จำกัด', value: 0 },
                    ].map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setLandmarkRadius(r.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                          landmarkRadius === r.value
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white/80 hover:bg-white text-slate-700 border border-slate-200'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-2 text-xs shadow-xs">
                <span className="text-[11px] text-slate-400 font-medium">ตัวกรอง:</span>
                {activeChips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold"
                  >
                    {chip.icon}
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="hover:text-slate-900 w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-slate-200 cursor-pointer"
                      title="ยกเลิกตัวกรองนี้"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-bold ml-auto hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างทั้งหมด</span>
                </button>
              </div>
            )}

            {/* แสดงผลตาม View Mode: Map หรือ Card Grid/List */}
            {viewMode === 'map' ? (
              <div className="space-y-4">
                <SearchProximityMap
                  landmark={activeLandmark}
                  properties={filteredProperties}
                  radiusKm={landmarkRadius}
                />
              </div>
            ) : propertiesLoading ? (
              /* Skeleton Loading ขณะดึงข้อมูล */
              <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-5'}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} viewMode={viewMode === 'list' ? 'list' : 'grid'} />
                ))}
              </div>
            ) : sortedProperties.length === 0 ? (
              /* Smart Empty State เมื่อค้นหาไม่พบ */
              <div className="space-y-8">
                <div className="bg-white  border-slate-200/80 rounded-2xl p-10 text-center shadow-xs space-y-4">
                  <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-slate-900 text-base">ไม่พบอสังหาริมทรัพย์ที่ตรงกับทุกเงื่อนไข</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    ลองปรับลดเงื่อนไขตัวกรองบางข้อ เช่น ขยายช่วงราคา หรือเลือกดูทุกประเภททรัพย์เพื่อค้นหาผลลัพธ์ที่หลากหลายขึ้น
                  </p>
                  
                  {/* ปุ่มช่วยคลายตัวกรอง */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {debouncedSearchTerm && (
                      <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setDebouncedSearchTerm(''); }}
                        className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                      >
                        ล้างคำค้นหา &quot;{debouncedSearchTerm}&quot;
                      </button>
                    )}
                    {(filters.priceMin || filters.priceMax) && (
                      <button
                        type="button"
                        onClick={() => setFilters(prev => ({ ...prev, priceMin: '', priceMax: '' }))}
                        className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                      >
                        ปลดล็อกช่วงงบประมาณ
                      </button>
                    )}
                    {propertyType !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setPropertyType('all')}
                        className="px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition"
                      >
                        ดูทุกประเภทอสังหาฯ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs cursor-pointer shadow-xs transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>ล้างตัวกรองทั้งหมด</span>
                    </button>
                  </div>
                </div>

                {/* แนะนำทรัพย์เด่นที่ลูกค้าน่าจะสนใจ */}
                {recommendedProperties.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h4 className="font-black text-slate-900 text-sm">อสังหาริมทรัพย์แนะนำที่คุณอาจสนใจ</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {recommendedProperties.map((prop) => (
                        <PropertyCard
                          key={prop.id}
                          prop={prop}
                          isFav={favorites.includes(prop.id)}
                          toggleFavorite={toggleFavorite}
                          viewMode="grid"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* แสดงรายการอสังหาริมทรัพย์ */
              <div className={viewMode === 'list' ? 'flex flex-col gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-5'}>
                {paginatedProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    prop={prop}
                    isFav={favorites.includes(prop.id)}
                    toggleFavorite={toggleFavorite}
                    viewMode={viewMode === 'list' ? 'list' : 'grid'}
                  />
                ))}
              </div>
            )}

            {/* Pagination (แสดงเฉพาะมุมมองการ์ด/รายการ) */}
            {viewMode !== 'map' && totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-6 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.max(1, prev - 1));
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  disabled={validCurrentPage === 1}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
                  aria-label="หน้าก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pageNum);
                      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`w-8 h-8 rounded-lg font-bold transition cursor-pointer flex items-center justify-center ${
                      validCurrentPage === pageNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(totalPages, prev + 1));
                    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  disabled={validCurrentPage === totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer"
                  aria-label="หน้าถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
