'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PropertyCard from '@/components/customer/PropertyCard';

export default function CustomerHomePage() {
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [locationInput, setLocationInput] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const { properties, favorites, toggleFavorite, profile, appointments } = useApp();

  const exclusiveProperties = properties.filter(p => p.isPremium);
  const featuredProperties = properties;

  const getPropertyCountForLocation = (locName: string) => {
    return properties.filter(p => p.location.includes(locName)).length;
  };

  const locations = [
    { name: "หาดใหญ่", count: getPropertyCountForLocation("หาดใหญ่"), image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "เมืองสงขลา", count: getPropertyCountForLocation("สงขลา"), image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "สะเดา", count: getPropertyCountForLocation("สะเดา"), image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "ระโนด", count: getPropertyCountForLocation("ระโนด"), image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  ];

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      
      <header className="relative pt-8 pb-16 lg:pt-16 lg:pb-20 flex items-center justify-center min-h-[55vh]">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" }}></div>
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply"></div>
        
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md border border-white/30 px-4 py-1.5 rounded-full text-white text-xs font-medium shadow">
            <span className="text-sm">👋</span> <span>สวัสดีคุณ {profile.fullName}, ยินดีต้อนรับกลับมา</span>
          </div>

          {appointments.length > 0 && (
            <div className="mb-5 bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-3 shadow cursor-pointer hover:bg-white/20 transition max-w-xl w-full">
              <span className="text-xl"></span>
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

          <div className="w-full max-w-3xl bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
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
              
              <div className="flex-1 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group">
                <span className="text-xl mr-3 text-slate-400"></span>
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
              
              <div id="property-type-dropdown" className="relative md:w-48 flex items-center px-4 py-2 rounded-lg transition-all duration-200 group cursor-pointer select-none" onClick={() => setIsTypeOpen(!isTypeOpen)}>
                <span className="text-lg mr-3 text-slate-400"></span>
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
                    <div className="fixed inset-0 z-40 cursor-default" onClick={(e) => { e.stopPropagation(); setIsTypeOpen(false); }} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2.5 z-50 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setPropertyType(""); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm"></span> ทุกประเภท
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("house"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "house" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm"></span> บ้านเดี่ยว
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("townhome"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "townhome" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm"></span> ทาวน์โฮม
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropertyType("condo"); setIsTypeOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 text-xs font-bold transition flex items-center gap-2.5 ${propertyType === "condo" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        <span className="text-sm"></span> คอนโดมิเนียม
                      </button>
                    </div>
                  </>
                )}
              </div>

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

      {exclusiveProperties.length > 0 && (
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="max-w-5xl mx-auto px-4">
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">⭐ อสังหาริมทรัพย์พรีเมียมแนะนำ</h2>
              <p className="text-slate-500 text-xs">คัดสรรเฉพาะบ้านและคอนโดหรูทำเลทอง</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exclusiveProperties.map((prop) => (
                <Link 
                  key={prop.id}
                  href={`/property/${prop.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200 flex flex-col sm:flex-row"
                >
                  <div className="sm:w-1/2 h-48 sm:h-auto relative">
                    <Image src={prop.image} alt={prop.title} width={240} height={192} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 sm:w-1/2 flex flex-col justify-between">
                    <div>
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">{prop.type}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1.5 line-clamp-1">{prop.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">{prop.location}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-blue-700 font-extrabold text-sm">{prop.price}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold">ดูรายละเอียด</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
        </div>
      </section>
    </div>
  );
}

