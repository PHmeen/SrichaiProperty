'use client';

/**
 * ==============================================================================
 * การ์ดแสดงผลอสังหาริมทรัพย์ (PropertyCard Component)
 * ==============================================================================
 * ออกแบบใหม่:
 * 1. ใช้ Lucide Icons มาตรฐานทั้งระบบ (MapPin, Bed, Bath, Maximize2, Star, Crown, BadgeCheck, Heart, Calendar)
 * 2. รองรับ 2 มุมมอง: Grid View (การ์ดตาราง) และ List View (การ์ดแนวนอน)
 * 3. แสดงราคาต่อ ตร.ม. และยอดผ่อนประเมินเบื้องต้นต่องวด
 * 4. ปุ่มลัดกด "นัดหมายเข้าชม" ตรงถึงหน้านัดหมายได้ทันที
 * ==============================================================================
 */

import React, { useState } from 'react';
import { fallbackAvatarUrl } from '@/lib/utils/avatar'; // รูปโปรไฟล์สำรองแบบ PNG (ชื่อไทยบางชื่อได้ SVG ที่ next/image ไม่รับ — BUG-32)
import Link from 'next/link';
import Image from 'next/image';
import { 
  BadgeCheck, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize2, 
  Star, 
  Crown, 
  Heart, 
  Car, 
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Property } from '@/context/AppContext';

interface PropertyCardProps {
  prop: Property;
  isFav: boolean;
  toggleFavorite: (id: string | number) => void;
  viewMode?: 'grid' | 'list';
}

export default function PropertyCard({ 
  prop, 
  isFav, 
  toggleFavorite,
  viewMode = 'grid'
}: PropertyCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // ฟังก์ชันช่วยสร้างรูป Avatar สำรองจากชื่อนายหน้า
  const getInitialsAvatar = (name: string) =>
    fallbackAvatarUrl(name || 'Agent', '1d4ed8');

  // คำนวณราคาเป็นตัวเลข
  const rawPriceStr = prop.price || '';
  const numPrice = parseInt(rawPriceStr.replace(/[^\d]/g, ''), 10) || 0;

  // คำนวณราคาต่อ ตร.ม.
  const pricePerSqm = (prop.area && prop.area > 0 && numPrice > 0)
    ? Math.round(numPrice / prop.area)
    : null;

  // คำนวณยอดผ่อนประเมิน (สำหรับทรัพย์ขาย ดอกเบี้ยมาตรฐาน 30 ปี ~฿5,500 - ฿6,000 ต่อ 1 ล้าน)
  const isSale = prop.listingType === 'sale' || !rawPriceStr.includes('/ เดือน');
  const estimatedMonthly = (isSale && numPrice > 0)
    ? Math.round(numPrice * 0.0055)
    : null;

  // ทำเลที่ตั้งแบบกระชับ
  const displayLocation = (prop.districtName && prop.amphureName && prop.provinceName)
    ? `${prop.districtName}, ${prop.amphureName}, ${prop.provinceName}`
    : (prop.location || '').replace("📍 ", "").trim();

  // ----------------------------------------------------------------------------
  // LIST VIEW: มุมมองแนวนอน กว้าง รายละเอียดครบ สแกนง่าย
  // ----------------------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col sm:flex-row group relative ${
        prop.isPremium ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-50/50' : 'border-slate-200/90'
      }`}>
        {/* รูปภาพและป้ายกำกับด้านซ้าย */}
        <div className="relative sm:w-72 md:w-80 h-52 sm:h-auto shrink-0 overflow-hidden bg-slate-100">
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
          )}
          <Link href={`/property/${prop.id}`} className="block w-full h-full">
            <Image
              src={prop.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop'}
              alt={prop.title}
              width={400}
              height={260}
              onLoad={() => setIsImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                isImageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-xs'
              }`}
            />
          </Link>

          {/* ป้ายสถานะบนรูปภาพ */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
            {prop.isVerifiedPro ? (
              <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] tracking-wide shadow-md flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5 shrink-0" /> Verified PRO
              </span>
            ) : prop.isPremium ? (
              <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] tracking-wide shadow-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-slate-950 text-slate-950" /> พรีเมียม
              </span>
            ) : (
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide shadow-xs">
                {prop.tag || 'ทั่วไป'}
              </span>
            )}
            <span className="bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wide">
              {prop.type}
            </span>
          </div>

          {/* ปุ่มหัวใจรายการโปรด */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(prop.id);
            }}
            aria-label="บันทึกในรายการโปรด"
            className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white backdrop-blur-xs rounded-full flex items-center justify-center transition-all border border-slate-200/60 shadow-sm cursor-pointer active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFav ? 'text-rose-500 fill-rose-500' : 'text-slate-400 hover:text-slate-600'
              }`}
            />
          </button>
        </div>

        {/* ข้อมูลตรงกลางและขวา */}
        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <Link href={`/property/${prop.id}`}>
                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                    {prop.title}
                  </h3>
                </Link>
                <p className="text-slate-400 text-xs font-medium flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="truncate">{displayLocation}</span>
                  {prop.distanceText && (
                    <span className="shrink-0 font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                      ห่าง {prop.distanceText}
                    </span>
                  )}
                </p>
              </div>

              {/* ราคา */}
              <div className="sm:text-right shrink-0">
                <div className="text-xl font-black text-blue-700 tracking-tight leading-none">
                  {prop.price}
                </div>
                {pricePerSqm && (
                  <div className="text-[11px] text-slate-400 font-semibold mt-1">
                    ฿{pricePerSqm.toLocaleString()} /ตร.ม.
                  </div>
                )}
                {estimatedMonthly && (
                  <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    ผ่อนเริ่มต้น ~฿{estimatedMonthly.toLocaleString()}/ด.
                  </div>
                )}
              </div>
            </div>

            {/* สเปกบ้าน: นอน, น้ำ, พื้นที่, ที่จอดรถ */}
            <div className="flex flex-wrap items-center gap-4 text-slate-600 text-xs font-bold pt-2">
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                <Bed className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{prop.bedrooms} ห้องนอน</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                <Bath className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{prop.bathrooms} ห้องน้ำ</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                <Maximize2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{prop.area} ตร.ม.</span>
              </span>
              {prop.parking && prop.parking > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                  <Car className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{prop.parking} ที่จอดรถ</span>
                </span>
              )}
            </div>

            {/* พรีวิวสิ่งอำนวยความสะดวก */}
            {prop.amenities && prop.amenities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                {prop.amenities.slice(0, 3).map((amenity, idx) => (
                  <span key={idx} className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                    {amenity}
                  </span>
                ))}
                {prop.amenities.length > 3 && (
                  <span className="text-slate-400 text-[10px]">
                    +{prop.amenities.length - 3} สิ่งอำนวยความสะดวก
                  </span>
                )}
              </div>
            )}
          </div>

          {/* แถวล่าง: นายหน้า + ปุ่มดำเนินการ */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Image
                src={prop.agentImage || getInitialsAvatar(prop.agentName)}
                alt={prop.agentName}
                width={32}
                height={32}
                unoptimized={!prop.agentImage}
                className={`w-8 h-8 rounded-full object-cover shadow-2xs ${
                  prop.isPremium ? 'ring-2 ring-amber-400' : 'ring-1 ring-slate-200'
                }`}
              />
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span>{prop.agentName}</span>
                  {prop.agentRating && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-extrabold bg-amber-50 px-1.5 py-0.2 rounded">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      {Number(prop.agentRating).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {prop.isVerifiedPro ? 'Verified PRO Agent' : prop.isPremium ? 'Premium Agent' : 'นายหน้าตัวแทน'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/book-appointment?propertyId=${prop.id}`}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-transparent transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>นัดชม</span>
              </Link>
              <Link
                href={`/property/${prop.id}`}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // GRID VIEW: มุมมองการ์ดสี่เหลี่ยมมาตรฐาน สวยงาม พรีเมียม
  // ----------------------------------------------------------------------------
  return (
    <div className={`bg-white rounded-2xl border shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group relative ${
      prop.isPremium ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-50/50' : 'border-slate-200/90'
    }`}>
      {/* ปุ่มกดหัวใจบันทึกรายการโปรด */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(prop.id);
        }}
        aria-label="บันทึกในรายการโปรด"
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white backdrop-blur-xs rounded-full flex items-center justify-center transition-all border border-slate-200/60 shadow-sm cursor-pointer active:scale-90"
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isFav ? 'text-rose-500 fill-rose-500' : 'text-slate-400 hover:text-slate-600'
          }`}
        />
      </button>

      {/* ป้าย Badge สถานะ (พรีเมียม / แท็ก / ประเภททรัพย์) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 pointer-events-none">
        {prop.isVerifiedPro ? (
          <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] tracking-wide shadow-md flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5 shrink-0" /> Verified PRO
          </span>
        ) : prop.isPremium ? (
          <span className="bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-lg text-[10px] tracking-wide shadow-md flex items-center gap-1">
            <Star className="w-3 h-3 fill-slate-950 text-slate-950" /> พรีเมียม
          </span>
        ) : (
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide shadow-xs">
            {prop.tag || 'ทั่วไป'}
          </span>
        )}
        <span className="bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[10px] font-semibold tracking-wide">
          {prop.type}
        </span>
      </div>

      {/* ลิงก์ห่อหุ้มรูปภาพและรายละเอียดบ้าน */}
      <Link href={`/property/${prop.id}`} className="block flex-grow">
        {/* รูปภาพหลักของอสังหาริมทรัพย์ */}
        <div className="relative h-48 overflow-hidden bg-slate-100">
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
          )}
          <Image 
            src={prop.image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop'} 
            alt={prop.title}
            width={400}
            height={220}
            onLoad={() => setIsImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 ${
              isImageLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-xs'
            }`}
          />

          {/* ป้ายระยะทาง บนรูปภาพ */}
          {prop.distanceText && (
            <div className="absolute top-2.5 right-11 bg-blue-600/95 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 border border-white/20">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>ห่าง {prop.distanceText}</span>
            </div>
          )}

          {/* ป้ายราคาต่อ ตร.ม. บนมุมล่างซ้ายรูปภาพ */}
          {pricePerSqm && (
            <div className="absolute bottom-2.5 left-2.5 bg-slate-900/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              ฿{pricePerSqm.toLocaleString()} /ตร.ม.
            </div>
          )}
        </div>

        {/* ข้อมูลรายละเอียด: ราคา, ชื่อเรื่อง, ทำเล, และสเปกห้อง */}
        <div className="p-4 space-y-2.5">
          {/* แถวราคา + ยอดผ่อนประเมิน */}
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-black text-blue-700 leading-none tracking-tight">
              {prop.price}
            </div>
            {estimatedMonthly && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md truncate">
                ผ่อน ~฿{estimatedMonthly.toLocaleString()}/ด.
              </span>
            )}
          </div>
          
          {/* ชื่อทรัพย์ */}
          <h3 className="text-sm font-extrabold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {prop.title}
          </h3>

          {/* ทำเลที่ตั้ง */}
          <p className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{displayLocation}</span>
            {prop.distanceText && (
              <span className="shrink-0 font-extrabold text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded-md text-[10px]">
                ห่าง {prop.distanceText}
              </span>
            )}
          </p>

          {/* สเปกบ้าน: ห้องนอน, ห้องน้ำ, ขนาดพื้นที่, ที่จอดรถ */}
          <div className="flex items-center justify-between text-slate-600 py-1.5 px-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs font-bold">
            <span className="inline-flex items-center gap-1">
              <Bed className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{prop.bedrooms}</span>
            </span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="inline-flex items-center gap-1">
              <Bath className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{prop.bathrooms}</span>
            </span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="inline-flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-blue-600 shrink-0" />
              <span>{prop.area} ตร.ม.</span>
            </span>
            {prop.parking && prop.parking > 0 && (
              <>
                <div className="w-px h-3 bg-slate-200" />
                <span className="inline-flex items-center gap-1">
                  <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{prop.parking}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </Link>

      {/* ส่วนแสดงข้อมูลนายหน้าผู้ดูแล (Footer ของการ์ด) */}
      <div className={`px-4 py-3 border-t flex items-center justify-between gap-2 ${
        prop.isPremium ? 'bg-amber-50/40 border-amber-200/50' : 'bg-slate-50/60 border-slate-100'
      }`}>
        {/* รูปโปรไฟล์และชื่อนายหน้า */}
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src={prop.agentImage || getInitialsAvatar(prop.agentName)}
            alt={prop.agentName}
            width={28}
            height={28}
            unoptimized={!prop.agentImage}
            className={`w-7 h-7 rounded-full object-cover shrink-0 shadow-2xs ${
              prop.isPremium ? 'ring-2 ring-amber-400' : 'ring-1 ring-slate-200'
            }`}
          />
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-800 truncate flex items-center gap-1">
              <span className="truncate">{prop.agentName}</span>
              {prop.agentRating && (
                <span className="flex items-center gap-0.5 text-[9px] text-amber-600 font-extrabold bg-amber-50 px-1 rounded shrink-0">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  {Number(prop.agentRating).toFixed(1)}
                </span>
              )}
            </div>
            <div className={`text-[9px] font-semibold uppercase tracking-wider truncate flex items-center gap-1 ${
              prop.isVerifiedPro || prop.isPremium ? 'text-amber-600 font-extrabold' : 'text-slate-400'
            }`}>
              {prop.isVerifiedPro ? (
                <BadgeCheck className="w-2.5 h-2.5 shrink-0" />
              ) : prop.isPremium ? (
                <Crown className="w-2.5 h-2.5 shrink-0" />
              ) : null}
              <span>{prop.isVerifiedPro ? 'Verified PRO' : prop.isPremium ? 'Premium' : 'Agent'}</span>
            </div>
          </div>
        </div>

        {/* ปุ่มลัดนัดชมบ้าน */}
        <Link 
          href={`/book-appointment?propertyId=${prop.id}`}
          className="text-xs font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:border-transparent px-3 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>นัดชม</span>
        </Link>
      </div>
    </div>
  );
}
