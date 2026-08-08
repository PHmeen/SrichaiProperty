'use client';

/**
 * ==============================================================================
 * หน้ารายละเอียดอสังหาริมทรัพย์ฝั่งลูกค้า (Property Detail Page) - /app/(customer)/property/[id]/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงรายละเอียดเชิงลึกของอสังหาริมทรัพย์ (ชื่อประกาศ, ราคา, สเปคห้องนอน/ห้องน้ำ/พื้นที่, ทำเล)
 * 2. แสดงคลังรูปภาพ (Photo Gallery Grid) พร้อมระบบซูมดูรูปใหญ่ (Full-screen Lightbox Modal)
 * 3. แสดงแผนที่พิกัดโครงการผ่าน OpenStreetMap
 * 4. ให้บริการ "เครื่องคำนวณสินเชื่อบ้าน" ประเมินยอดผ่อนชำระต่อเดือนแบบ Real-time
 * 5. ให้บริการปุ่มติดต่อสื่อสารกับนายหน้าผู้ดูแล (โทรศัพท์, คุย LINE, นัดหมายเข้าชม, แชทสด)
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

export default function PropertyDetailPage() {
  // ----------------------------------------------------------------------------
  // 1. ROUTER & GLOBAL CONTEXT
  // ----------------------------------------------------------------------------
  const params = useParams();
  const id = params.id; // รหัส ID อสังหาฯ จาก URL Parameter (เช่น /property/uuid)
  
  const { properties, propertiesLoading, favorites, toggleFavorite } = useApp();

  // 1.1 ค้นหาข้อมูลอสังหาริมทรัพย์จาก ID ที่ตรงกันในฐานข้อมูล
  // หมายเหตุ: ห้าม fallback ไปที่บ้านหลังอื่น (เดิม || properties[0] ทำให้ id ที่หาไม่เจอ
  // ไปโชว์บ้านหลังแรกของระบบแทนแบบเนียนๆ โดยผู้ใช้ไม่รู้ตัว)
  const property = properties.find((p) => String(p.id) === String(id));

  // ----------------------------------------------------------------------------
  // 2. PHOTO GALLERY MEMOIZATION (จัดการรูปภาพสำหรับแสดงผลในกริด)
  // ----------------------------------------------------------------------------
  // realImages: รูปภาพจริงทั้งหมดที่บันทึกไว้ใน DB
  const realImages = useMemo(() => {
    if (!property) return [];
    return property.images && property.images.length > 0 ? property.images : [property.image];
  }, [property]);

  // galleryImages: เติมรูปภาพให้ครบอย่างน้อย 5 ช่อง เพื่อให้แสดงผลใน Photo Grid สวยงามไม่แหว่ง
  const galleryImages = useMemo(() => {
    if (realImages.length === 0) return [];
    return Array.from({ length: Math.max(5, realImages.length) }, (_, i) => realImages[i % realImages.length]);
  }, [realImages]);

  // ----------------------------------------------------------------------------
  // 3. LOCAL COMPONENT STATE (สถานะภายในหน้า)
  // ----------------------------------------------------------------------------
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);       // เปิด/ปิด Modal รูปขยายเต็มจอ
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // ดัชนีรูปภาพที่กำลังเปิดดูใน Modal
  const [startingChat, setStartingChat] = useState(false);         // สถานะกำลังส่งคำขอเปิดห้องแชท (เพื่อแสดง Spinner)

  // ----------------------------------------------------------------------------
  // 4. MORTGAGE CALCULATOR STATE (เครื่องคำนวณสินเชื่อบ้าน)
  // ----------------------------------------------------------------------------
  // แปลงราคาบ้านจาก string (เช่น "฿2,500,000") เป็นตัวเลข pure number
  const numericPrice = useMemo(() => property ? (parseInt(property.price.replace(/[^\d]/g, '')) || 0) : 0, [property]);
  
  // ใช้ Derived State Pattern: customLoanAmount เก็บค่าที่ผู้ใช้พิมพ์ปรับเอง (ถ้าไม่มีใช้ numericPrice เป็นค่าตั้งต้น)
  const [customLoanAmount, setCustomLoanAmount] = useState<number | null>(null);
  const loanAmount = customLoanAmount ?? numericPrice;
  const [interestRate, setInterestRate] = useState(3.5); // อัตราดอกเบี้ยเริ่มต้น % ต่อปี
  const [loanYears, setLoanYears] = useState(30);       // ระยะเวลากู้ (ปี)

  // ----------------------------------------------------------------------------
  // 5. EFFECTS & COMPUTATIONS
  // ----------------------------------------------------------------------------
  // 5.1 บันทึกยอดผู้เข้าชมประกาศนี้ไปยังฐานข้อมูล (+1 View Count)
  useEffect(() => {
    if (id) fetch(`/api/properties/${id}/view`, { method: 'POST' }).catch(() => {});
  }, [id]);

  // 5.2 คำนวณยอดผ่อนชำระค่างวดสินเชื่อต่อเดือน (สูตรดอกเบี้ยทบต้นคงที่)
  const monthlyInstallment = useMemo(() => {
    const monthlyRate = interestRate / 12 / 100;
    const totalPayments = loanYears * 12;
    if (monthlyRate === 0) return (loanAmount / totalPayments).toFixed(0);
    const payment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
    return isNaN(payment) || !isFinite(payment) ? '0' : payment.toFixed(0);
  }, [loanAmount, interestRate, loanYears]);

  // แสดงผลหน้ารอโหลดระหว่างที่ยังดึงรายการอสังหาฯ ทั้งหมดไม่เสร็จ
  if (propertiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        🔄 กำลังโหลดข้อมูลอสังหาริมทรัพย์...
      </div>
    );
  }

  // โหลดเสร็จแล้วแต่หา id นี้ไม่เจอจริง (ถูกลบ/ยังไม่อนุมัติ/ลิงก์ผิด) — ต้องบอกตรงๆ ไม่ใช่โชว์บ้านอื่นแทน
  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-bold gap-4 px-4 text-center">
        <div className="text-4xl">🔍</div>
        <p>ไม่พบประกาศอสังหาริมทรัพย์นี้ อาจถูกลบไปแล้วหรือยังไม่ได้รับการอนุมัติ</p>
        <Link href="/search" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition">
          กลับไปหน้าค้นหา
        </Link>
      </div>
    );
  }

  // เช็คว่าผู้ใช้บันทึกอสังหาฯ หลังนี้เป็นรายการโปรดไว้หรือยัง
  const isSaved = favorites.includes(property.id);

  // ----------------------------------------------------------------------------
  // 6. EVENT HANDLERS (ฟังก์ชันจัดการการกระทำของผู้ใช้)
  // ----------------------------------------------------------------------------
  // 6.1 ฟังก์ชันคัดลอก URL เพื่อแชร์
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      alert("คัดลอกลิงก์ไปยังคลิปบอร์ดเรียบร้อยแล้ว!");
    }
  };

  // 6.2 ฟังก์ชันเปิดห้องแชทสื่อสารกับนายหน้าผ่าน API
  const handleStartChat = async () => {
    setStartingChat(true);
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: property.id, agentId: property.agent_id })
      });
      const data = await res.json();
      if (res.ok && data.success && data.sessionId) {
        window.location.href = `/chat?sessionId=${data.sessionId}`;
      } else {
        alert(data.error || 'ไม่สามารถเปิดห้องแชทได้');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเปิดห้องแชท');
    } finally {
      setStartingChat(false);
    }
  };

  // ดึงข้อมูลเบอร์โทรศัพท์และ LINE ID ของนายหน้า
  const propRecord = property as unknown as Record<string, unknown>;
  const rawLineId = String(propRecord.lineId || propRecord.line_id || '');
  const agentPhone = String(propRecord.agentPhone || propRecord.phone || '081-234-5678');
  const lineUrl = rawLineId
    ? `https://line.me/ti/p/~${rawLineId.replace('@', '')}`
    : `https://line.me/R/msg/text/?${encodeURIComponent(`สวัสดีครับ สนใจอสังหาริมทรัพย์: ${property.title}`)}`;
  const phoneUrl = `tel:${agentPhone.replace(/[^\d+]/g, '')}`;

  // ----------------------------------------------------------------------------
  // 7. RENDERING SECTION (การแสดงผล UI)
  // ----------------------------------------------------------------------------
  return (
    <div className="font-sans bg-slate-50/50 min-h-screen text-slate-800 antialiased text-sm pb-24">
      <div className="pt-16" />

      {/* ========================================================================
          ส่วนที่ 1: แถบนำทางด้านบน (STICKY BREADCRUMB & ACTION BUTTONS)
          ======================================================================== */}
      <div className="bg-white border-b border-slate-200/80 sticky top-16 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center text-xs">
          {/* Breadcrumb ลิงก์ย้อนกลับไปหน้าต่างๆ */}
          <nav className="flex text-slate-500 font-extrabold whitespace-nowrap overflow-x-auto items-center gap-1">
            <Link href="/home" className="hover:text-blue-600 transition-colors">หน้าแรก</Link>
            <span className="text-slate-300">/</span>
            <Link href="/search" className="hover:text-blue-600 transition-colors">{property.type} ทั้งหมด</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800 font-black truncate max-w-[200px] sm:max-w-xs">{property.title}</span>
          </nav>

          {/* ปุ่มแชร์ และ ปุ่มบันทึกรายการโปรด */}
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition text-[11px]">
              🔗 แชร์
            </button>
            <button onClick={() => toggleFavorite(property.id)} className="flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition text-[11px]">
              <svg className={`w-4 h-4 ${isSaved ? 'text-rose-500 fill-rose-500' : 'text-slate-400 fill-none'}`} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{isSaved ? "บันทึกแล้ว" : "บันทึก"}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* ========================================================================
            ส่วนที่ 2: กริดแสดงรูปภาพอสังหาฯ (PHOTO GALLERY GRID - 5 SLOTS)
            ======================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 rounded-3xl overflow-hidden shadow-sm border border-slate-200/40 bg-white md:h-[420px]">
          {galleryImages.slice(0, 5).map((img, idx) => (
            <div
              key={idx}
              onClick={() => { setSelectedImageIndex(idx); setIsGalleryOpen(true); }}
              className={`relative cursor-pointer group overflow-hidden ${
                idx === 0 ? "md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto md:h-full" : "hidden md:block md:h-full"
              }`}
            >
              <Image src={img} alt={`รูปภาพ ${idx + 1}`} width={600} height={450} unoptimized className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {idx === 0 && (
                <div className="absolute bottom-3 left-3 bg-slate-900/70 text-white text-[10px] px-3 py-1 rounded-full font-bold backdrop-blur-md md:hidden">
                  📷 1 / {realImages.length} รูป
                </div>
              )}
              {idx === 4 && (
                <div className="absolute inset-0 bg-slate-950/50 hover:bg-slate-950/60 transition flex items-center justify-center text-white font-extrabold text-xs">
                  🖼️ + ดูทั้งหมด {realImages.length} รูป
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ========================================================================
              ส่วนที่ 3: รายละเอียดฝั่งซ้าย (MAIN INFORMATION & CALCULATOR)
              ======================================================================== */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/60 shadow-sm space-y-6">
              
              {/* หัวข้อ ราคา และทำเล */}
              <div>
                <div className="flex gap-2">
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-blue-100">{property.type}</span>
                  <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-red-100">{property.tag || "ขายด่วน"}</span>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">{property.title}</h1>
                  <div className="text-right">
                    <div className="text-2xl font-black text-blue-700">{property.price}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">รหัสทรัพย์: #{String(property.id).slice(-6).toUpperCase()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-3">
                  <span>📍</span>
                  <p>{property.location.replace("📍 ", "")}</p>
                </div>
              </div>

              {/* การ์ดสเปคหลัก 4 ช่อง (ห้องนอน, ห้องน้ำ, ที่จอดรถ, พื้นที่) */}
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

              {/* ตารางข้อมูลจำเพาะ */}
              <div className="pt-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">📋 ข้อมูลจำเพาะ</h3>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/40 p-4 rounded-2xl border border-slate-200/50">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ประเภทอสังหาฯ</span>
                    <span className="font-bold text-slate-700">{property.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ลักษณะเด่น</span>
                    <span className="font-bold text-slate-700">{property.tag || "ทรัพย์ทั่วไป"}</span>
                  </div>
                </div>
              </div>

              {/* ข้อความรายละเอียดเพิ่มเติม */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">รายละเอียดอสังหาริมทรัพย์</h3>
                <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-line">
                  {property.description || "นายหน้ายังไม่ได้เพิ่มรายละเอียดเพิ่มเติมสำหรับประกาศนี้"}
                </p>
              </div>

              {/* แผนที่ OpenStreetMap */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">แผนที่ตั้งโครงการ</h3>
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 h-64 relative">
                  <iframe 
                    title="Property Location Map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(property.longitude ? Number(property.longitude) : 100.4767) - 0.005}%2C${(property.latitude ? Number(property.latitude) : 7.0084) - 0.003}%2C${(property.longitude ? Number(property.longitude) : 100.4767) + 0.005}%2C${(property.latitude ? Number(property.latitude) : 7.0084) + 0.003}&layer=mapnik&marker=${property.latitude ? Number(property.latitude) : 7.0084}%2C${property.longitude ? Number(property.longitude) : 100.4767}`}
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              </div>

              {/* กล่องเครื่องคำนวณสินเชื่อ (Mortgage Loan Calculator) */}
              <div className="pt-6 border-t border-slate-100">
                <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden">
                  <div>
                    <h3 className="text-sm font-extrabold">เครื่องคำนวณสินเชื่อ</h3>
                    <p className="text-[10px] text-slate-400 mt-1">ประเมินค่างวดผ่อนชำระเบื้องต้นของอสังหาริมทรัพย์หลังนี้</p>
                  </div>

                  {/* ช่องกรอกราคาซื้อขาย และ อัตราดอกเบี้ย */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 block">ราคาซื้อขาย (บาท)</label>
                      <input 
                        type="number" 
                        value={loanAmount}
                        onChange={(e) => setCustomLoanAmount(parseInt(e.target.value) || 0)}
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

                  {/* สไลเดอร์เลือกระยะเวลากู้ (ปี) */}
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

                  {/* สรุปยอดผ่อนชำระต่อเดือน + ปุ่มจองคิวนัดหมาย */}
                  <div className="bg-blue-600/10 border border-blue-600/20 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                      <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">ยอดผ่อนชำระประมาณ</p>
                      <p className="text-2xl font-black text-white mt-1">฿{parseInt(monthlyInstallment).toLocaleString()} <span className="text-xs font-normal text-slate-300">/ เดือน</span></p>
                    </div>
                    <Link 
                      href={`/book-appointment?propertyId=${property.id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs transition shadow text-center cursor-pointer w-full sm:w-auto"
                    >
                      จองคิวนัดหมายชมบ้าน
                    </Link>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================
              ส่วนที่ 4: การ์ดนายหน้าฝั่งขวา (AGENT SIDEBAR CARD & CONTACT ACTIONS)
              ======================================================================== */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5 sticky top-32">
              
              {/* ข้อมูลโปรไฟล์นายหน้า */}
              <div className="text-center pb-4 border-b border-slate-100 space-y-3">
                <div className="relative inline-block">
                  <Image 
                    src={property.agentImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(property.agentName)}&background=1e40af&color=fff`} 
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover mx-auto" 
                    alt={property.agentName}
                  />
                  <span className="absolute bottom-0 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm leading-none mb-1.5">{property.agentName}</h4>
                  <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">🏠 Senior Verified Agent</p>
                  <p className="text-[9px] text-slate-400 mt-2 font-medium">ดูแลอสังหาริมทรัพย์ในทำเลหาดใหญ่มามากกว่า 10 ปี</p>
                </div>
              </div>

              {/* ปุ่มติดต่อด่วน (โทรศัพท์ & คุย LINE) */}
              <div className="space-y-2">
                <a href={phoneUrl} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs">
                  📞 {agentPhone}
                </a>
                <a href={lineUrl} target="_blank" rel="noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs">
                  💬 คุย LINE นายหน้า
                </a>
              </div>

              {/* ปุ่มนัดหมายชมบ้าน และ ปุ่มแชทสดในระบบ */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <Link href={`/book-appointment?propertyId=${property.id}`} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition shadow flex items-center justify-center gap-2 text-xs text-center">
                  📅 นัดหมายเข้าชมสถานที่จริง
                </Link>
                <button onClick={handleStartChat} disabled={startingChat} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs disabled:opacity-50">
                  {startingChat ? '⏳ กำลังเปิดห้องแชท...' : '💬 แชทสอบถามรายละเอียด'}
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================
          ส่วนที่ 5: MODAL ซูมดูรูปภาพใหญ่เต็มจอ (FULL-SCREEN LIGHTBOX MODAL)
          ======================================================================== */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6" onClick={() => setIsGalleryOpen(false)}>
          
          {/* แถบหัวข้อและปุ่มปิด Modal */}
          <div className="flex items-center justify-between text-white z-10 max-w-6xl mx-auto w-full pt-2" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">{property.title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">รูปภาพที่ {selectedImageIndex + 1} จากทั้งหมด {galleryImages.length} รูป</p>
            </div>
            <button onClick={() => setIsGalleryOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg">
              ✕
            </button>
          </div>

          {/* พื้นที่แสดงรูปภาพขนาดใหญ่ + ปุ่มกดถอยหลัง/เลื่อนหน้า */}
          <div className="relative flex-1 flex items-center justify-center my-4 max-w-5xl mx-auto w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))} className="absolute left-2 sm:-left-12 z-20 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xl border border-slate-700 shadow-xl">
              ‹
            </button>
            <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
              <Image src={galleryImages[selectedImageIndex]} alt={`รูปภาพที่ ${selectedImageIndex + 1}`} width={1200} height={800} unoptimized className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
            <button onClick={() => setSelectedImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))} className="absolute right-2 sm:-right-12 z-20 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xl border border-slate-700 shadow-xl">
              ›
            </button>
          </div>

          {/* แถบภาพย่อด้านล่าง Modal (Thumbnails) */}
          <div className="max-w-4xl mx-auto w-full overflow-x-auto pb-2 z-10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 px-2">
              {galleryImages.map((imgUrl, idx) => (
                <button key={idx} onClick={() => setSelectedImageIndex(idx)} className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${selectedImageIndex === idx ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30' : 'border-transparent opacity-50 hover:opacity-100'}`}>
                  <Image src={imgUrl} alt={`Thumbnail ${idx + 1}`} width={80} height={60} unoptimized className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}