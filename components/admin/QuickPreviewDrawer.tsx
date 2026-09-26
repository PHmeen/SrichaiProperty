'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Car,
  Layers,
  Shield,
  FileText,
  ExternalLink,
  Phone,
  MessageSquare,
  Check,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from '@/components/ui/toast';

export interface QuickPreviewProperty {
  id: string;
  title: string;
  price: string;
  listingType: 'sale' | 'rent';
  type: string;
  location: string;
  province?: string;
  amphure?: string;
  district?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  bedrooms: number;
  bathrooms: number;
  area: string;
  parkingSpaces?: number;
  floors?: number;
  ownershipType?: string;
  agentName: string;
  agentEmail?: string;
  agentPhone?: string;
  agentLineId?: string;
  agentProfileImage?: string | null;
  agentPlan: string;
  createdAt: string;
  image: string | null;
  images?: string[];
  imageCount: number;
  amenities?: string[];
  documents?: { id: string; url: string; type: string }[];
  slaLabel: string;
  slaLevel: 'normal' | 'warning' | 'urgent' | 'overdue';
  slaMinutesLeft: number;
  slaUrgent?: boolean;
  reviewedAt?: string | null;
  reviewerName?: string | null;
  reviewDurationLabel?: string | null;
  reviewWithinSla?: boolean | null;
  status?: string;
}

interface QuickPreviewDrawerProps {
  property: QuickPreviewProperty | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (id: string) => void;
  onReject?: (property: QuickPreviewProperty) => void;
}

export default function QuickPreviewDrawer({
  property,
  isOpen,
  onClose,
  onApprove,
  onReject
}: QuickPreviewDrawerProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !property) return null;

  const images = property.images && property.images.length > 0
    ? property.images
    : property.image
    ? [property.image]
    : [];

  const currentImage = images[activeImageIndex] || null;

  const nextImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (images.length <= 1) return;
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`คัดลอก ${label} แล้ว`);
  };

  const mapSearchUrl = property.latitude && property.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.location || '')}`;

  const slaBadgeColor = (level: QuickPreviewProperty['slaLevel']) => {
    if (level === 'urgent' || level === 'overdue') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          aria-label="พรีวิวประกาศด่วน"
          className="w-screen max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300 border-l border-slate-200"
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                QUICK PREVIEW
              </span>
              <span className="text-xs text-slate-300 font-mono">
                #{property.id.slice(0, 8)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="ปิดแถบพรีวิว (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Gallery Section */}
            <div className="space-y-2">
              <div className="relative h-64 sm:h-72 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 group flex items-center justify-center">
                {currentImage ? (
                  <Image
                    src={currentImage}
                    alt={property.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 560px"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="text-center text-slate-400 font-medium text-xs">
                    ไม่มีรูปภาพแนบ
                  </div>
                )}

                {/* Counter Badge */}
                {images.length > 0 && (
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full z-10 shadow-sm">
                    {activeImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Left/Right Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition"
                      title="รูปก่อนหน้า"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md flex items-center justify-center transition"
                      title="รูปถัดไป"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                        activeImageIndex === idx
                          ? 'border-blue-600 ring-2 ring-blue-500/20'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`thumb-${idx}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Price Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100">
                  {property.type}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${
                    property.listingType === 'rent'
                      ? 'bg-violet-50 text-violet-700 border-violet-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}
                >
                  {property.listingType === 'rent' ? 'สำหรับเช่า' : 'สำหรับขาย'}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-md border flex items-center gap-1 ${slaBadgeColor(
                    property.slaLevel
                  )}`}
                >
                  <Clock className="w-3 h-3" />
                  SLA: {property.slaLabel}
                </span>
              </div>

              <h2 className="text-xl font-extrabold text-slate-900 leading-snug mb-1">
                {property.title}
              </h2>

              <p className="text-2xl font-black text-blue-600">
                ฿ {Number(property.price).toLocaleString()}
                {property.listingType === 'rent' && (
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ เดือน</span>
                )}
              </p>
            </div>

            {/* Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Bed className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ห้องนอน</p>
                  <p className="text-xs font-black text-slate-800">{property.bedrooms} ห้อง</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Bath className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ห้องน้ำ</p>
                  <p className="text-xs font-black text-slate-800">{property.bathrooms} ห้อง</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">พื้นที่ใช้สอย</p>
                  <p className="text-xs font-black text-slate-800">{property.area} ตร.ม.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">ที่จอดรถ</p>
                  <p className="text-xs font-black text-slate-800">{property.parkingSpaces || 0} คัน</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">จำนวนชั้น</p>
                  <p className="text-xs font-black text-slate-800">{property.floors || 1} ชั้น</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-2xs shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">กรรมสิทธิ์</p>
                  <p className="text-xs font-black text-slate-800 truncate max-w-[90px]">
                    {property.ownershipType || 'ขายขาด'}
                  </p>
                </div>
              </div>
            </div>

            {/* Location & Map */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                ทำเลและที่ตั้ง
              </h4>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      {property.location}
                    </p>
                    {(property.district || property.amphure || property.province) && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {[property.district, property.amphure, property.province]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                <a
                  href={mapSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center gap-1.5 transition shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูแผนที่</span>
                </a>
              </div>
            </div>

            {/* Documents & Deeds */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
                <span>เอกสารสิทธิ์ / โฉนดที่ดิน</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {property.documents?.length || 0} ไฟล์
                </span>
              </h4>

              {property.documents && property.documents.length > 0 ? (
                <div className="space-y-2">
                  {property.documents.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 truncate">
                          เอกสารสิทธิ์ที่ {idx + 1} ({doc.type.toUpperCase()})
                        </span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 flex items-center gap-1 transition shrink-0"
                      >
                        <ExternalLink className="w-3 h-3 text-slate-500" />
                        <span>เปิดดู</span>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                  ไม่มีเอกสารสิทธิ์หรือโฉนดแนบมาเพิ่มเติม
                </p>
              )}
            </div>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  สิ่งอำนวยความสะดวก
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {property.amenities.map((item, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                    >
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>{item}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  รายละเอียดประกาศ
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap font-sans">
                  {property.description}
                </div>
              </div>
            )}

            {/* Agent Contact Card */}
            <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ผู้ดูแลประกาศ (นายหน้า)
                </span>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    property.agentPlan === 'pro'
                      ? 'bg-amber-400 text-slate-900'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {property.agentPlan === 'pro' ? 'Verified PRO' : 'Basic Tier'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center font-black text-white text-base overflow-hidden shrink-0 border-2 border-white/20">
                  {property.agentProfileImage ? (
                    <Image
                      src={property.agentProfileImage}
                      alt={property.agentName}
                      width={44}
                      height={44}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    property.agentName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-sm text-white truncate">
                    {property.agentName}
                  </p>
                  <p className="text-xs text-slate-300 truncate">
                    {property.agentEmail || 'ไม่ระบุอีเมล'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-2">
                {property.agentPhone && (
                  <a
                    href={`tel:${property.agentPhone}`}
                    className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{property.agentPhone}</span>
                  </a>
                )}

                {property.agentLineId && (
                  <button
                    onClick={() => copyToClipboard(property.agentLineId || '', 'LINE ID')}
                    className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
                    title="คัดลอก LINE ID"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                    <span className="truncate">LINE: {property.agentLineId}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>

            {onReject && (
              <button
                onClick={() => onReject(property)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>ส่งกลับแก้ไข / ตีกลับ</span>
              </button>
            )}

            {onApprove && (
              <button
                onClick={() => onApprove(property.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>อนุมัติขึ้นเว็บไซต์</span>
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
