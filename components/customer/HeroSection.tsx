'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // ใช้ตรวจสอบบทบาทผู้ใช้เพื่อเปิด/ปิดตัวเลือก "ขาย" ในแท็บค้นหา
import { MapPin, Search } from 'lucide-react';

export default function HeroSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [locationInput, setLocationInput] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const userRole = (session?.user as { role?: string })?.role;
  const canSell = userRole === 'agent' || userRole === 'admin';

  const handleSearch = () => {
    if (canSell && activeTab === 'sell') {
      router.push('/agent/add-property');
      return;
    }
    const params = new URLSearchParams();
    if (activeTab) params.set('tab', activeTab);
    if (locationInput.trim()) params.set('q', locationInput.trim());
    if (propertyType) params.set('type', propertyType);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <header className="relative pt-20 pb-12 lg:pt-28 lg:pb-16 overflow-hidden flex items-center justify-center min-h-[50vh]">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] hover:scale-105" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}
      />
      <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white mb-3 sm:mb-4 leading-tight tracking-tight drop-shadow-md">
          ค้นหาบ้าน คอนโด และที่ดิน<br />ทำเลคุณภาพใน <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">หาดใหญ่และสงขลา</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-200 mb-6 sm:mb-8 max-w-xl font-light drop-shadow">
          Srichai Property ศูนย์รวมอสังหาริมทรัพย์คัดสรร พร้อมทีมงานนายหน้ามืออาชีพดูแลทุกขั้นตอน นัดชมโครงการจริงได้สะดวกและปลอดภัย
        </p>

        <div className="w-full max-w-4xl bg-white border border-slate-200 shadow-lg rounded-2xl p-3 sm:p-5">
          <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
            <button 
              onClick={() => setActiveTab("buy")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "buy" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ซื้อ
            </button>
            <button 
              onClick={() => setActiveTab("rent")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === "rent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              เช่า
            </button>
            {canSell && (
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === "sell" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ขาย
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-stretch bg-slate-50 rounded-xl border border-slate-200 p-1 gap-1.5 transition-all duration-200">
            <div className="flex-1 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group">
              <div className="flex flex-col text-left w-full">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">ค้นหาทำเลหรือแลนด์มาร์ก</span>
                <input 
                  type="text" 
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="เช่น บ้านแถวเซ็นทรัล, คอนโดใกล้สนามบิน, แถว ม.อ...." 
                  className="w-full bg-transparent focus:outline-none text-slate-800 font-semibold text-sm outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            
            <div className="hidden md:block w-px h-10 bg-slate-200 self-center" />
            
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

            {canSell && activeTab === "sell" ? (
              <Link
                href="/agent/add-property"
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition-colors duration-200 flex items-center justify-center text-sm w-full md:w-auto h-full min-h-[48px] self-stretch"
              >
                ลงประกาศขาย
              </Link>
            ) : (
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

          {/* Quick Landmark Chips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 pt-2 text-xs border-t border-slate-100">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              ลองค้นหา:
            </span>
            {[
              'บ้านแถวเซ็นทรัล',
              'คอนโดใกล้สนามบิน',
              'บ้านแถว ม.อ.',
              'แถวตลาดกิมหยง',
              'บ้านแถวเกาะยอ',
            ].map((chip) => (
              <Link
                key={chip}
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
