'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';



export default function Home() {
  const [activeTab, setActiveTab] = useState<'buy' | 'rent' | 'sell'>('buy');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { properties, favorites, toggleFavorite } = useApp();

  const locations = [
    { name: "หาดใหญ่", count: 124, image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "เมืองสงขลา", count: 86, image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "สะเดา", count: 45, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "ระโนด", count: 28, image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  ];

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      {/* Navigation */}
      <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-700/30">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                Srichai<span className="text-blue-600">Property</span>
              </span>
            </Link>

            <div className="hidden md:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/" className="text-blue-700 bg-white shadow-sm rounded-full px-4 py-1.5 text-xs font-bold transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login" className="text-slate-600 text-xs font-medium hover:text-blue-700 transition">เข้าสู่ระบบ</Link>
                <Link href="/register" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-full text-xs font-bold transition shadow">สมัครสมาชิก</Link>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden text-slate-600 hover:text-blue-600 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg z-50">
            <div className="px-4 pt-3 pb-5 space-y-1.5">
              <Link href="/" className="block px-3 py-2 text-xs text-blue-700 font-bold bg-blue-50 rounded-lg">หน้าแรก</Link>
              <Link href="/search" className="block px-3 py-2 text-xs text-slate-600 font-medium hover:bg-slate-50 rounded-lg">ค้นหาอสังหาฯ</Link>
              <div className="border-t border-slate-100 my-2 pt-2"></div>
              <Link href="/login" className="block px-3 py-2 text-xs text-slate-600 font-medium text-center border border-slate-200 rounded-lg mb-1.5">เข้าสู่ระบบ</Link>
              <Link href="/register" className="block px-3 py-2 text-xs bg-blue-700 text-white font-bold text-center rounded-lg shadow-sm">สมัครสมาชิก</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Header */}
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

          {/* Search Box Panel */}
          <div className="w-full max-w-3xl glass-panel rounded-2xl p-2.5 shadow-xl">
            <div className="flex space-x-1.5 mb-2.5 px-1 pt-1">
              <button 
                onClick={() => setActiveTab("buy")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "buy" ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ซื้อ
              </button>
              <button 
                onClick={() => setActiveTab("rent")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "rent" ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                เช่า
              </button>
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === "sell" ? "bg-blue-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                ขาย
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 bg-white rounded-xl flex items-center px-3 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-all">
                <span className="text-xl mr-1.5">📍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหาทำเล เช่น หาดใหญ่, สงขลา..." 
                  className="w-full py-2.5 bg-transparent focus:outline-none text-slate-800 font-medium text-xs"
                />
              </div>
              
              <div className="md:w-40 bg-white rounded-xl flex items-center px-3 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 shadow-sm transition-all">
                <span className="text-lg mr-1.5">🏠</span>
                <select className="w-full py-2.5 bg-transparent focus:outline-none text-slate-800 font-medium text-xs cursor-pointer">
                  <option value="">ทุกประเภท</option>
                  <option value="house">บ้านเดี่ยว</option>
                  <option value="townhome">ทาวน์โฮม</option>
                  <option value="condo">คอนโดมิเนียม</option>
                </select>
              </div>

              {activeTab === "sell" ? (
                <Link
                  href="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow w-full md:w-auto flex items-center justify-center text-xs"
                >
                  ลงประกาศฟรี
                </Link>
              ) : (
                <Link
                  href="/search"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow w-full md:w-auto flex items-center justify-center text-xs"
                >
                  ค้นหาเลย
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Popular Locations Section */}
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
                href="/search"
                className="relative h-44 rounded-2xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
              >
                <img 
                  src={loc.image} 
                  alt={loc.name}
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

      {/* Featured Properties Section */}
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
            {properties.map((prop) => {
              const isFav = favorites.includes(prop.id);
              return (
                <div 
                  key={prop.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 relative group cursor-pointer"
                >
                  {/* Heart Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(prop.id);
                    }} 
                    className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm"
                  >
                    <svg 
                      className={`w-4 h-4 transition-colors ${isFav ? "text-red-500" : "text-slate-400"}`} 
                      fill={isFav ? "currentColor" : "none"} 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                  </button>
                  
                  {/* Tags */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
                    <span className={`${prop.tagBg} text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm`}>
                      {prop.tag}
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                      {prop.type}
                    </span>
                  </div>
                  
                  {/* Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img 
                      src={prop.image} 
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>

                  {/* Info Details */}
                  <div className="p-4">
                    <div className="text-xl font-extrabold text-blue-700 mb-1">{prop.price}</div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-1">{prop.title}</h3>
                    <p className="text-slate-500 text-xs mb-4 flex items-center">{prop.location}</p>
                    
                    {/* Icons Grid */}
                    <div className="flex items-center justify-between text-slate-600 border-t border-b border-slate-100 py-2.5 mb-3 bg-slate-50 px-3 rounded-lg text-xs">
                      <span>🛏️ {prop.bedrooms}</span>
                      <div className="w-px h-5 bg-slate-200" />
                      <span>🚿 {prop.bathrooms}</span>
                      <div className="w-px h-5 bg-slate-200" />
                      <span>📏 {prop.area} ตร.ม.</span>
                    </div>

                    {/* Agent Section */}
                    <div className="flex items-center gap-2">
                      <img 
                        src={prop.agentImage} 
                        alt={prop.agentName}
                        className="w-8 h-8 rounded-full border border-white shadow-sm"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">{prop.agentName}</div>
                        <div className="text-[10px] text-slate-500">Srichai Agent</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-xs">&copy; 2026 Srichai Property Agents. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
