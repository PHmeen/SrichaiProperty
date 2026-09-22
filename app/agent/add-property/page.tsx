'use client';

/**
 * ==============================================================================
 * PAGE: /agent/add-property/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * หน้าสำหรับ นายหน้า (Agent) ในการส่งคำขอลงประกาศขาย/เช่าอสังหาริมทรัพย์ใหม่ในระบบ
 * ประกอบด้วย 5 ส่วนสำคัญ (Cards Section) ได้แก่:
 * 
 * 1. ข้อมูลทั่วไป (General Info): หัวข้อประกาศ, ประเภทอสังหาฯ (บ้าน/ทาวน์โฮม/คอนโด), ประเภทลงประกาศ (ขาย/เช่า), รายละเอียด
 * 2. ราคาและรายละเอียดเชิงลึก (Price & Specs): ราคาขาย/เช่า, ค่าส่วนกลาง, ห้องนอน/ห้องน้ำ/ที่จอดรถ/จำนวนชั้น, ขนาดพื้นที่, สิทธิ์ถือครอง
 * 3. ทำเลที่ตั้ง (Location): ระบบเลือกสถานที่แบบสัมพันธ์กัน (Cascading Dropdowns: จังหวัด -> อำเภอ -> ตำบล) และที่อยู่รายละเอียด
 * 4. สื่อประกอบและเอกสารสิทธิ์ (Media & Ownership Doc): ระบบอัปโหลดรูปภาพหลายรูป (ImageUploader) และไฟล์เอกสารโฉนด/เอกสารสิทธิ์ (พร้อมคำเตือน PDPA)
 * 5. ปฏิทินกำหนดวันเวลาเปิดให้เข้าชม (Viewing Schedule Calendar): เลือกวันและช่วงเวลา (รอบเช้า/รอบบ่าย) ที่สะดวกให้นัดชมบ้าน
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/property/ImageUploader';
import { toast } from '@/components/ui/toast';

// ปิด SSR สำหรับแผนที่เสมอ — Leaflet เข้าถึง window/document ตอนโหลดโมดูล
// ถ้าโดน server-render (ซึ่ง Next.js ทำแม้ในหน้า 'use client' รอบแรกด้วย) จะพังทันที
const PropertyLocationMap = dynamic(() => import('@/components/property/PropertyLocationMap'), {
  ssr: false,
  loading: () => <div className="h-44 rounded-2xl bg-slate-100 border flex items-center justify-center text-slate-400 text-xs font-bold">กำลังโหลดแผนที่...</div>
});

// โครงสร้างข้อมูลสล็อตเวลาสำหรับให้นัดชมสถานที่
interface ViewingSlot {
  date: string; // วันที่ในรูปแบบ YYYY-MM-DD
  timeSlot: 'morning' | 'afternoon'; // รอบเช้า (09:00-12:00) หรือ รอบบ่าย (13:00-17:00)
}

// รอบเวลาที่ "บ้านหลังอื่นของนายหน้าคนเดียวกัน" เปิดไว้แล้ว (เปิดซ้อนไม่ได้เพราะไปดูได้ทีละที่)
interface AgentBusySlot {
  date: string;
  timeSlot: string;
  propertyTitle: string; // ชื่อบ้านหลังที่เปิดรอบนี้ไว้ ใช้บอกผู้ใช้ว่าไปชนกับหลังไหน
}

// ชื่อเดือนภาษาไทยสำหรับแสดงผลบนปฏิทิน
const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function AgentAddPropertyPage() {
  const router = useRouter();

  // ----------------------------------------------------------------------------
  // [1] State สำหรับเก็บข้อมูลฟอร์มลงประกาศ (Form State)
  // ----------------------------------------------------------------------------
  const [f, setF] = useState({
    title: '', typeId: '1', listingType: 'ขาย', description: '',
    price: '', commonFee: '', bedrooms: '3', bathrooms: '2', parking: '1', floors: '1',
    landArea: '', usableArea: '', ownership: 'ขายขาด (Freehold)',
    provinceId: '', amphureId: '', districtId: '', address: '',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    doc: '' // URL ของไฟล์เอกสารสิทธิ์ (PDF/Image)
  });

  // ----------------------------------------------------------------------------
  // [2] State สำหรับตัวเลือกสถานที่แบบสัมพันธ์ (Cascading Dropdowns State)
  // ----------------------------------------------------------------------------
  const [provinces, setProvinces] = useState<{ id: number; name_th: string }[]>([]);
  const [amphures, setAmphures] = useState<{ id: number; name_th: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: number; name_th: string }[]>([]);

  // null = ยังไม่เคยแตะแผนที่ ตอนส่งฟอร์มจะให้ backend ใช้ค่า default เดิม (พิกัดหาดใหญ่)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  
  // State ยินยอมข้อตกลง PDPA และเงื่อนไขบริการ
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  
  // State อัปโหลดรูปภาพและไฟล์เอกสาร
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [docFileName, setDocFileName] = useState<string>('');
  const [docUploading, setDocUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // ----------------------------------------------------------------------------
  // [3] State สำหรับปฏิทินเลือกวันเวลาเปิดให้นัดชมบ้าน (Viewing Schedule State)
  // ----------------------------------------------------------------------------
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth()); // 0-11
  const [viewingSlots, setViewingSlots] = useState<ViewingSlot[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [agentBusySlots, setAgentBusySlots] = useState<AgentBusySlot[]>([]);   // รอบที่บ้านหลังอื่น "มีลูกค้าจองจริง"
  const [otherOpenSlots, setOtherOpenSlots] = useState<AgentBusySlot[]>([]);   // รอบที่บ้านหลังอื่น "เปิดวันว่างไว้เฉยๆ" ยังไม่มีใครจอง

  // ----------------------------------------------------------------------------
  // [4] Effect: ดึงรายชื่อจังหวัดทั้งหมดจาก API เมื่อเริ่มต้นหน้าเพจ
  // ----------------------------------------------------------------------------
  useEffect(() => {
    fetch('/api/locations?type=provinces').then(r => r.json()).then(d => Array.isArray(d) && setProvinces(d));
  }, []);

  // ----------------------------------------------------------------------------
  // [4.1] Effect: ดึงรอบเวลาของบ้านหลังอื่นมาแสดงเป็นป้ายเตือน (ไม่บล็อกการเลือก)
  // แยก 2 ระดับ: มีลูกค้าจองจริง (สำคัญ) กับ เปิดวันว่างทับกันไว้เฉยๆ (แค่บอกให้รู้)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    fetch('/api/properties/viewing-slots?agentBusy=1')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        if (Array.isArray(d.busySlots)) setAgentBusySlots(d.busySlots);
        if (Array.isArray(d.otherOpenSlots)) setOtherOpenSlots(d.otherOpenSlots);
      })
      .catch(() => {}); // โหลดไม่ได้ก็ปล่อยผ่าน เป็นแค่ป้ายเตือน ไม่ใช่กฎธุรกิจ
  }, []);

  // ----------------------------------------------------------------------------
  // [5] ฟังก์ชันเมื่อเปลี่ยนจังหวัด -> ดึงรายชื่ออำเภอในจังหวัดนั้น
  // ----------------------------------------------------------------------------
  const handleProvince = (pId: string) => {
    setF(prev => ({ ...prev, provinceId: pId, amphureId: '', districtId: '' }));
    setAmphures([]);
    setDistricts([]); // ล้างตัวเลือกตำบลเดิม
    if (pId) fetch(`/api/locations?type=amphures&provinceId=${pId}`).then(r => r.json()).then(d => Array.isArray(d) && setAmphures(d));
  };

  // ----------------------------------------------------------------------------
  // [6] ฟังก์ชันเมื่อเปลี่ยนอำเภอ -> ดึงรายชื่อตำบลในอำเภอนั้น
  // ----------------------------------------------------------------------------
  const handleAmphure = (aId: string) => {
    setF(prev => ({ ...prev, amphureId: aId, districtId: '' })); // เปลี่ยนอำเภอแล้วต้องล้างตำบลเดิมด้วย ไม่งั้นจะค้างตำบลของอำเภอเก่า
    setDistricts([]);
    if (aId) fetch(`/api/locations?type=districts&amphureId=${aId}`).then(r => r.json()).then(d => Array.isArray(d) && setDistricts(d));
  };

  // ----------------------------------------------------------------------------
  // [7] ฟังก์ชันเลื่อนปฏิทินไปเดือนก่อนหน้า / เดือนถัดไป
  // ----------------------------------------------------------------------------
  const handleCalPrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ดึงรายการสล็อตเวลาของวันที่กำหนด
  const getSlotsForDate = (dateStr: string) => viewingSlots.filter(s => s.date === dateStr);

  // คืนค่าข้อมูลบ้านหลังอื่นที่เปิดรอบนี้ไว้แล้ว (ถ้าไม่ชนจะได้ undefined)
  const getBusySlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') =>
    agentBusySlots.find(s => s.date === dateStr && s.timeSlot === timeSlot);

  // คืนค่าข้อมูลบ้านหลังอื่นที่ "เปิดวันว่างไว้เฉยๆ" ในรอบนี้ (ยังไม่มีใครจอง)
  const getOtherOpenSlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') =>
    otherOpenSlots.find(s => s.date === dateStr && s.timeSlot === timeSlot);

  // นับว่าวันนี้ไปทับกับบ้านหลังอื่นกี่รอบ (นับทั้งที่มีคนจองและที่แค่เปิดไว้) ใช้ทำเส้นประบนปฏิทิน
  const countBusyOnDate = (dateStr: string) =>
    agentBusySlots.filter(s => s.date === dateStr).length +
    otherOpenSlots.filter(s => s.date === dateStr).length;

  // วันนี้มี "นัดที่ลูกค้าจองจริง" กับบ้านหลังอื่นไหม — ใช้แยกสีเหลือง (สำคัญ) ออกจากสีเทา (แค่เปิดทับ)
  const hasRealBookingOnDate = (dateStr: string) =>
    agentBusySlots.some(s => s.date === dateStr);

  // สลับการเลือก / ยกเลิกช่วงเวลา (รอบเช้า/รอบบ่าย) ของวันที่เลือก
  // ไม่บล็อกรอบที่ชนกับบ้านหลังอื่น — นายหน้าเปิดวันเดียวกันได้หลายบ้าน (ดู e07d2ba)
  // ระบบล็อกจริงทำงานตอนลูกค้ากดจองเท่านั้น (hasAgentBookingConflict ใน api/appointments)
  const toggleViewingSlot = (dateStr: string, timeSlot: 'morning' | 'afternoon') => {
    setViewingSlots(prev => {
      const exists = prev.some(s => s.date === dateStr && s.timeSlot === timeSlot);
      if (exists) return prev.filter(s => !(s.date === dateStr && s.timeSlot === timeSlot));
      return [...prev, { date: dateStr, timeSlot }];
    });
  };

  // ----------------------------------------------------------------------------
  // [8] ฟังก์ชันกดส่งฟอร์ม (Form Submission) -> ส่งไปยัง POST /api/properties
  // ----------------------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 8.1 ตรวจสอบข้อมูลบังคับและตัวเลขป้อนเข้า (Validation)
    if (!f.title || !f.price || !f.provinceId || !f.amphureId || !f.districtId) {
      toast.warning('กรุณากรอกข้อมูลสำคัญ (*) ให้ครบถ้วน');
      return;
    }
    if (Number(f.price) <= 0) {
      toast.warning('กรุณากรอกราคาที่มากกว่า 0 บาท');
      return;
    }
    if (f.landArea && Number(f.landArea) < 0) {
      toast.warning('ขนาดที่ดินต้องไม่ติดลบ');
      return;
    }
    if (f.usableArea && Number(f.usableArea) < 0) {
      toast.warning('พื้นที่ใช้สอยต้องไม่ติดลบ');
      return;
    }
    if ([f.bedrooms, f.bathrooms, f.parking, f.floors].some(v => Number(v) < 0)) {
      toast.warning('จำนวนห้อง/ที่จอดรถ/ชั้น ต้องไม่ติดลบ');
      return;
    }
    if (!agreed1 || !agreed2) {
      toast.warning('กรุณากดยินยอมเงื่อนไขการลงประกาศ');
      return;
    }

    setLoading(true);
    // ค้นหาชื่อจังหวัดและอำเภอเพื่อนำมาประกอบข้อความทำเลที่ตั้ง (Location String)
    const prov = provinces.find(p => String(p.id) === String(f.provinceId))?.name_th || '';
    const amp = amphures.find(a => String(a.id) === String(f.amphureId))?.name_th || '';

    try {
      // 8.2 ส่งข้อมูลประกาศใหม่ไปยัง API หลังบ้าน
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.title, type_id: parseInt(f.typeId), price: parseFloat(f.price) || 0,
          listing_type: f.listingType === 'เช่า' ? 'rent' : 'sale',
          location: `${f.address ? f.address + ', ' : ''}${amp}, ${prov}`,
          province_id: parseInt(f.provinceId), amphure_id: parseInt(f.amphureId),
          district_id: f.districtId ? parseInt(f.districtId) : null, // ส่งตำบลที่นายหน้าเลือกจริง (เดิมส่ง districts[0] คือตำบลแรกของอำเภอเสมอ)
          latitude, longitude, // พิกัดจริงที่ปักหมุดไว้ (null = ไม่เคยแตะแผนที่ → backend ใช้ default พิกัดหาดใหญ่แทน)
          description: f.description, bedrooms: parseInt(f.bedrooms), bathrooms: parseInt(f.bathrooms),
          area_sqm: parseFloat(f.usableArea) || parseFloat(f.landArea) || 120,
          
          // เดิมฟอร์มเก็บค่าพวกนี้ไว้ครบ (มี validation ด้วย) แต่ไม่เคยส่งไปกับ payload เลย
          commonFee: f.commonFee || null, parking: f.parking, floors: f.floors, ownership: f.ownership,
          images: uploadedImages.length > 0 ? uploadedImages : [f.image],
          doc: f.doc || null,
          viewingSlots
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('ส่งคำขอลงประกาศเรียบร้อยแล้ว! รอการอนุมัติจากแอดมิน');
        router.push('/agent/home');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการลงประกาศ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-sans text-slate-800 text-xs antialiased flex flex-col">

      {/* Hero Banner Header */}
      <div className="bg-[#090D16] text-white py-8 sm:py-10 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black">ลงประกาศอสังหาริมทรัพย์</h1>
        <p className="text-slate-400 text-[10px] mt-1 max-w-lg mx-auto">เพิ่มข้อมูลอสังหาริมทรัพย์ของคุณเพื่อเปิดรับผู้ซื้อ และลงประกาศในระบบ ตรวจสอบความถูกต้องเพื่อความปลอดภัยของลูกค้าคุณ</p>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6 flex-grow w-full mb-16">
        
        {/* Circle Back Button */}
        <div>
          <Link href="/agent/home" className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition">
            ←
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Card 1: ข้อมูลทั่วไป */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">1</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ข้อมูลทั่วไปของประกาศ</h2>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">หัวข้อประกาศ (Listing Title) <span className="text-red-500">*</span></label>
              <input type="text" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="เช่น ขายด่วน! บ้านเดี่ยวหลังมุม โครงการศิรินทรา หาดใหญ่..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium text-xs" required />
              <p className="text-[9px] text-slate-400 mt-1">แนะนำ 30-80 ตัวอักษร ชัดเจนและดึงดูดสายตาผู้ซื้อ</p>
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
                  <option value="ขาย">ขาย</option>
                  <option value="เช่า">ให้เช่า</option>
                  <option value="ขายดาวน์">ขายดาวน์</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">รายละเอียดแบบเต็ม <span className="text-red-500">*</span></label>
              <textarea rows={4} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="อธิบายสภาพบ้าน การตกแต่ง เครื่องใช้ไฟฟ้า เฟอร์นิเจอร์ หรือสถานที่ใกล้เคียง..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white font-medium text-xs" required />
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
                <input type="number" min="1" step="1" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="฿ 0" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">ค่าส่วนกลาง (บาท / เดือน)</label>
                <input type="number" value={f.commonFee} onChange={e => setF({ ...f, commonFee: e.target.value })} placeholder="฿ 0 (ถ้าไม่มีใส่ 0)" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border text-center">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1"> ห้องนอน</label>
                <input type="number" min="0" value={f.bedrooms} onChange={e => setF({ ...f, bedrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1"> ห้องน้ำ</label>
                <input type="number" min="0" value={f.bathrooms} onChange={e => setF({ ...f, bathrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1"> ที่จอดรถ</label>
                <input type="number" min="0" value={f.parking} onChange={e => setF({ ...f, parking: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1"> จำนวนชั้น</label>
                <input type="number" min="0" value={f.floors} onChange={e => setF({ ...f, floors: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ขนาดที่ดิน (ตร.ว.)</label>
                <input type="number" min="0" value={f.landArea} onChange={e => setF({ ...f, landArea: e.target.value })} placeholder="ระบุตัวเลข" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">พื้นที่ใช้สอย (ตร.ม.)</label>
                <input type="number" min="0" value={f.usableArea} onChange={e => setF({ ...f, usableArea: e.target.value })} placeholder="ระบุตัวเลข" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">สิทธิ์การถือครอง <span className="text-red-500">*</span></label>
                <select value={f.ownership} onChange={e => setF({ ...f, ownership: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="ขายขาด (Freehold)">ขายขาด (Freehold)</option>
                  <option value="เช่าระยะยาว (Leasehold)">เช่าระยะยาว (Leasehold)</option>
                </select>
              </div>
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
                <label className="block font-bold mb-1 text-slate-700">จังหวัด <span className="text-red-500">*</span></label>
                <select value={f.provinceId} onChange={e => handleProvince(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required>
                  <option value="">เลือกจังหวัด</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">อำเภอ / เขต <span className="text-red-500">*</span></label>
                <select value={f.amphureId} onChange={e => handleAmphure(e.target.value)} disabled={!f.provinceId} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required>
                  <option value="">เลือกอำเภอ</option>
                  {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                </select>
              </div>
            </div>

                        {/* เดิมหน้านี้ดึงรายชื่อตำบลมาเก็บไว้เฉยๆ ไม่มีช่องให้เลือก แล้วส่งตำบลแรกของอำเภอไปเสมอ
                ทำให้บ้านทุกหลังในอำเภอเดียวกันถูกบันทึกเป็นตำบลเดียวกันหมด (ข้อมูลผิด) */}
            <div>
              <label className="block font-bold mb-1 text-slate-700">ตำบล / แขวง <span className="text-red-500">*</span></label>
              <select value={f.districtId} onChange={e => setF({ ...f, districtId: e.target.value })} disabled={!f.amphureId} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required>
                <option value="">เลือกตำบล</option>
                {districts.map(d => <option key={d.id} value={d.id}>{d.name_th}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">ที่อยู่/รายละเอียด (หมู่บ้าน, ถนน, ซอย) <span className="text-red-500">*</span></label>
              <input type="text" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="เช่น 123/45 ซ.ปุณณกัณฑ์ 10 ถ.ปุณณกัณฑ์" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" required />
            </div>

                        {/* เดิมเป็น <iframe pointer-events-none> พิกัดตายตัวทุกบ้าน กดปักหมุดไม่ได้จริงเลย */}
            <div className="rounded-2xl border overflow-hidden">
              <PropertyLocationMap
                latitude={latitude}
                longitude={longitude}
                height={176}
                editable
                onChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>คลิกหรือลากหมุดบนแผนที่เพื่อระบุตำแหน่งบ้านจริง (ถ้าไม่เลือก ระบบจะใช้พิกัดกลางหาดใหญ่แทน)</span>
            </p>
          </div>

          {/* Card 4: สื่อประกอบ & เอกสารสิทธิ์ */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">4</span>
              <h2 className="font-extrabold text-slate-900 text-xs">สื่อประกอบและเอกสารสิทธิ์</h2>
            </div>

            <ImageUploader 
              uploadedImages={uploadedImages} 
              setUploadedImages={setUploadedImages} 
            />

            {/* PDPA Warning Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>คำเตือนข้อมูลส่วนบุคคล (PDPA)</span>
              </div>
              <p className="leading-relaxed">เอกสารนี้ใช้สำหรับให้ทีมงานตรวจสอบความถูกต้องเท่านั้น <span className="font-bold underline">จะไม่ถูกแสดงสู่สาธารณะ</span> กรุณาปิดซ่อนเลขบัตรประชาชนในเอกสารก่อนอัปโหลด</p>

              <input
                type="file"
                id="doc-file-input"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setDocUploading(true);
                  const formData = new FormData();
                  formData.append('file', file);
                  try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.success) {
                      setF(prev => ({ ...prev, doc: data.url }));
                      setDocFileName(file.name);
                    } else {
                      toast.error(data.error || 'อัปโหลดเอกสารล้มเหลว');
                    }
                  } catch (err) {
                    console.error(err);
                    toast.error('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร');
                  } finally {
                    setDocUploading(false);
                    e.target.value = '';
                  }
                }}
              />

              {f.doc ? (
                <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
                  {f.doc.toLowerCase().endsWith('.pdf') ? (
                    <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <Image src={f.doc} alt="เอกสารสิทธิ์" width={32} height={32} className="w-8 h-8 rounded object-cover border shrink-0" unoptimized />
                  )}
                  <span className="text-slate-700 font-bold truncate max-w-[140px]">{docFileName || 'เอกสารที่อัปโหลดแล้ว'}</span>
                  <a href={f.doc} target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline ml-auto shrink-0">ดูไฟล์</a>
                  <button
                    type="button"
                    onClick={() => { setF(prev => ({ ...prev, doc: '' })); setDocFileName(''); }}
                    className="text-red-500 font-bold hover:text-red-700 shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>ลบ</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('doc-file-input')?.click()}
                    disabled={docUploading}
                    className="px-2.5 py-1 bg-white border rounded font-bold text-[10px] text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    {docUploading ? 'กำลังอัปโหลด...' : 'Choose File'}
                  </button>
                  <span className="text-slate-500 text-[9px] font-bold">No file chosen</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: วันเวลาที่เปิดให้ลูกค้าเข้าชมบ้านหลังนี้ */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">5</span>
              <h2 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>วันเวลาที่เปิดให้เข้าชมบ้านหลังนี้</span>
              </h2>
            </div>
            <p className="text-[10px] text-slate-500 font-medium -mt-2">
              เลือกวันและช่วงเวลาที่คุณสะดวกให้ลูกค้าจองเข้าชมบ้านหลังนี้ (เลือกได้หลายวัน ไม่บังคับ สามารถกลับมาเพิ่มทีหลังได้)
            </p>

            <div className="border border-slate-200 rounded-2xl p-4">
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
                  const hasSlots = getSlotsForDate(dateStr).length > 0;

                  // busyCount = จำนวนรอบที่บ้านหลังอื่นของเราเปิดไว้ในวันนี้ (0, 1 หรือ 2)
                  // แค่ไว้เตือนเฉยๆ ไม่ได้บล็อกไม่ให้เปิดซ้อน — นายหน้าเปิดวันเดียวกันได้หลายบ้าน
                  // ระบบล็อกจริงจะทำงานตอนมีลูกค้ากดจองรอบใดรอบหนึ่งแล้วเท่านั้น
                  const busyCount = countBusyOnDate(dateStr);
                  const isBusy = busyCount > 0;

                  let dayClass = "w-8 h-8 flex items-center justify-center mx-auto rounded-full transition-all ";
                  if (isPast) dayClass += "text-slate-200 cursor-not-allowed";
                  else if (isSelected) dayClass += "bg-blue-600 text-white shadow-md active:scale-95 cursor-pointer";
                  else if (hasSlots) dayClass += "border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer";
                  else if (isBusy && hasRealBookingOnDate(dateStr)) dayClass += "border border-dashed border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 cursor-pointer";
                  else if (isBusy) dayClass += "border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 cursor-pointer";
                  else dayClass += "text-slate-500 hover:bg-slate-50 cursor-pointer";

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isPast}
                      title={!isBusy ? undefined : hasRealBookingOnDate(dateStr)
                        ? 'วันนี้คุณมีนัดชมบ้านหลังอื่นที่ลูกค้าจองไว้แล้ว เลือกได้ตามปกติ'
                        : 'วันนี้คุณเปิดวันว่างให้บ้านหลังอื่นไว้ด้วย เลือกได้ตามปกติ'}
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
                  <div className="grid grid-cols-2 gap-2">
                    {(['morning', 'afternoon'] as const).map(slot => {
                      const active = getSlotsForDate(selectedCalDate).some(s => s.timeSlot === slot);

                      // แค่เตือนว่าไปชนกับบ้านหลังไหน ไม่ได้ปิดไม่ให้กด — เปิดซ้อนกันได้ตามปกติ
                      const busy = getBusySlot(selectedCalDate, slot);            // มีลูกค้าจองจริง
                      const otherOpen = !busy && getOtherOpenSlot(selectedCalDate, slot); // แค่เปิดทับกันไว้

                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => toggleViewingSlot(selectedCalDate, slot)}
                          className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                            active
                              ? 'border-emerald-400 bg-emerald-50'
                              : busy
                                ? 'border-dashed border-amber-300 bg-amber-50/60 hover:border-amber-500'
                                : 'border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          <p className="text-[11px] font-black text-slate-800">{slot === 'morning' ? 'รอบเช้า' : 'รอบบ่าย'}</p>
                          <p className="text-[9px] text-slate-500 font-bold">{slot === 'morning' ? '09:00 - 12:00' : '13:00 - 17:00'}</p>
                          {/* สถานะการเลือกต้องขึ้นเสมอ แม้รอบนี้จะชนกับบ้านหลังอื่น
                              (ของเดิมโชว์ได้อย่างเดียว พอชนแล้วเลือกไว้ก็ไม่รู้ว่าเลือกติดหรือยัง) */}
                          <p className={`text-[9px] font-black mt-1 flex items-center gap-1 ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {active && (
                              <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span>{active ? 'เลือกไว้แล้ว' : 'ยังไม่ได้เลือก'}</span>
                          </p>
                          {busy && (
                            <p className="text-[9px] font-black mt-1 text-amber-600 leading-tight flex items-center gap-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>ติดนัดที่ &quot;{busy.propertyTitle}&quot; แล้ว</span>
                            </p>
                          )}
                          {otherOpen && (
                            <p className="text-[9px] font-bold mt-1 text-slate-400 leading-tight flex items-center gap-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>เปิดวันว่างให้ &quot;{otherOpen.propertyTitle}&quot; ไว้ด้วย</span>
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* คำอธิบายสีปฏิทินนายหน้า */}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-4 pt-3 border-t border-slate-100 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-emerald-400" /> เปิดว่างไว้</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> เลือกอยู่</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-dashed border-amber-400 bg-amber-50" /> ติดนัดบ้านหลังอื่นแล้ว</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full border border-dashed border-slate-400" /> เปิดวันว่างทับกันไว้</span>
              </div>
            </div>

            {viewingSlots.length > 0 && (
              <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <span>เลือกไว้แล้วทั้งหมด {viewingSlots.length} ช่วงเวลา</span>
              </p>
            )}

            {agentBusySlots.length > 0 && (
              <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed flex items-start gap-1.5">
                <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  วันที่เป็นเส้นประ คือวันที่ไปทับกับ<strong>บ้านหลังอื่นของคุณ</strong> ซึ่งมีได้ 2 แบบ:
                  <strong className="text-amber-700">ติดนัดแล้ว</strong> (มีลูกค้าจองไว้จริง ไปนำชมที่นี่ไม่ได้)
                  หรือ <strong>เปิดวันว่างทับกันไว้</strong> (ยังไม่มีใครจอง)
                  ทั้งสองแบบยังเปิดวันนี้ให้บ้านหลังนี้ได้ตามปกติ ระบบจะกันชนให้เองตอนมีลูกค้ากดจองรอบที่ชนกันจริง
                </span>
              </div>
            )}
          </div>

          {/* Consents & Action Buttons */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2 cursor-pointer text-[10px] text-slate-600">
              <input type="checkbox" checked={agreed1} onChange={e => setAgreed1(e.target.checked)} className="mt-0.5" required />
              <span>ข้าพเจ้ายืนยันว่าข้อมูลและรูปภาพที่ใช้ลงประกาศเป็นความจริงทุกประการ และข้าพเจ้ามีสิทธิ์โดยชอบธรรมในการลงประกาศ</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer text-[10px] text-slate-600">
              <input type="checkbox" checked={agreed2} onChange={e => setAgreed2(e.target.checked)} className="mt-0.5" required />
              <span>ข้าพเจ้ายินยอมให้ Srichai Property ประมวลผลข้อมูลอสังหาริมทรัพย์ตาม <Link href="#" className="text-blue-600 underline">Privacy Policy</Link></span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Link href="/agent/home" className="px-5 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600">ยกเลิก</Link>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 transition shadow-md flex items-center gap-1.5 cursor-pointer">
                <span>{loading ? 'กำลังบันทึก...' : 'ส่งคำขอลงประกาศ'}</span>
                {!loading && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}