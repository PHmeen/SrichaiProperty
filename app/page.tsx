"use client"; // เปิดใช้งาน Client Component เพื่อให้สามารถเล่นกับ State (ตัวแปรเก็บสถานะหน้าจอ) ได้

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// 1. Interface: กำหนดโครงสร้างข้อมูลอสังหาฯ (Property) ช่วยให้ตรวจสอบความถูกต้องของประเภทข้อมูลได้
interface Property {
  id: number;
  title: string;
  price: string;
  type: string;
  tag: string;
  tagBg: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  image: string;
  agentName: string;
  agentImage: string;
  agentBg: string;
}

export default function Home() {
  // 2. State: สำหรับบันทึกสถานะว่าผู้ใช้งานกำลังเลือกแท็บไหนอยู่ (เริ่มต้นที่ "buy" หรือ "ซื้อ")
  const [activeTab, setActiveTab] = useState<"buy" | "rent" | "sell">("buy");
  
  // 3. State: สำหรับบันทึกรายการประกาศอสังหาฯ ที่ผู้ใช้กดไลก์เก็บไว้ (เก็บเป็น ID เช่น [1, 3])
  const [favorites, setFavorites] = useState<number[]>([]);

  // 4. Function: สลับสถานะถูกใจ (ถูกใจ ➡️ เอาออก, หรือไม่ถูกใจ ➡️ เพิ่มเข้าไป)
  const toggleFavorite = (id: number) => {
    if (favorites.includes(id)) {
      // ถ้ากดซ้ำ ให้เอา ID นั้นออกจากอาเรย์
      setFavorites(favorites.filter((favId) => favId !== id));
    } else {
      // ถ้ายังไม่เคยกด ให้เพิ่ม ID นั้นเข้าไปในอาเรย์เดิม
      setFavorites([...favorites, id]);
    }
  };

  // 5. Mockup Data: ข้อมูลทำเลยอดนิยมแสดงบนหน้าแรก
  const locations = [
    { name: "หาดใหญ่", count: 124, image: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "เมืองสงขลา", count: 86, image: "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "สะเดา", count: 45, image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
    { name: "ระโนด", count: 28, image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" },
  ];

  // 6. Mockup Data: รายการบ้านและคอนโดมิเนียมแนะนำบนหน้าแรก
  const properties: Property[] = [
    {
      id: 1,
      title: "บ้านเดี่ยวสไตล์นอร์ดิก พื้นที่กว้าง",
      price: "฿5,500,000",
      type: "บ้านเดี่ยว",
      tag: "ขายด่วน",
      tagBg: "bg-blue-600",
      location: "📍 ถ.เพชรเกษม, หาดใหญ่",
      bedrooms: 3,
      bathrooms: 3,
      area: 200,
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      agentName: "สมชาย นายหน้าดี",
      agentImage: "https://ui-avatars.com/api/?name=Agent+1&background=1e40af&color=fff",
      agentBg: "1e40af",
    },
    {
      id: 2,
      title: "คอนโดหรู ใกล้มอ.",
      price: "฿1,890,000",
      type: "คอนโดมิเนียม",
      tag: "โครงการใหม่",
      tagBg: "bg-teal-500",
      location: "📍 ถ.ปุณณกัณฑ์, หาดใหญ่",
      bedrooms: 1,
      bathrooms: 1,
      area: 35,
      image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      agentName: "วิภาดา จิตดี",
      agentImage: "https://ui-avatars.com/api/?name=Agent+2&background=0d9488&color=fff",
      agentBg: "0d9488",
    },
    {
      id: 3,
      title: "ทาวน์โฮม 3 ชั้น รีโนเวทใหม่",
      price: "฿3,200,000",
      type: "ทาวน์โฮม",
      tag: "มือสอง",
      tagBg: "bg-amber-500",
      location: "📍 ถ.คลองเรียน 1, หาดใหญ่",
      bedrooms: 3,
      bathrooms: 4,
      area: 150,
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
      agentName: "เอกชัย มั่นคง",
      agentImage: "https://ui-avatars.com/api/?name=Agent+3&background=d97706&color=fff",
      agentBg: "d97706",
    },
  ];

  return (
    <>
      <Navbar />


      {/* Hero Section */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex items-center justify-center min-h-[85vh]">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-105" 
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')" 
          }}
        />
        <div className="absolute inset-0 bg-slate-900/60 mix-blend-multiply" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-[1.1] tracking-tight drop-shadow-lg">
            ค้นพบพื้นที่ความสุข<br />ที่คุณเรียกว่า <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">"บ้าน"</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-200 mb-12 max-w-2xl font-light drop-shadow">
            Srichai Property Agents ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายเข้าชมและแชทกับนายหน้าโดยตรง
          </p>

          {/* Search Box Panel */}
          <div className="w-full max-w-4xl glass-panel rounded-[2rem] p-4 shadow-2xl transition-all duration-300 hover:shadow-blue-500/10">
            
            {/* Tabs (ซื้อ, เช่า, ขาย) */}
            <div className="flex space-x-2 mb-3 px-2 pt-2">
              <button 
                onClick={() => setActiveTab("buy")} 
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === "buy" 
                    ? "bg-blue-700 text-white shadow-lg shadow-blue-700/35" 
                    : "text-slate-600 hover:bg-slate-100/80"
                }`}
              >
                ซื้อ
              </button>
              <button 
                onClick={() => setActiveTab("rent")} 
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === "rent" 
                    ? "bg-blue-700 text-white shadow-lg shadow-blue-700/35" 
                    : "text-slate-600 hover:bg-slate-100/80"
                }`}
              >
                เช่า
              </button>
              <button 
                onClick={() => setActiveTab("sell")} 
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === "sell" 
                    ? "bg-blue-700 text-white shadow-lg shadow-blue-700/35" 
                    : "text-slate-600 hover:bg-slate-100/80"
                }`}
              >
                ขาย
              </button>
            </div>

            {/* Inputs & Action Button */}
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 bg-white rounded-2xl flex items-center px-4 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm transition-all">
                <span className="text-2xl mr-2">📍</span>
                <input 
                  type="text" 
                  placeholder="ค้นหาทำเล เช่น หาดใหญ่, สงขลา..." 
                  className="w-full py-4 bg-transparent focus:outline-none text-slate-800 font-medium"
                />
              </div>
              
              <div className="md:w-48 bg-white rounded-2xl flex items-center px-4 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm transition-all">
                <span className="text-xl mr-2">🏠</span>
                <select className="w-full py-4 bg-transparent focus:outline-none text-slate-800 font-medium cursor-pointer">
                  <option value="">ทุกประเภท</option>
                  <option value="house">บ้านเดี่ยว</option>
                  <option value="townhome">ทาวน์โฮม</option>
                  <option value="condo">คอนโดมิเนียม</option>
                </select>
              </div>

              {activeTab === "sell" ? (
                <Link
                  href="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-700/30 w-full md:w-auto flex items-center justify-center btn-hover-glow"
                >
                  ลงประกาศฟรี
                </Link>
              ) : (
                <Link
                  href="/search"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-700/30 w-full md:w-auto flex items-center justify-center btn-hover-glow"
                >
                  ค้นหาเลย
                </Link>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Popular Locations Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">ทำเลยอดนิยม</h2>
            <p className="text-slate-500">ค้นหาอสังหาริมทรัพย์ในพื้นที่ยอดฮิต</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {locations.map((loc, i) => (
              <Link 
                key={i} 
                href="/search"
                className="relative h-48 md:h-64 rounded-3xl overflow-hidden group cursor-pointer shadow-sm border border-slate-100 block"
              >
                <img 
                  src={loc.image} 
                  alt={loc.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                  <h3 className="text-white text-xl font-bold mb-1">{loc.name}</h3>
                  <p className="text-slate-300 text-sm">{loc.count} ประกาศ</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-2">ประกาศแนะนำล่าสุด</h2>
              <p className="text-slate-500 font-medium">อสังหาริมทรัพย์คุณภาพคัดสรรโดยนายหน้ามืออาชีพ</p>
            </div>
            <Link 
              href="/search" 
              className="inline-flex items-center text-slate-700 font-bold hover:text-blue-700 transition bg-white px-6 py-3 rounded-full shadow-sm border border-slate-200 group"
            >
              ดูทั้งหมด <span className="ml-2 group-hover:translate-x-1 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((prop) => {
              const isFav = favorites.includes(prop.id);
              return (
                <div 
                  key={prop.id}
                  className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 relative group cursor-pointer"
                >
                  {/* Heart Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(prop.id);
                    }} 
                    className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center hover:scale-110 transition shadow-sm"
                  >
                    <svg 
                      className={`w-5 h-5 transition-colors ${isFav ? "text-red-500" : "text-slate-400"}`} 
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
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <span className={`${prop.tagBg} text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm`}>
                      {prop.tag}
                    </span>
                    <span className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                      {prop.type}
                    </span>
                  </div>
                  
                  {/* Image */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src={prop.image} 
                      alt={prop.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>

                  {/* Info Details */}
                  <div className="p-6">
                    <div className="text-3xl font-extrabold text-blue-700 mb-2">{prop.price}</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-1">{prop.title}</h3>
                    <p className="text-slate-500 text-sm mb-6 flex items-center">{prop.location}</p>
                    
                    {/* Icons Grid */}
                    <div className="flex items-center justify-between text-slate-600 border-t border-b border-slate-100 py-4 mb-4 bg-slate-50 px-4 rounded-xl">
                      <span className="font-bold">🛏️ {prop.bedrooms}</span>
                      <div className="w-px h-6 bg-slate-200" />
                      <span className="font-bold">🚿 {prop.bathrooms}</span>
                      <div className="w-px h-6 bg-slate-200" />
                      <span className="font-bold text-sm">📏 {prop.area} ตร.ม.</span>
                    </div>

                    {/* Agent Section */}
                    <div className="flex items-center gap-3">
                      <img 
                        src={prop.agentImage} 
                        alt={prop.agentName}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-900">{prop.agentName}</div>
                        <div className="text-xs text-slate-500">Srichai Agent</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
