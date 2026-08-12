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

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.5 7-11.5a7 7 0 1 0-14 0C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function BedIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18v2M21 18v2M3 12V8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function BathIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" />
      <path d="M7 12V6a2 2 0 0 1 3.2-1.6M4 19v1M18 19v1" />
    </svg>
  );
}

function AreaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v6M3 3h6M21 21v-6M21 21h-6" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 2 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 1 1-3.4-6.5L21 4l-1 4.5A8 8 0 0 1 21 12Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ImagesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M7 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM3 15l3.5-3.5a1.5 1.5 0 0 1 2.1 0L13 16M21 8v10a2 2 0 0 1-2 2H9" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon({ className, direction }: { className?: string; direction: 'left' | 'right' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  );
}

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
  const price = customLoanAmount ?? numericPrice; // ราคาซื้อขายเต็ม (ก่อนหักดาวน์)
  const [interestRate, setInterestRate] = useState(3.5); // อัตราดอกเบี้ยเริ่มต้น % ต่อปี
  const [loanYears, setLoanYears] = useState(30);       // ระยะเวลากู้ (ปี)
  const [downPaymentPercent, setDownPaymentPercent] = useState(10); // เงินดาวน์เริ่มต้น % ของราคาซื้อขาย

  // ----------------------------------------------------------------------------
  // 5. EFFECTS & COMPUTATIONS
  // ----------------------------------------------------------------------------
  // 5.1 บันทึกยอดผู้เข้าชมประกาศนี้ไปยังฐานข้อมูล (+1 View Count)
  useEffect(() => {
    if (id) fetch(`/api/properties/${id}/view`, { method: 'POST' }).catch(() => {});
  }, [id]);

  // 5.2 หักเงินดาวน์ออกจากราคาซื้อขาย เพื่อให้ได้วงเงินกู้จริงที่ใช้คำนวณค่างวด
  const downPaymentAmount = useMemo(() => Math.round(price * downPaymentPercent / 100), [price, downPaymentPercent]);
  const loanAmount = Math.max(price - downPaymentAmount, 0);

  // 5.3 คำนวณยอดผ่อนชำระค่างวดสินเชื่อต่อเดือน (สูตรดอกเบี้ยทบต้นคงที่)
  const monthlyInstallment = useMemo(() => {
    const monthlyRate = interestRate / 12 / 100;
    const totalPayments = loanYears * 12;
    if (loanAmount <= 0) return '0';
    if (monthlyRate === 0) return (loanAmount / totalPayments).toFixed(0);
    const payment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
    return isNaN(payment) || !isFinite(payment) ? '0' : payment.toFixed(0);
  }, [loanAmount, interestRate, loanYears]);

  // แสดงผลหน้ารอโหลดระหว่างที่ยังดึงรายการอสังหาฯ ทั้งหมดไม่เสร็จ
  if (propertiesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 bg-slate-50 text-slate-500 font-bold">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        กำลังโหลดข้อมูลอสังหาริมทรัพย์...
      </div>
    );
  }

  // โหลดเสร็จแล้วแต่หา id นี้ไม่เจอจริง (ถูกลบ/ยังไม่อนุมัติ/ลิงก์ผิด) — ต้องบอกตรงๆ ไม่ใช่โชว์บ้านอื่นแทน
  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 font-bold gap-4 px-4 text-center">
        <SearchIcon className="w-9 h-9" />
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
              <ShareIcon className="w-3.5 h-3.5" /> แชร์
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
                <div className="absolute bottom-3 left-3 bg-slate-900/70 text-white text-[10px] px-3 py-1 rounded-full font-bold flex items-center gap-1 md:hidden">
                  <ImagesIcon className="w-3 h-3" /> 1 / {realImages.length} รูป
                </div>
              )}
              {idx === 4 && (
                <div className="absolute inset-0 bg-slate-950/50 hover:bg-slate-950/60 transition flex items-center justify-center gap-1.5 text-white font-extrabold text-xs">
                  <ImagesIcon className="w-4 h-4" /> ดูทั้งหมด {realImages.length} รูป
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
                  <PinIcon className="w-3.5 h-3.5 shrink-0" />
                  <p>{property.location.replace("📍 ", "")}</p>
                </div>
              </div>

              {/* การ์ดสเปคหลัก 3 ช่อง (ห้องนอน, ห้องน้ำ, พื้นที่) */}
              <div className="border border-slate-200/60 py-4 grid grid-cols-3 text-center text-slate-600 bg-slate-50/50 rounded-2xl text-[11px] font-bold">
                <div>
                  <p className="text-slate-400 font-medium mb-0.5">ห้องนอน</p>
                  <p className="font-extrabold text-xs text-slate-800 inline-flex items-center gap-1"><BedIcon className="w-3.5 h-3.5" /> {property.bedrooms} ห้อง</p>
                </div>
                <div className="border-l border-slate-200/60">
                  <p className="text-slate-400 font-medium mb-0.5">ห้องน้ำ</p>
                  <p className="font-extrabold text-xs text-slate-800 inline-flex items-center gap-1"><BathIcon className="w-3.5 h-3.5" /> {property.bathrooms} ห้อง</p>
                </div>
                <div className="border-l border-slate-200/60">
                  <p className="text-slate-400 font-medium mb-0.5">พื้นที่ใช้สอย</p>
                  <p className="font-extrabold text-xs text-slate-800 inline-flex items-center gap-1"><AreaIcon className="w-3.5 h-3.5" /> {property.area} ตร.ม.</p>
                </div>
              </div>

              {/* ตารางข้อมูลจำเพาะ */}
              <div className="pt-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5"><ListIcon className="w-3.5 h-3.5" /> ข้อมูลจำเพาะ</h3>
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
                        value={price}
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

                  {/* สไลเดอร์ + ช่องกรอกเงินดาวน์ (% ของราคาซื้อขาย) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>เงินดาวน์</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={downPaymentPercent}
                          onChange={(e) => setDownPaymentPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-14 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-400 outline-none focus:border-blue-500 text-right"
                        />
                        <span className="text-blue-400">% (฿{downPaymentAmount.toLocaleString()})</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={Math.min(downPaymentPercent, 50)}
                      onChange={(e) => setDownPaymentPercent(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* สไลเดอร์ + ช่องกรอกระยะเวลากู้ (ปี) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span>ระยะเวลากู้</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="35"
                          value={loanYears}
                          onChange={(e) => setLoanYears(Math.min(35, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-14 bg-slate-900/80 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-400 outline-none focus:border-blue-500 text-right"
                        />
                        <span className="text-blue-400">ปี</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="35"
                      value={Math.min(loanYears, 35)}
                      onChange={(e) => setLoanYears(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>

                  {/* แสดงวงเงินกู้จริงหลังหักดาวน์ */}
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold border-t border-slate-800 pt-3">
                    <span>วงเงินกู้ (หลังหักดาวน์)</span>
                    <span className="text-white">฿{loanAmount.toLocaleString()}</span>
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

                  {/* คำเตือนเรื่องความถูกต้องของตัวเลขประมาณการ */}
                  <p className="text-[9px] leading-relaxed text-slate-500">
                    * ตัวเลขนี้เป็นการประมาณการเบื้องต้นเพื่อใช้ประกอบการตัดสินใจเท่านั้น อัตราดอกเบี้ยและวงเงินอนุมัติจริงขึ้นอยู่กับเงื่อนไขของธนาคาร ประวัติเครดิต และรายได้ของผู้กู้ในขณะนั้น กรุณาติดต่อธนาคารหรือสถาบันการเงินเพื่อขอรายละเอียดที่แม่นยำก่อนตัดสินใจ
                  </p>
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
                  <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">Verified Agent</p>
                </div>
              </div>

              {/* ปุ่มติดต่อด่วน (โทรศัพท์ & คุย LINE) */}
              <div className="space-y-2">
                <a href={phoneUrl} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs">
                  <PhoneIcon className="w-3.5 h-3.5" /> {agentPhone}
                </a>
                <a href={lineUrl} target="_blank" rel="noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs">
                  <ChatIcon className="w-3.5 h-3.5" /> คุย LINE นายหน้า
                </a>
              </div>

              {/* ปุ่มนัดหมายชมบ้าน และ ปุ่มแชทสดในระบบ */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <Link href={`/book-appointment?propertyId=${property.id}`} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl transition shadow flex items-center justify-center gap-2 text-xs text-center">
                  <CalendarIcon className="w-3.5 h-3.5" /> นัดหมายเข้าชมสถานที่จริง
                </Link>
                <button onClick={handleStartChat} disabled={startingChat} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-xs disabled:opacity-50">
                  {startingChat ? (
                    <><div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> กำลังเปิดห้องแชท...</>
                  ) : (
                    <><ChatIcon className="w-3.5 h-3.5" /> แชทสอบถามรายละเอียด</>
                  )}
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
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col justify-between p-4 sm:p-6" onClick={() => setIsGalleryOpen(false)}>

          {/* แถบหัวข้อและปุ่มปิด Modal */}
          <div className="flex items-center justify-between text-white z-10 max-w-6xl mx-auto w-full pt-2" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate max-w-xs sm:max-w-md">{property.title}</h3>
              <p className="text-[11px] text-slate-400 font-medium">รูปภาพที่ {selectedImageIndex + 1} จากทั้งหมด {galleryImages.length} รูป</p>
            </div>
            <button onClick={() => setIsGalleryOpen(false)} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-lg">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>

          {/* พื้นที่แสดงรูปภาพขนาดใหญ่ + ปุ่มกดถอยหลัง/เลื่อนหน้า */}
          <div className="relative flex-1 flex items-center justify-center my-4 max-w-5xl mx-auto w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))} className="absolute left-2 sm:-left-12 z-20 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xl border border-slate-700 shadow-xl">
              <ChevronIcon direction="left" className="w-5 h-5" />
            </button>
            <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl">
              <Image src={galleryImages[selectedImageIndex]} alt={`รูปภาพที่ ${selectedImageIndex + 1}`} width={1200} height={800} unoptimized className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
            </div>
            <button onClick={() => setSelectedImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))} className="absolute right-2 sm:-right-12 z-20 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-blue-600 text-white flex items-center justify-center font-bold text-xl border border-slate-700 shadow-xl">
              <ChevronIcon direction="right" className="w-5 h-5" />
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