'use client';

/**
 * page.tsx (Property Detail) - หน้ารายละเอียดเชิงลึกของอสังหาริมทรัพย์รายชิ้น
 * รูปแบบพรีเมียมตามดีไซน์: แสดงสเปค, ข้อมูลจำเพาะ, รายละเอียดเพิ่มเติม,
 * สิ่งอำนวยความสะดวก, สถานที่ใกล้เคียง, แผนที่สเตติก และเครื่องคำนวณสินเชื่อบ้านที่ใช้งานได้จริง
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params.id;

  // === 1. ดึงเมธอดข้อมูลอสังหาฯ และโปรไฟล์ปัจจุบัน ===
  const { properties, favorites, toggleFavorite } = useApp();

  // ค้นหารอยการอสังหาฯ ที่มีรหัสไอดีตรงกัน
  const property = properties.find(p => String(p.id) === String(id)) || properties[0];

  // อาเรย์รูปภาพสำหรับแสดงแผงแกลเลอรี
  const images = property ? [
    property.image,
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
  ] : [];

  // === 2. โครงสร้างสถานะและการคำนวณของเครื่องคำนวณสินเชื่อ (Mortgage Calculator) ===
  const numericPrice = property ? (parseInt(property.price.replace(/[^\d]/g, '')) || 0) : 0;
  const [loanAmount, setLoanAmount] = useState(numericPrice);
  const [interestRate, setInterestRate] = useState(3.5);
  const [loanYears, setLoanYears] = useState(30);

  // ซิงค์ราคากับเครื่องคำนวณเมื่อหน้าเว็บเปลี่ยนไปแสดงทรัพย์ชิ้นอื่น
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoanAmount(numericPrice);
    }, 0);
    return () => clearTimeout(timer);
  }, [numericPrice]);

  // ดักตรวจสอบป้องกันกรณีที่ไม่มีข้อมูลหรือไม่พบข้อมูลเพื่อหลีกเลี่ยงแอปล่ม (No Bug/No Error Guarantee)
  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        🔄 กำลังโหลดข้อมูลอสังหาริมทรัพย์...
      </div>
    );
  }

  const isSaved = favorites.includes(property.id);

  const calculateMonthlyPayment = () => {
    const principal = loanAmount;
    const monthlyRate = interestRate / 12 / 100;
    const numberOfPayments = loanYears * 12;
    if (monthlyRate === 0) return (principal / numberOfPayments).toFixed(0);
    const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    return isNaN(payment) || !isFinite(payment) ? '0' : payment.toFixed(0);
  };

  const monthlyInstallment = calculateMonthlyPayment();

  // ฟังก์ชันแชร์ลิงก์หน้านี้
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert("คัดลอกลิงก์ไปยังคลิปบอร์ดเรียบร้อยแล้ว!");
    }
  };

  // สร้างฟังก์ชันวาดรูปภาพอักษรย่อกรณีไม่มีรูป
  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm pb-24">
      <div className="pt-16"></div>

      {/* 📍 แถบเส้นทางตำแหน่ง (Breadcrumb Sticky Bar) */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center text-xs">
          <nav className="flex text-slate-500 font-extrabold whitespace-nowrap overflow-x-auto items-center gap-1">
            <Link href="/home" className="hover:text-blue-600 transition-colors">หน้าแรก</Link>
            <span className="text-slate-300">/</span>
            <Link href="/search" className="hover:text-blue-600 transition-colors">{property.type} ทั้งหมด</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-black truncate max-w-[200px] sm:max-w-xs">{property.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleShare} 
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100/80 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer active:scale-95 text-[11px]"
            >
              🔗 แชร์
            </button>
            <button 
              onClick={() => toggleFavorite(property.id)} 
              className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100/80 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all cursor-pointer active:scale-95 text-[11px]"
            >
              <span className={isSaved ? "text-red-500" : "text-slate-400"}>❤️</span> {isSaved ? "บันทึกแล้ว" : "บันทึก"}
            </button>
          </div>
        </div>
      </div>

      {/* 📦 เนื้อหาหลักแสดงรูปและส่วนจอง */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-3xl overflow-hidden shadow-sm relative border border-slate-200/40 bg-white">
          <div className="md:col-span-2 md:row-span-2 relative aspect-[4/3] md:aspect-auto">
            <Image src={images[0]} alt="รูปหลัก" width={600} height={450} className="w-full h-full object-cover" />
          </div>
          <div className="hidden md:block relative aspect-[4/3] overflow-hidden">
            <Image src={images[1]} alt="รูปประกอบ 1" width={300} height={225} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="hidden md:block relative aspect-[4/3] overflow-hidden">
            <Image src={images[2]} alt="รูปประกอบ 2" width={300} height={225} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="hidden md:block relative aspect-[4/3] overflow-hidden">
            <Image src={images[3]} alt="รูปประกอบ 3" width={300} height={225} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="hidden md:block relative aspect-[4/3] overflow-hidden">
            <Image src={images[4]} alt="รูปประกอบ 4" width={300} height={225} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 opacity-80" />
            <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-white font-extrabold text-xs">
              + ดูทั้งหมด 10 รูป
            </div>
          </div>
        </div>

        {/* ส่วนแบ่งคอลัมน์ซ้าย-ขวา */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ==================================================== */}
          {/* 🏡 ฝั่งซ้าย: ข้อมูลบ้านพักอาศัยและสเปค                     */}
          {/* ==================================================== */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
              
              {/* ป้ายแท็กและหัวเรื่อง */}
              <div>
                <div className="flex gap-2">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-blue-100">{property.type}</span>
                  <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-red-100">{property.tag || "ขายด่วน"}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 font-sans leading-tight">{property.title}</h1>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-700 font-sans">{property.price}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">รหัสทรัพย์: #{String(property.id).slice(-6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-3">
                  <span>📍</span>
                  <p>{property.location.replace("📍 ", "")}</p>
                </div>
              </div>

              {/* ตารางแสดงขนาดห้อง/ตารางเมตร */}
              <div className="border border-slate-200/60 py-4 grid grid-cols-4 text-center text-slate-600 bg-slate-50/50 rounded-2xl text-[11px] font-bold">
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">ห้องนอน</p>
                  <p className="font-extrabold text-xs text-slate-800">🛏️ {property.bedrooms} ห้อง</p>
                </div>
                <div className="border-l border-slate-200/60">
                  <p className="text-slate-400 font-medium mb-0.5">ห้องน้ำ</p>
                  <p className="font-extrabold text-xs text-slate-800">🚿 {property.bathrooms} ห้อง</p>
                </div>
                <div className="border-l border-slate-200/60">
                  <p className="text-slate-400 font-medium mb-0.5">ที่จอดรถ</p>
                  <p className="font-extrabold text-xs text-slate-800">🚗 2 คัน</p>
                </div>
                <div className="border-l border-slate-200/60">
                  <p className="text-slate-400 font-medium mb-0.5">พื้นที่ใช้สอย</p>
                  <p className="font-extrabold text-xs text-slate-800">📏 {property.area} ตร.ม.</p>
                </div>
              </div>

              {/* ข้อมูลจำเพาะ (Specifications Grid) */}
              <div className="pt-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">📋 ข้อมูลจำเพาะ</h3>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/40 p-4 rounded-2xl border border-slate-200/50">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ประเภทอสังหาฯ</span>
                    <span className="font-bold text-slate-700">{property.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ลักษณะเด่น</span>
                    <span className="font-bold text-slate-700">{property.tag || "ขายด่วน (Premium)"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ปีที่สร้างเสร็จ</span>
                    <span className="font-bold text-slate-700">พ.ศ. 2568</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">จำนวนชั้น</span>
                    <span className="font-bold text-slate-700">2 ชั้น</span>
                  </div>
                  <div className="flex justify-between col-span-2 pt-1">
                    <span className="text-slate-400 font-medium">ค่าส่วนกลางโครงการ</span>
                    <span className="font-bold text-slate-700">{property.type === 'คอนโดมิเนียม' ? '฿45,000 / ปี' : '฿25,000 / ปี'}</span>
                  </div>
                </div>
              </div>

              {/* รายละเอียดอสังหาริมทรัพย์ */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">รายละเอียดอสังหาริมทรัพย์</h3>
                <p className="text-slate-600 leading-relaxed text-xs">
                  {property.description || "อสังหาริมทรัพย์คุณภาพตกแต่งสวยงามพร้อมเข้าอยู่ โครงสร้างมั่นคงแข็งแรง ออกแบบสไตล์โมเดิร์น เพดานสูงโปร่งสบายและแสงสว่างส่องทั่วถึง ทำเลทองเดินทางสะดวกสบายใกล้สิ่งอำนวยความสะดวกมากมาย มีระบบรักษาความปลอดภัยหนาแน่นตลอด 24 ชั่วโมง เหมาะสำหรับการอยู่อาศัยเป็นครอบครัว"}
                </p>
                <ul className="list-disc list-inside text-slate-600 text-xs space-y-1.5 pt-2">
                  <li>ห้องนอนใหญ่กว้างขวาง ตกแต่งบิวต์อินตู้เสื้อผ้าและตู้โชว์เรียบร้อย</li>
                  <li>แถมฟรี! เครื่องปรับอากาศ 4 เครื่อง, เครื่องทำน้ำอุ่น 3 เครื่อง, ปั๊มน้ำพร้อมแท็งก์น้ำ</li>
                  <li>ระบบความปลอดภัย กล้อง CCTV พร้อมเครื่องสัญญาณกันขโมยรอบทิศทาง</li>
                  <li>ถนนหน้าบ้านกว้าง 12 เมตร บรรยากาศเงียบสงบ สภาพแวดล้อมดีน่าอยู่คุณภาพ</li>
                </ul>
              </div>

              {/* สิ่งอำนวยความสะดวกในโครงการ */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">สิ่งอำนวยความสะดวกในโครงการ</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-bold">
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">👮 รปภ. 24 ชม.</div>
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">📹 กล้อง CCTV</div>
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">🏊 สระว่ายน้ำ</div>
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">🏋️ ฟิตเนส</div>
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">🌳 สวนสาธารณะ</div>
                  <div className="bg-slate-50 border border-slate-200/50 p-2.5 rounded-xl flex items-center gap-2">🔑 ประตู Key Card</div>
                </div>
              </div>

              {/* สถานที่ใกล้เคียง */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">สถานที่ใกล้เคียง</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-slate-200 p-3 rounded-xl flex justify-between items-center font-bold text-slate-700">
                    <span>🎓 มหาวิทยาลัยสงขลานครินทร์</span>
                    <span className="text-blue-600">1.5 กม.</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl flex justify-between items-center font-bold text-slate-700">
                    <span>🏥 โรงพยาบาลสงขลานครินทร์</span>
                    <span className="text-blue-600">1.8 กม.</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl flex justify-between items-center font-bold text-slate-700">
                    <span>🛍️ ห้างเซ็นทรัล หาดใหญ่</span>
                    <span className="text-blue-600">2.2 กม.</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl flex justify-between items-center font-bold text-slate-700">
                    <span>✈️ ท่าอากาศยานนานาชาติหาดใหญ่</span>
                    <span className="text-blue-600">12.5 กม.</span>
                  </div>
                </div>
              </div>

              {/* แผนที่ตั้งโครงการ (OpenStreetMap แบบ Interactive ฟรีไม่มีขีดจำกัด) */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">แผนที่ตั้งโครงการ</h3>
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 h-64 relative">
                  <iframe 
                    title="Property Location Map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(property.longitude ? Number(property.longitude) : 100.4767) - 0.005}%2C${(property.latitude ? Number(property.latitude) : 7.0084) - 0.003}%2C${(property.longitude ? Number(property.longitude) : 100.4767) + 0.005}%2C${(property.latitude ? Number(property.latitude) : 7.0084) + 0.003}&layer=mapnik&marker=${property.latitude ? Number(property.latitude) : 7.0084}%2C${property.longitude ? Number(property.longitude) : 100.4767}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>

              {/* เครื่องคำนวณสินเชื่อบ้านที่คำนวณได้จริง */}
              <div className="pt-6 border-t border-slate-100">
                <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
                  
                  <div>
                    <h3 className="text-sm font-extrabold">เครื่องคำนวณสินเชื่อ</h3>
                    <p className="text-[10px] text-slate-400 mt-1">ประเมินค่างวดผ่อนชำระเบื้องต้นของอสังหาริมทรัพย์หลังนี้</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 block">ราคาซื้อขาย (บาท)</label>
                      <input 
                        type="number" 
                        value={loanAmount}
                        onChange={(e) => setLoanAmount(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 block">อัตราดอกเบี้ย (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        value={interestRate}
                        onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* สไลเดอร์ปี */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>ระยะเวลากู้</span>
                      <span className="text-blue-400">{loanYears} ปี</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="35"
                      value={loanYears}
                      onChange={(e) => setLoanYears(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* กล่องยอดผลค่างวด */}
                  <div className="bg-blue-600/10 border border-blue-600/20 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">ยอดผ่อนชำระประมาณ</p>
                      <p className="text-2xl font-black text-white mt-1">฿{parseInt(monthlyInstallment).toLocaleString()} <span className="text-xs font-normal text-slate-300">/ เดือน</span></p>
                    </div>
                    <Link 
                      href={`/book-appointment?propertyId=${property.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition-all shadow-md active:scale-95 text-center cursor-pointer w-full sm:w-auto"
                    >
                      จองคิวนัดหมายชมบ้าน
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ==================================================== */}
          {/* 📞 ฝั่งขวา: การ์ดนายหน้าผู้ดูแล (Sticky Sidebar Card)     */}
          {/* ==================================================== */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 sticky top-32">
              {/* รายละเอียดตัวแทนนายหน้า */}
              <div className="text-center pb-4 border-b border-slate-100 space-y-3">
                <div className="relative inline-block">
                  <Image 
                    src={property.agentImage || getInitialsAvatar(property.agentName)} 
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover mx-auto" 
                    alt={property.agentName}
                  />
                  <span className="absolute bottom-0 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow"></span>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-none mb-1.5">{property.agentName}</h4>
                  <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">🏠 Senior Verified Agent</p>
                  <p className="text-[9px] text-slate-400 mt-2 font-medium">ดูแลอสังหาริมทรัพย์ในทำเลหาดใหญ่มามากกว่า 10 ปี</p>
                </div>
              </div>

              {/* ช่องทางติดต่อ */}
              <div className="space-y-2">
                <a 
                  href="tel:0812345678"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs active:scale-[0.99] cursor-pointer"
                >
                  📞 081-234-5678
                </a>
                <a 
                  href="https://line.me" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs active:scale-[0.99] cursor-pointer"
                >
                  💬 คุย LINE
                </a>
              </div>

              {/* ปุ่มสร้างคิวนัดหมายและแชท */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <Link 
                  href={`/book-appointment?propertyId=${property.id}`}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-xs active:scale-[0.99] cursor-pointer"
                >
                  📅 นัดหมายเข้าชมสถานที่จริง
                </Link>
                <Link 
                  href={`/chat?propertyId=${property.id}`}
                  className="w-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs active:scale-[0.99] cursor-pointer"
                >
                  💬 แชทสอบถามรายละเอียด
                </Link>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
