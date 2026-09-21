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
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { toast } from '@/components/ui/toast';
import PropertyCard from '@/components/customer/PropertyCard';
import {
  Sparkles,
  Navigation,
  MapPin,
  Waves,
  Dumbbell,
  Car,
  ShieldCheck,
  Video,
  Trees,
  Smile,
  Building2,
  ArrowUpDown,
  PawPrint,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  ShoppingBag,
  Plane,
  Bus,
  Train,
  Ship,
  LayoutGrid,
  ExternalLink,
  Bed,
  Bath,
  Maximize2,
  FileText,
  Share2,
  Phone,
  MessageSquare,
  Calendar,
  ImageIcon,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Heart
} from 'lucide-react';
import { getGoogleMapsDirectionsUrl, type NearbyPlaceResult } from '@/lib/nearbyService';

// ปิด SSR สำหรับแผนที่เสมอ — Leaflet เข้าถึง window/document ตอนโหลดโมดูล
const PropertyLocationMap = dynamic(() => import('@/components/property/PropertyLocationMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">กำลังโหลดแผนที่...</div>
});

function PinIcon({ className }: { className?: string }) {
  return <MapPin className={className} />;
}

function BedIcon({ className }: { className?: string }) {
  return <Bed className={className} />;
}

function BathIcon({ className }: { className?: string }) {
  return <Bath className={className} />;
}

function AreaIcon({ className }: { className?: string }) {
  return <Maximize2 className={className} />;
}

function ListIcon({ className }: { className?: string }) {
  return <FileText className={className} />;
}

function ShareIcon({ className }: { className?: string }) {
  return <Share2 className={className} />;
}

function PhoneIcon({ className }: { className?: string }) {
  return <Phone className={className} />;
}

function ChatIcon({ className }: { className?: string }) {
  return <MessageSquare className={className} />;
}

function CalendarIcon({ className }: { className?: string }) {
  return <Calendar className={className} />;
}

function ImagesIcon({ className }: { className?: string }) {
  return <ImageIcon className={className} />;
}

function SearchIcon({ className }: { className?: string }) {
  return <Search className={className} />;
}

function CloseIcon({ className }: { className?: string }) {
  return <X className={className} />;
}

function ChevronIcon({ className, direction }: { className?: string; direction: 'left' | 'right' }) {
  return direction === 'left' ? <ChevronLeft className={className} /> : <ChevronRight className={className} />;
}

// ----------------------------------------------------------------------------
// HELPER: ไอคอนและข้อมูลประเภทสิ่งอำนวยความสะดวก และสถานที่ใกล้เคียง
// ----------------------------------------------------------------------------
function getAmenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('ว่ายน้ำ') || n.includes('pool')) return Waves;
  if (n.includes('ฟิตเนส') || n.includes('fitness') || n.includes('ยิม') || n.includes('gym')) return Dumbbell;
  if (n.includes('จอดรถ') || n.includes('parking')) return Car;
  if (n.includes('ปลอดภัย') || n.includes('security') || n.includes('รปภ')) return ShieldCheck;
  if (n.includes('กล้อง') || n.includes('cctv') || n.includes('วงจรปิด')) return Video;
  if (n.includes('สวน') || n.includes('park') || n.includes('garden')) return Trees;
  if (n.includes('เด็ก') || n.includes('playground')) return Smile;
  if (n.includes('คลับ') || n.includes('สโมสร') || n.includes('club')) return Building2;
  if (n.includes('ลิฟต์') || n.includes('lift') || n.includes('elevator')) return ArrowUpDown;
  if (n.includes('สัตว์') || n.includes('pet')) return PawPrint;
  return CheckCircle2;
}

interface NearbyMeta {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bgClass: string;
  colorClass: string;
}

function getNearbyMeta(category?: string | null, transitType?: string | null): NearbyMeta {
  const c = (category || '').toLowerCase();
  const baseStyle = {
    bgClass: 'bg-slate-100/90 border border-slate-200/80 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors',
    colorClass: 'text-slate-700 group-hover:text-blue-600 transition-colors',
  };

  if (c === 'shopping' || c.includes('ห้าง') || c.includes('ตลาด') || c.includes('มอลล์') || c.includes('เซ็นทรัล') || c.includes('shop')) {
    return {
      icon: ShoppingBag,
      label: 'ห้างสรรพสินค้า / ตลาด',
      ...baseStyle,
    };
  }
  if (c === 'education' || c.includes('ศึกษา') || c.includes('เรียน') || c.includes('มหา') || c.includes('school')) {
    return {
      icon: GraduationCap,
      label: 'สถานศึกษา',
      ...baseStyle,
    };
  }
  if (c === 'hospital' || c.includes('พยาบาล') || c.includes('แพทย์') || c.includes('คลินิก') || c.includes('hosp')) {
    return {
      icon: HeartPulse,
      label: 'โรงพยาบาล / สถานพยาบาล',
      ...baseStyle,
    };
  }
  if (c === 'transport' || c.includes('transit') || c.includes('ขนส่ง') || c.includes('คมนาคม') || c.includes('สถานี') || c.includes('สนามบิน')) {
    if (transitType === 'flight' || c.includes('สนามบิน') || c.includes('บิน') || c.includes('airport')) {
      return {
        icon: Plane,
        label: 'ขนส่งสาธารณะ (สายการบิน)',
        ...baseStyle,
      };
    }
    if (transitType === 'train' || c.includes('รถไฟ') || c.includes('ราง')) {
      return {
        icon: Train,
        label: 'ขนส่งสาธารณะ (รถไฟ)',
        ...baseStyle,
      };
    }
    if (transitType === 'ferry' || c.includes('เรือ') || c.includes('แพ') || c.includes('ท่าเรือ')) {
      return {
        icon: Ship,
        label: 'ขนส่งสาธารณะ (เรือข้ามฟาก)',
        ...baseStyle,
      };
    }
    return {
      icon: Bus,
      label: 'ขนส่งสาธารณะ (รถโดยสาร)',
      ...baseStyle,
    };
  }
  return {
    icon: MapPin,
    label: 'สถานที่สำคัญ',
    ...baseStyle,
  };
}

export default function PropertyDetailPage() {
  // ----------------------------------------------------------------------------
  // 1. ROUTER & GLOBAL CONTEXT
  // ----------------------------------------------------------------------------
  const params = useParams();
  const id = params.id; // รหัส ID อสังหาฯ จาก URL Parameter (เช่น /property/uuid)

  const { properties, propertiesLoading, favorites, toggleFavorite } = useApp();

  // 1.1 ค้นหาข้อมูลอสังหาริมทรัพย์จาก ID ที่ตรงกันในฐานข้อมูล
  const property = properties.find((p) => String(p.id) === String(id));

  // 1.2 จัดการสถานที่สำคัญหลัก 5 แท็บแบบ Real-time Dynamic จาก OpenStreetMap (ปลอดข้อมูลฮาร์ดโค้ด 100%)
  const [activeNearbyTab, setActiveNearbyTab] = useState<'all' | 'shopping' | 'education' | 'hospital' | 'transport'>('all');
  const [nearbyData, setNearbyData] = useState<{
    propertyId: string;
    data: {
      all: NearbyPlaceResult[];
      shopping: NearbyPlaceResult[];
      education: NearbyPlaceResult[];
      hospital: NearbyPlaceResult[];
      transport: NearbyPlaceResult[];
    };
  } | null>(null);

  const isNearbyLoading = Boolean(property && (!nearbyData || nearbyData.propertyId !== String(property.id)));

  useEffect(() => {
    if (!property) return;
    const lat = property.latitude != null ? Number(property.latitude) : 7.0089;
    const lng = property.longitude != null ? Number(property.longitude) : 100.4812;

    let isMounted = true;

    fetch(`/api/nearby?lat=${lat}&lng=${lng}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res.success && res.data) {
          setNearbyData({
            propertyId: String(property.id),
            data: res.data
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch dynamic nearby places from OSM:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [property]);

  const activePlaces = useMemo<NearbyPlaceResult[]>(() => {
    if (!nearbyData || nearbyData.propertyId !== String(property?.id)) return [];
    return nearbyData.data[activeNearbyTab] || [];
  }, [nearbyData, activeNearbyTab, property?.id]);

  // 1.2 ค้นหาอสังหาริมทรัพย์ที่คล้ายกัน (ประเภทเดียวกัน หรือ ทำเลเดียวกัน หรือ ช่วงราคาใกล้เคียง ไม่รวมหลังปัจจุบัน)
  const similarProperties = useMemo(() => {
    if (!property) return [];
    const others = properties.filter((p) => String(p.id) !== String(property.id));
    const scored = others.map((p) => {
      let score = 0;
      if (p.type === property.type) score += 3;
      if (p.province_id && property.province_id && p.province_id === property.province_id) score += 2;
      if (p.amphure_id && property.amphure_id && p.amphure_id === property.amphure_id) score += 1;
      return { prop: p, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((item) => item.prop);
  }, [properties, property]);

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
  // 5. REVIEWS STATE & EFFECT
  // ----------------------------------------------------------------------------
  interface ReviewItem {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    customerName: string;
    customerImage?: string | null;
    propertyTitle: string;
  }
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [agentRealRating, setAgentRealRating] = useState<number>(property?.agentRating || 0);
  const [agentRealReviewCount, setAgentRealReviewCount] = useState<number>(property?.agentReviewCount || 0);

  useEffect(() => {
    if (property?.agent_id) {
      fetch(`/api/reviews?agentId=${property.agent_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setReviews(data.reviews || []);
            setAgentRealRating(data.averageRating || 0);
            setAgentRealReviewCount(data.totalReviews || 0);
          }
        })
        .catch(err => console.error("Error fetching agent reviews:", err))
        .finally(() => setReviewsLoading(false));
    }
  }, [property?.agent_id]);

  // ----------------------------------------------------------------------------
  // 6. EFFECTS & COMPUTATIONS
  // ----------------------------------------------------------------------------
  // 6.1 บันทึกยอดผู้เข้าชมประกาศนี้ไปยังฐานข้อมูล (+1 View Count)
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
      toast.success("คัดลอกลิงก์ประกาศไปยังคลิปบอร์ดแล้ว!");
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
        toast.error(data.error || 'ไม่สามารถเปิดห้องแชทได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเปิดห้องแชท');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center text-xs">
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
              <Heart className={`w-4 h-4 ${isSaved ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
              <span>{isSaved ? "บันทึกแล้ว" : "บันทึก"}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ========================================================================
            ส่วนที่ 2: กริดแสดงรูปภาพอสังหาฯ (PHOTO GALLERY GRID - 5 SLOTS)
            ======================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 rounded-3xl overflow-hidden shadow-sm border border-slate-200/40 bg-white md:h-[460px]">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs bg-slate-50/40 p-4 rounded-2xl border border-slate-200/50">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ประเภทอสังหาฯ</span>
                    <span className="font-bold text-slate-700">{property.type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ลักษณะเด่น</span>
                    <span className="font-bold text-slate-700">{property.tag || "ทรัพย์ทั่วไป"}</span>
                  </div>
                                    {/* บ้านที่ลงประกาศก่อนมีฟีเจอร์นี้จะได้ null ทั้ง 4 ฟิลด์ — โชว์ "ไม่ระบุ" แทนที่จะพัง */}
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ค่าส่วนกลาง</span>
                    <span className="font-bold text-slate-700">
                      {property.commonFee ? `฿${property.commonFee.toLocaleString()} / เดือน` : "ไม่มีค่าส่วนกลาง"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">ที่จอดรถ</span>
                    <span className="font-bold text-slate-700">{property.parking != null ? `${property.parking} คัน` : "ไม่ระบุ"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">จำนวนชั้น</span>
                    <span className="font-bold text-slate-700">{property.floors != null ? `${property.floors} ชั้น` : "ไม่ระบุ"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">กรรมสิทธิ์</span>
                    <span className="font-bold text-slate-700">{property.ownership || "ไม่ระบุ"}</span>
                  </div>
                </div>
              </div>

              {/* สิ่งอำนวยความสะดวกและพื้นที่ส่วนกลาง */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    สิ่งอำนวยความสะดวกและพื้นที่ส่วนกลาง
                  </h3>
                  {property.amenities && property.amenities.length > 0 && (
                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {property.amenities.length} รายการ
                    </span>
                  )}
                </div>

                {property.amenities && property.amenities.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {property.amenities.map((amenity, idx) => {
                      const AmenityIcon = getAmenityIcon(amenity);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/60 border border-slate-200/60 hover:bg-blue-50/40 hover:border-blue-200/80 transition-all duration-200 group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 group-hover:border-blue-300 flex items-center justify-center text-blue-600 shadow-2xs shrink-0 transition-colors">
                            <AmenityIcon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 line-clamp-1">
                            {amenity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic bg-slate-50/40 p-3.5 rounded-2xl border border-slate-200/40">
                    นายหน้ายังไม่ได้ระบุสิ่งอำนวยความสะดวกสำหรับประกาศนี้
                  </p>
                )}
              </div>

              {/* ข้อความรายละเอียดเพิ่มเติม */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">รายละเอียดอสังหาริมทรัพย์</h3>
                <p className="text-slate-600 leading-relaxed text-xs whitespace-pre-line">
                  {property.description || "นายหน้ายังไม่ได้เพิ่มรายละเอียดเพิ่มเติมสำหรับประกาศนี้"}
                </p>
              </div>

              {/* แผนที่ OpenStreetMap & ปุ่มเปิด Google Maps */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    แผนที่ตั้งโครงการ
                  </h3>
                  {property.latitude != null && property.longitude != null && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-3 py-1.5 rounded-xl border border-blue-200/70 transition-all duration-200 shadow-2xs group"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>เปิดใน Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-600 ml-0.5" />
                    </a>
                  )}
                </div>
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 h-64 relative">
                  <PropertyLocationMap
                    latitude={property.latitude ?? null}
                    longitude={property.longitude ?? null}
                    height={256}
                  />
                </div>
              </div>

              {/* สถานที่สำคัญระดับหลักและศูนย์กลางคมนาคม (Major Landmarks & Transit Hubs) */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      สถานที่สำคัญและขนส่งสาธารณะรอบโครงการ (สแกนจาก OpenStreetMap)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      สแกนหาสถานที่สำคัญหลักรอบพิกัดบ้านสดๆ ผ่าน OpenStreetMap (รองรับทุกทำเลทั่วประเทศ)
                    </p>
                  </div>
                  {isNearbyLoading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 shrink-0 self-start sm:self-auto">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      กำลังสแกนผ่าน OpenStreetMap...
                    </span>
                  ) : activePlaces.length > 0 ? (
                    <span className="text-xs font-black text-blue-700 bg-blue-50/80 px-3 py-1 rounded-full border border-blue-200/60 shrink-0 self-start sm:self-auto">
                      {activeNearbyTab === 'all' ? '4 จุดสำคัญเด่นรอบบ้าน' : `พบ ${activePlaces.length} แห่งในหมวดนี้`}
                    </span>
                  ) : null}
                </div>

                {/* แถบ Segmented Filter Tabs สไตล์ Apple Capsule */}
                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl overflow-x-auto scrollbar-none border border-slate-200/70 shadow-2xs">
                  {[
                    { id: 'all', label: 'ทั้งหมด', icon: LayoutGrid },
                    { id: 'shopping', label: 'ห้างสรรพสินค้า / ตลาด', icon: ShoppingBag },
                    { id: 'education', label: 'สถานศึกษา', icon: GraduationCap },
                    { id: 'hospital', label: 'โรงพยาบาล', icon: HeartPulse },
                    { id: 'transport', label: 'ขนส่งสาธารณะ', icon: Bus },
                  ].map((tab) => {
                    const TabIcon = tab.icon;
                    const isActive = activeNearbyTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveNearbyTab(tab.id as 'all' | 'shopping' | 'education' | 'hospital' | 'transport')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-white text-blue-600 shadow-xs font-black border border-slate-200/60'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                        }`}
                      >
                        <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* รายการการ์ดสถานที่ */}
                {isNearbyLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="p-4 rounded-2xl bg-white border border-slate-200/80 animate-pulse space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-slate-200 rounded-2xl shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                            <div className="h-3 bg-slate-100 rounded-md w-1/3" />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="h-5 bg-slate-100 rounded-xl w-24" />
                          <div className="h-7 bg-slate-200 rounded-xl w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activePlaces.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                    {activePlaces.map((place) => {
                      const meta = getNearbyMeta(place.category, place.transitType);
                      const NearbyIcon = meta.icon;
                      return (
                        <div
                          key={place.id}
                          className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-400/80 hover:shadow-md transition-all duration-200 group gap-3.5"
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-blue-50/80 border border-blue-100 text-blue-600 shadow-2xs group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all duration-200">
                              <NearbyIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={place.name}>
                                {place.name}
                              </p>
                              <div className="mt-1">
                                <span className="inline-flex items-center text-[11px] font-semibold text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/50">
                                  {meta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            {place.distanceText ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-2xs">
                                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                ห่าง {place.distanceText}
                              </span>
                            ) : <span />}
                            <a
                              href={getGoogleMapsDirectionsUrl(
                                property?.latitude,
                                property?.longitude,
                                place.lat,
                                place.lng,
                                property?.location
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 px-3.5 py-1.5 rounded-xl shadow-2xs hover:shadow transition-all group/btn"
                              title={`เปิดเส้นทางจากบ้านไป ${place.name} ใน Google Maps`}
                            >
                              <span>เปิดนำทาง</span>
                              <ExternalLink className="w-3.5 h-3.5 text-blue-200 group-hover/btn:text-white transition-colors" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-slate-50/60 rounded-2xl border border-slate-200/60 space-y-1.5">
                    <p className="text-xs text-slate-600 font-bold">
                      ไม่พบข้อมูลสถานที่สำคัญในหมวดหมู่นี้
                    </p>
                    <p className="text-[11px] text-slate-400">
                      ระบบทำการสแกนรอบพิกัดจริงของบ้านผ่าน OpenStreetMap เรียบร้อยแล้ว (ไม่มีการแสดงข้อมูลจำลองหรือข้อมูลที่เขียนขึ้นเอง)
                    </p>
                  </div>
                )}
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

              {/* ====================================================================
                  ส่วนที่ 3.5: คะแนนและรีวิวจากผู้ใช้บริการ (CUSTOMER REVIEWS & RATINGS)
                  ==================================================================== */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      <span>คะแนนและความคิดเห็นจากผู้เข้าชมจริง</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      รีวิวการให้บริการของนายหน้า {property.agentName} จากลูกค้าที่นัดหมายเข้าชมโครงการจริง
                    </p>
                  </div>
                  {agentRealReviewCount > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/60 px-3.5 py-1.5 rounded-2xl shrink-0 self-start sm:self-center">
                      <span className="text-lg font-black text-amber-600">{agentRealRating.toFixed(1)}</span>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }, (_, i) => (
                          <svg 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < Math.round(agentRealRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-[11px] text-amber-800 font-bold">({agentRealReviewCount} รีวิว)</span>
                    </div>
                  )}
                </div>

                {reviewsLoading ? (
                  <div className="py-10 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    กำลังโหลดข้อมูลรีวิว...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="py-10 px-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 border border-amber-200/60 flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5 fill-amber-400" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-700">ยังไม่มีรีวิวสำหรับนายหน้าท่านนี้</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      เมื่อคุณนัดหมายเข้าชมโครงการและเข้าชมสถานที่จริงเสร็จสิ้น คุณสามารถร่วมบันทึกประเมินความพึงพอใจการให้บริการได้
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center overflow-hidden border border-blue-200 shrink-0">
                              {rev.customerImage ? (
                                <Image src={rev.customerImage} alt={rev.customerName} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                              ) : (
                                rev.customerName[0] || 'U'
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{rev.customerName}</p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(rev.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 shadow-xs">
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {Array.from({ length: 5 }, (_, i) => (
                                <svg 
                                  key={i} 
                                  className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`} 
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-700 ml-1">{rev.rating}.0</span>
                          </div>
                        </div>
                        {rev.comment && (
                          <p className="text-xs text-slate-600 leading-relaxed sm:pl-12">
                            &ldquo;{rev.comment}&rdquo;
                          </p>
                        )}
                        <div className="sm:pl-12 flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            เข้าชม: {rev.propertyTitle}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">Verified Agent</span>
                    <span className="text-slate-300">•</span>
                    {agentRealReviewCount > 0 ? (
                      <span className="text-[11px] font-extrabold text-amber-600 flex items-center gap-0.5">
                        ⭐ {agentRealRating.toFixed(1)} <span className="text-slate-400 font-medium">({agentRealReviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">ยังไม่มีรีวิว</span>
                    )}
                  </div>
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

        {/* ========================================================================
            ส่วนที่ 4.5: อสังหาริมทรัพย์ที่คล้ายกัน (SIMILAR / RECOMMENDED PROPERTIES)
            ======================================================================== */}
        {similarProperties.length > 0 && (
          <section className="pt-8 border-t border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  อสังหาริมทรัพย์ที่คล้ายกัน
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  ทรัพย์ประเภทเดียวกันหรือทำเลใกล้เคียงที่คุณอาจสนใจ
                </p>
              </div>
              <Link
                href="/search"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0"
              >
                ดูทั้งหมด
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarProperties.map((simProp) => (
                <PropertyCard
                  key={simProp.id}
                  prop={simProp}
                  isFav={favorites.includes(simProp.id)}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* ========================================================================
          ส่วนพิเศษ: แถบ Action Bar ด้านล่างสำหรับหน้าจอมือถือ (MOBILE FIXED BOTTOM ACTION BAR)
          ======================================================================== */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase">ราคา</p>
          <p className="text-base font-black text-blue-700 truncate">{property.price}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={phoneUrl}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-200"
            title="โทรหานายหน้า"
            aria-label="โทรหานายหน้า"
          >
            <PhoneIcon className="w-4 h-4" />
          </a>
          <button
            onClick={handleStartChat}
            disabled={startingChat}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition border border-slate-200 disabled:opacity-50"
            title="แชทกับนายหน้า"
            aria-label="แชทกับนายหน้า"
          >
            {startingChat ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ChatIcon className="w-4 h-4" />
            )}
          </button>
          <Link
            href={`/book-appointment?propertyId=${property.id}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3.5 sm:px-4 py-2.5 rounded-xl text-xs transition shadow flex items-center gap-1.5"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>นัดหมายเข้าชม</span>
          </Link>
        </div>
      </div>

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