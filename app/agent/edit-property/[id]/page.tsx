'use client';

/**
 * page.tsx (Agent Edit Property) - หน้าแก้ไขประกาศอสังหาริมทรัพย์ของนายหน้า
 * โครงหน้าตาต่อยอดมาจาก /agent/add-property แต่เปลี่ยนเป็นโหลดข้อมูลเดิมมาแก้ไข
 * และเพิ่มส่วนจัดการวันว่างเข้าชม (เพิ่ม / ลบ) ของบ้านหลังนี้โดยตรง
 * บันทึกแล้วไม่ต้องรอแอดมินอนุมัติซ้ำ (ไม่แตะฟิลด์ status)
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useParams } from 'next/navigation';
import ImageUploader from '@/components/property/ImageUploader';
import { toast } from '@/components/ui/toast';

// ปิด SSR สำหรับแผนที่เสมอ — Leaflet เข้าถึง window/document ตอนโหลดโมดูล
const PropertyLocationMap = dynamic(() => import('@/components/property/PropertyLocationMap'), {
  ssr: false,
  loading: () => <div className="h-44 rounded-2xl bg-slate-100 border flex items-center justify-center text-slate-400 text-xs font-bold">กำลังโหลดแผนที่...</div>
});

interface ViewingSlot {
  date: string; // YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon';
  isBooked?: boolean; // รอบที่ลูกค้าจองไปแล้ว ลบออกไม่ได้
}

// รอบเวลาที่ "บ้านหลังอื่นของนายหน้าคนเดียวกัน" เปิดไว้แล้ว (ไม่นับบ้านหลังที่กำลังแก้ไขอยู่)
interface AgentBusySlot {
  date: string;
  timeSlot: string;
  propertyTitle: string;
}

const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function AgentEditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = String(params?.id || '');

  // === Form State ===
  const [f, setF] = useState({
    title: '', typeId: '1', listingType: 'sale', description: '',
    price: '', bedrooms: '0', bathrooms: '0',
    usableArea: '',
    
    commonFee: '', parking: '0', floors: '1', ownership: 'ขายขาด (Freehold)',
    provinceId: '', amphureId: '', districtId: '',
    location: ''
  });

  const [provinces, setProvinces] = useState<{ id: number; name_th: string }[]>([]);
  const [amphures, setAmphures] = useState<{ id: number; name_th: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name_th: string }[]>([]);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [propertyStatus, setPropertyStatus] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  const [loadingPage, setLoadingPage] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  // === ปฏิทินวันว่างเข้าชมของบ้านหลังนี้ ===
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-11
  const [viewingSlots, setViewingSlots] = useState<ViewingSlot[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [agentBusySlots, setAgentBusySlots] = useState<AgentBusySlot[]>([]);   // รอบที่บ้านหลังอื่น "มีลูกค้าจองจริง"
  const [otherOpenSlots, setOtherOpenSlots] = useState<AgentBusySlot[]>([]);   // รอบที่บ้านหลังอื่น "เปิดวันว่างไว้เฉยๆ" ยังไม่มีใครจอง

  // โหลดรายชื่อจังหวัดทั้งหมด
  useEffect(() => {
    fetch('/api/locations?type=provinces')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setProvinces(d))
      .catch(err => console.error(err));
  }, []);

  // ดึงรอบเวลาที่บ้าน "หลังอื่น" ของเราเปิดไว้ (ส่ง excludePropertyId เพื่อไม่ให้นับรอบของบ้านหลังนี้เองว่าชน)
  useEffect(() => {
    if (!propertyId) return;
    fetch(`/api/properties/viewing-slots?agentBusy=1&excludePropertyId=${propertyId}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        if (Array.isArray(d.busySlots)) setAgentBusySlots(d.busySlots);
        if (Array.isArray(d.otherOpenSlots)) setOtherOpenSlots(d.otherOpenSlots);
      })
      .catch(() => {}); // โหลดไม่ได้ก็ปล่อยผ่าน เป็นแค่ป้ายเตือน ไม่ใช่กฎธุรกิจ
  }, [propertyId]);

  // โหลดข้อมูลบ้านหลังนี้ + วันว่างเดิม
  useEffect(() => {
    if (!propertyId) return;
    let active = true;
    const fetchProperty = async () => {
      try {
        const res = await fetch(`/api/properties/${propertyId}`);
        const data = await res.json();

        if (!active) return;
        if (!res.ok || !data.success) {
          setLoadError(data.error || 'ไม่สามารถโหลดข้อมูลประกาศได้');
          return;
        }

        const p = data.property;

        setF({
          title: p.title || '',
          typeId: String(p.type_id || '1'),
          listingType: p.listing_type === 'rent' ? 'rent' : 'sale',
          description: p.description || '',
          price: p.price !== null && p.price !== undefined ? String(p.price) : '',
          bedrooms: String(p.bedrooms ?? 0),
          bathrooms: String(p.bathrooms ?? 0),
          usableArea: p.area_sqm ? String(p.area_sqm) : '',
          commonFee: p.commonFee !== null && p.commonFee !== undefined ? String(p.commonFee) : '',
          parking: p.parking !== null && p.parking !== undefined ? String(p.parking) : '0',
          floors: p.floors !== null && p.floors !== undefined ? String(p.floors) : '1',
          ownership: p.ownership || 'ขายขาด (Freehold)',
          provinceId: p.province_id ? String(p.province_id) : '',
          amphureId: p.amphure_id ? String(p.amphure_id) : '',
          districtId: p.district_id ? String(p.district_id) : '',
          location: p.location || ''
        });
        setLatitude(typeof p.latitude === 'number' ? p.latitude : null);
        setLongitude(typeof p.longitude === 'number' ? p.longitude : null);

        setPropertyStatus(p.status || '');
        setRejectReason(p.rejectReason || '');
        setUploadedImages(Array.isArray(p.images) ? p.images : []);

        const loadedSlots: ViewingSlot[] = Array.isArray(data.slots)
          ? data.slots.map((s: { date: string; timeSlot: string; isBooked: boolean }) => ({
              date: s.date,
              timeSlot: s.timeSlot === 'afternoon' ? 'afternoon' : 'morning',
              isBooked: Boolean(s.isBooked)
            }))
          : [];
        setViewingSlots(loadedSlots);

        // โหลดอำเภอ/ตำบล ตามค่าที่บันทึกไว้เดิม เพื่อให้ dropdown แสดงค่าถูกต้อง
        if (p.province_id) {
          const ampRes = await fetch(`/api/locations?type=amphures&provinceId=${p.province_id}`);
          const ampData = await ampRes.json();
          if (active && Array.isArray(ampData)) setAmphures(ampData);
        }
        if (p.amphure_id) {
          const disRes = await fetch(`/api/locations?type=districts&amphureId=${p.amphure_id}`);
          const disData = await disRes.json();
          if (active && Array.isArray(disData)) setDistricts(disData);
        }
      } catch {
        if (active) setLoadError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      } finally {
        if (active) setLoadingPage(false);
      }
    };

    fetchProperty();
    return () => { active = false; };
  }, [propertyId]);

  const handleProvince = (pId: string) => {
    setF(prev => ({ ...prev, provinceId: pId, amphureId: '', districtId: '' }));
    setAmphures([]);
    setDistricts([]);
    if (pId) {
      fetch(`/api/locations?type=amphures&provinceId=${pId}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) && setAmphures(d))
        .catch(err => console.error(err));
    }
  };

  const handleAmphure = (aId: string) => {
    setF(prev => ({ ...prev, amphureId: aId, districtId: '' }));
    setDistricts([]);
    if (aId) {
      fetch(`/api/locations?type=districts&amphureId=${aId}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) && setDistricts(d))
        .catch(err => console.error(err));
    }
  };

  const handleCalPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const getSlotsForDate = (dateStr: string) => viewingSlots.filter(s => s.date === dateStr);

  // คืนค่าข้อมูลบ้านหลังอื่นที่เปิดรอบนี้ไว้แล้ว (ถ้าไม่ชนจะได้ undefined)
  const getBusySlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') =>
    agentBusySlots.find(s => s.date === dateStr && s.timeSlot === timeSlot);

  // คืนค่าข้อมูลบ้านหลังอื่นที่ "เปิดวันว่างไว้เฉยๆ" ในรอบนี้ (ยังไม่มีใครจอง)
  const getOtherOpenSlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') =>
    otherOpenSlots.find(s => s.date === dateStr && s.timeSlot === timeSlot);

  // นับว่าวันนี้ถูกบ้านหลังอื่นจองไปกี่รอบแล้ว (2 = เต็มทั้งเช้าและบ่าย → กดวันนี้ไม่ได้เลย)
  const countBusyOnDate = (dateStr: string) =>
    agentBusySlots.filter(s => s.date === dateStr).length +
    otherOpenSlots.filter(s => s.date === dateStr).length;

  // วันนี้มี "นัดที่ลูกค้าจองจริง" กับบ้านหลังอื่นไหม — ใช้แยกสีเหลือง (สำคัญ) ออกจากสีเทา (แค่เปิดทับ)
  const hasRealBookingOnDate = (dateStr: string) =>
    agentBusySlots.some(s => s.date === dateStr);

  const toggleViewingSlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') => {
    const target = viewingSlots.find(s => s.date === dateStr && s.timeSlot === timeSlot);

    if (target?.isBooked) {
      toast.warning('รอบนี้มีลูกค้าจองเข้าชมไว้แล้ว ไม่สามารถปิดรอบได้');
      return;
    }

    setViewingSlots(prev => {
      const exists = prev.some(s => s.date === dateStr && s.timeSlot === timeSlot);
      if (exists) return prev.filter(s => !(s.date === dateStr && s.timeSlot === timeSlot));
      return [...prev, { date: dateStr, timeSlot, isBooked: false }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.price || !f.location) {
      toast.warning('กรุณากรอกข้อมูลสำคัญ (*) ให้ครบถ้วน');
      return;
    }
    if (Number(f.price) <= 0) {
      toast.warning('กรุณากรอกราคาที่มากกว่า 0 บาท');
      return;
    }
    if (f.usableArea && Number(f.usableArea) < 0) {
      toast.warning('พื้นที่ต้องไม่ติดลบ');
      return;
    }
    if (Number(f.bedrooms) < 0 || Number(f.bathrooms) < 0) {
      toast.warning('จำนวนห้องต้องไม่ติดลบ');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.title,
          type_id: parseInt(f.typeId),
          listing_type: f.listingType,
          price: parseFloat(f.price) || 0,
          description: f.description,
          bedrooms: parseInt(f.bedrooms) || 0,
          bathrooms: parseInt(f.bathrooms) || 0,
          area_sqm: parseFloat(f.usableArea) || 0,
          location: f.location,
          province_id: f.provinceId ? parseInt(f.provinceId) : null,
          amphure_id: f.amphureId ? parseInt(f.amphureId) : null,
          district_id: f.districtId ? parseInt(f.districtId) : null,
          
          commonFee: f.commonFee || null, parking: f.parking, floors: f.floors, ownership: f.ownership,
          latitude, longitude, // พิกัดที่ปักหมุดไว้ (null ถ้าบ้านนี้ยังไม่เคยมีพิกัด และนายหน้าไม่ได้แตะแผนที่)
          images: uploadedImages,
          viewingSlots: viewingSlots.map(s => ({ date: s.date, timeSlot: s.timeSlot }))
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('บันทึกการแก้ไขประกาศเรียบร้อยแล้ว');
        router.push('/agent/dashboard');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  // --- หน้าจอกำลังโหลด ---
  if (loadingPage) {
    return (
      <div className="pt-6 sm:pt-8 min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // --- หน้าจอโหลดไม่สำเร็จ / ไม่มีสิทธิ์ ---
  if (loadError) {
    return (
      <div className="pt-6 sm:pt-8 min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4 text-center">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl">!</div>
        <p className="font-extrabold text-slate-800 text-sm">{loadError}</p>
        <Link href="/agent/dashboard" className="px-5 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl text-xs">
          กลับไปหน้าจัดการบ้านของฉัน
        </Link>
      </div>
    );
  }

  const bookedCount = viewingSlots.filter(s => s.isBooked).length;

  return (
    <div className="font-sans text-slate-800 text-xs antialiased flex flex-col">

      {/* Hero Banner Header */}
      <div className="bg-[#090D16] text-white py-8 sm:py-10 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black">แก้ไขประกาศอสังหาริมทรัพย์</h1>
        <p className="text-slate-400 text-[10px] mt-1">
          แก้ไขรายละเอียดบ้าน รูปภาพ และวันเวลาที่เปิดให้ลูกค้าเข้าชมได้ทันที โดยไม่ต้องรอแอดมินอนุมัติใหม่
        </p>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6 flex-grow w-full mb-16">

        {/* Circle Back Button + สถานะประกาศ */}
        <div className="flex items-center justify-between">
          <Link href="/agent/dashboard" className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition">
            ←
          </Link>
          {propertyStatus && (
            <span className={`text-[10px] font-black px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              propertyStatus === 'approved' || propertyStatus === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : propertyStatus === 'rejected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                propertyStatus === 'approved' || propertyStatus === 'active'
                  ? 'bg-emerald-500'
                  : propertyStatus === 'rejected'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
              }`} />
              สถานะประกาศ: {propertyStatus === 'approved' || propertyStatus === 'active' ? 'อนุมัติแล้ว' : propertyStatus === 'rejected' ? 'ถูกตีกลับ' : 'รอตรวจสอบ'}
            </span>
          )}
        </div>

        {/* กล่องแจ้งเหตุผลที่ถูกตีกลับ + คำแนะนำให้แก้ไขแล้วส่งใหม่ */}
        {propertyStatus === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1.5">
            <p className="text-xs font-black text-red-700 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              เหตุผลที่ผู้ดูแลระบบส่งกลับมาแก้ไข
            </p>
            <p className="text-xs text-red-600 font-medium">{rejectReason || 'ไม่ได้ระบุเหตุผลเพิ่มเติม'}</p>
            <p className="text-[11px] text-red-500 font-bold pt-1 border-t border-red-100 mt-2">
              แก้ไขข้อมูลด้านล่างให้ถูกต้องตามคำแนะนำ แล้วกด &quot;บันทึกการแก้ไข&quot; ระบบจะส่งประกาศนี้กลับเข้าคิวตรวจสอบใหม่ให้อัตโนมัติ
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Card 1: ข้อมูลทั่วไป */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">1</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ข้อมูลทั่วไปของประกาศ</h2>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">หัวข้อประกาศ (Listing Title) <span className="text-red-500">*</span></label>
              <input type="text" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium text-xs" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ประเภทอสังหาฯ <span className="text-red-500">*</span></label>
                <select value={f.typeId} onChange={e => setF({ ...f, typeId: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="1">บ้านเดี่ยว</option>
                  <option value="2">ทาวน์โฮม</option>
                  <option value="3">คอนโดมิเนียม</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">ประเภทการลงประกาศ <span className="text-red-500">*</span></label>
                <select value={f.listingType} onChange={e => setF({ ...f, listingType: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="sale">ขาย</option>
                  <option value="rent">ให้เช่า</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">รายละเอียดแบบเต็ม <span className="text-red-500">*</span></label>
              <textarea rows={4} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white font-medium text-xs" required />
            </div>
          </div>

          {/* Card 2: ราคา & สเปค */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">2</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ราคาและรายละเอียดเชิงลึก</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ราคา (บาท) <span className="text-red-500">*</span></label>
                <input type="number" min="1" step="1" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required />
              </div>
              {/* ฟิลด์สเปคเพิ่มเติม */}
              <div>
                <label className="block font-bold mb-1 text-slate-700">ค่าส่วนกลาง (บาท / เดือน)</label>
                <input type="number" min="0" value={f.commonFee} onChange={e => setF({ ...f, commonFee: e.target.value })} placeholder="฿ 0 (ถ้าไม่มีใส่ 0)" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 bg-slate-50 p-3 rounded-xl border text-center">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">ห้องนอน</label>
                <input type="number" min="0" value={f.bedrooms} onChange={e => setF({ ...f, bedrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">ห้องน้ำ</label>
                <input type="number" min="0" value={f.bathrooms} onChange={e => setF({ ...f, bathrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">ที่จอดรถ</label>
                <input type="number" min="0" value={f.parking} onChange={e => setF({ ...f, parking: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">จำนวนชั้น</label>
                <input type="number" min="0" value={f.floors} onChange={e => setF({ ...f, floors: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-bold text-slate-500 mb-1">พื้นที่ใช้สอย (ตร.ม.)</label>
                <input type="number" min="0" value={f.usableArea} onChange={e => setF({ ...f, usableArea: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">สิทธิ์การถือครอง</label>
              <select value={f.ownership} onChange={e => setF({ ...f, ownership: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                <option value="ขายขาด (Freehold)">ขายขาด (Freehold)</option>
                <option value="เช่าระยะยาว (Leasehold)">เช่าระยะยาว (Leasehold)</option>
              </select>
            </div>
          </div>

          {/* Card 3: ทำเลที่ตั้ง */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">3</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ทำเลที่ตั้ง</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">จังหวัด</label>
                <select value={f.provinceId} onChange={e => handleProvince(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="">เลือกจังหวัด</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">อำเภอ / เขต</label>
                <select value={f.amphureId} onChange={e => handleAmphure(e.target.value)} disabled={!f.provinceId} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="">เลือกอำเภอ</option>
                  {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">ตำบล / แขวง</label>
              <select value={f.districtId} onChange={e => setF({ ...f, districtId: e.target.value })} disabled={!f.amphureId} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                <option value="">เลือกตำบล</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name_th}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">ที่อยู่ที่แสดงบนประกาศ <span className="text-red-500">*</span></label>
              <input type="text" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="เช่น 123/45 ซ.ปุณณกัณฑ์ 10, หาดใหญ่, สงขลา" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" required />
              <p className="text-[9px] text-slate-400 mt-1">ข้อความนี้คือที่อยู่ที่ลูกค้าจะเห็นบนหน้าประกาศ แก้ให้สอดคล้องกับจังหวัด/อำเภอที่เลือกด้วย</p>
            </div>

            {/* แผนที่ปักหมุดจริงตอนแก้ไขประกาศ */}
            <div>
              <label className="block font-bold mb-1 text-slate-700">ตำแหน่งบนแผนที่</label>
              <div className="rounded-2xl border overflow-hidden">
                <PropertyLocationMap
                  latitude={latitude}
                  longitude={longitude}
                  height={176}
                  editable
                  onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-1">คลิกหรือลากหมุดเพื่อแก้ตำแหน่งบ้านให้ตรงจริง</p>
            </div>
          </div>

          {/* Card 4: รูปภาพประกาศ */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">4</span>
              <h2 className="font-extrabold text-slate-900 text-xs">รูปภาพประกอบประกาศ</h2>
            </div>

            <ImageUploader
              uploadedImages={uploadedImages}
              setUploadedImages={setUploadedImages}
            />

            <p className="text-[9px] text-slate-400">รูปแรกสุดจะถูกใช้เป็นรูปหน้าปกของประกาศ คลิกที่รูปเพื่อจัดการหรือลบออก</p>
          </div>

          {/* Card 5: จัดการวันว่างเข้าชม */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">5</span>
              <h2 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                จัดการวันเวลาที่เปิดให้เข้าชมบ้านหลังนี้
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 font-medium -mt-2">
              กดวันบนปฏิทินเพื่อเปิด/ปิดรอบเช้า-รอบบ่าย รอบที่ลูกค้าจองไปแล้วจะถูกล็อกไว้ ปิดไม่ได้
            </p>

            <div className="border border-slate-200 rounded-2xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <button type="button" onClick={handleCalPrevMonth} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">&lt;</button>
                <span className="text-xs font-black text-slate-800">{MONTH_NAMES_TH[calMonth]} {calYear + 543}</span>
                <button type="button" onClick={handleCalNextMonth} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1 cursor-pointer">&gt;</button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black pb-2 mb-2 border-b border-slate-100">
                <span className="text-red-500">อา</span>
                <span className="text-slate-400">จ</span>
                <span className="text-slate-400">อ</span>
                <span className="text-slate-400">พ</span>
                <span className="text-slate-400">พฤ</span>
                <span className="text-slate-400">ศ</span>
                <span className="text-blue-500">ส</span>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
                {Array.from({ length: new Date(calYear, calMonth, 1).getDay() }).map((_, idx) => (
                  <div key={`cal-empty-${idx}`} className="w-8 h-8"></div>
                ))}

                {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedCalDate === dateStr;

                  const cellDate = new Date(calYear, calMonth, dayNum);
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const isPast = cellDate < todayStart;

                  const daySlots = getSlotsForDate(dateStr);
                  const hasSlots = daySlots.length > 0;
                  const hasBooked = daySlots.some(s => s.isBooked);

                  // busyCount = จำนวนรอบที่บ้านหลังอื่นของเราเปิดไว้ในวันนี้ (0, 1 หรือ 2)
                  // แค่ไว้เตือนเฉยๆ ไม่ได้บล็อกไม่ให้เปิดซ้อน — นายหน้าเปิดวันเดียวกันได้หลายบ้าน
                  // ระบบล็อกจริงจะทำงานตอนมีลูกค้ากดจองรอบใดรอบหนึ่งแล้วเท่านั้น
                  const busyCount = countBusyOnDate(dateStr);
                  const isBusy = busyCount > 0 && !hasSlots;

                  let dayClass = "w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ";
                  if (isPast) dayClass += "text-slate-200 cursor-not-allowed";
                  else if (isSelected) dayClass += "bg-blue-600 text-white shadow-md active:scale-95 cursor-pointer";
                  else if (hasBooked) dayClass += "border border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer";
                  else if (hasSlots) dayClass += "border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer";
                  else if (isBusy && hasRealBookingOnDate(dateStr)) dayClass += "border border-dashed border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer";
                  else if (isBusy) dayClass += "border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 cursor-pointer";
                  else dayClass += "text-slate-500 hover:bg-slate-50 cursor-pointer";

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isPast}
                      title={isBusy ? 'คุณมีนัดชมบ้านหลังอื่นในวันนี้แล้ว เลือกได้ตามปกติ' : undefined}
                      onClick={() => setSelectedCalDate(dateStr)}
                      className={dayClass}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {selectedCalDate && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-700 mb-2">ช่วงเวลาสำหรับวันที่ {selectedCalDate}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['morning', 'afternoon'] as const).map(slot => {
                      const found = getSlotsForDate(selectedCalDate).find(s => s.timeSlot === slot);
                      const active = Boolean(found);
                      const booked = Boolean(found?.isBooked);

                      // แค่เตือนว่าไปชนกับบ้านหลังไหน ไม่ได้ปิดไม่ให้กด — เปิดซ้อนกันได้ตามปกติ
                      // (ไม่นับรอบที่บ้านหลังนี้เปิดไว้อยู่แล้ว เพราะ API กรอง excludePropertyId ให้ตั้งแต่ตอนดึงข้อมูล)
                      const busy = active ? undefined : getBusySlot(selectedCalDate, slot);            // มีลูกค้าจองจริง
                      const otherOpen = active || busy ? undefined : getOtherOpenSlot(selectedCalDate, slot); // แค่เปิดทับกันไว้

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleViewingSlot(selectedCalDate, slot)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            booked
                              ? 'border-amber-400 bg-amber-50'
                              : active
                                ? 'border-emerald-400 bg-emerald-50'
                                : busy
                                  ? 'border-dashed border-amber-300 bg-amber-50/60 hover:border-amber-500'
                                  : 'border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          <p className="text-[11px] font-black text-slate-800">{slot === 'morning' ? 'รอบเช้า' : 'รอบบ่าย'}</p>
                          <p className="text-[9px] text-slate-500 font-bold">{slot === 'morning' ? '09:00 - 12:00' : '13:00 - 17:00'}</p>
                          {busy ? (
                            <p className="text-[9px] font-black mt-1 text-amber-600 leading-tight">
                              ติดนัดที่ &quot;{busy.propertyTitle}&quot; แล้ว
                            </p>
                          ) : otherOpen ? (
                            <p className="text-[9px] font-bold mt-1 text-slate-400 leading-tight">
                              เปิดวันว่างให้ &quot;{otherOpen.propertyTitle}&quot; ไว้ด้วย
                            </p>
                          ) : (
                            <p className={`text-[9px] font-black mt-1 flex items-center gap-1 ${booked ? 'text-amber-600' : active ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {booked && (
                                <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                              {active && !booked && (
                                <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              <span>{booked ? 'มีลูกค้าจองแล้ว' : active ? 'เปิดรับจองอยู่' : 'ยังไม่ได้เปิด'}</span>
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* แถบคำอธิบายสีปฏิทินนายหน้า */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-emerald-400 bg-emerald-100" /> เปิดรับจองอยู่</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-amber-400 bg-amber-100" /> มีลูกค้าจองแล้ว</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> เลือกอยู่</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-dashed border-amber-400 bg-amber-50" /> ติดนัดบ้านหลังอื่นแล้ว</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-dashed border-slate-400" /> เปิดวันว่างทับกันไว้</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] font-bold">
              <span className="text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                เปิดรับจองอยู่ {viewingSlots.length - bookedCount} ช่วงเวลา
              </span>
              <span className="text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                ถูกจองแล้ว {bookedCount} ช่วงเวลา
              </span>
            </div>

            {(agentBusySlots.length > 0 || otherOpenSlots.length > 0) && (
              <p className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                วันที่เป็นเส้นประ คือวันที่ไปทับกับ<strong>บ้านหลังอื่นของคุณ</strong> ซึ่งมีได้ 2 แบบ:
                <strong className="text-amber-700">ติดนัดแล้ว</strong> (มีลูกค้าจองไว้จริง ไปนำชมที่นี่ไม่ได้)
                หรือ <strong>เปิดวันว่างทับกันไว้</strong> (ยังไม่มีใครจอง)
                ทั้งสองแบบยังเปิดวันนี้ให้บ้านหลังนี้ได้ตามปกติ ระบบจะกันชนให้เองตอนมีลูกค้ากดจองรอบที่ชนกันจริง
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/agent/dashboard" className="px-5 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600 hover:bg-slate-200 transition">ยกเลิก</Link>
            <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 transition shadow-md disabled:opacity-60 flex items-center gap-2">
              {saving ? 'กำลังบันทึก...' : (
                <>
                  <span>บันทึกการแก้ไข</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}