'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function HeroSection() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [locationInput, setLocationInput] = useState('');
  const [propertyType, setPropertyType] = useState('');

  const userRole = (session?.user as { role?: string })?.role;
  const canSell = userRole === 'agent' || userRole === 'admin';

  return (
    <header className="relative pt-24 pb-16 lg:pt-32 lg:pb-20 overflow-hidden flex items-center justify-center min-h-[55vh]">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-[10000ms] hover:scale-105" 
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}
      />
      <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight drop-shadow-md">
          ค้นพบพื้นที่ความสุข<br />ที่คุณเรียกว่า <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">&quot;บ้าน&quot;</span>
        </h1>
        <p className="text-sm md:text-base text-slate-200 mb-8 max-w-xl font-light drop-shadow">
          Srichai Property Agents ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายเข้าชมและแชทกับนายหน้าโดยตรง
        </p>

        <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <div className="flex space-x-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit border border-slate-200">
            <button 
              onClick={() => setActiveTab("buy")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                activeTab === "buy" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              ซื้อ
            </button>
            <button 
              onClick={() => setActiveTab("rent")} 
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                activeTab === "rent" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              เช่า
            </button>
            {canSell && (
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
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
              <Link
                href={`/search?tab=${activeTab}&q=${encodeURIComponent(locationInput)}&type=${propertyType}`}
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-8 font-semibold transition-colors duration-200 flex items-center justify-center text-sm w-full md:w-auto h-full min-h-[48px] self-stretch"
              >
                ค้นหาเลย
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
