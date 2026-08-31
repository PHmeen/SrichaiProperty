'use client';

/**
 * ==============================================================================
 * หน้าจัดการตรวจสอบอนุมัติประกาศอสังหาริมทรัพย์สำหรับแอดมิน (Admin Moderation Page)
 * /app/admin/(dashboard)/moderation/page.tsx
 * ==============================================================================
 * หน้าที่หลัก:
 * 1. ดึงรายการประกาศบ้าน/คอนโดจาก API `/api/admin/moderation` แยกตามแท็บสถานะ (รอตรวจสอบ, อนุมัติแล้ว, ปฏิเสธ)
 * 2. กรองประกาศตามประเภทธุรกรรม (ขาย / เช่า / ทั้งหมด)
 * 3. ดำเนินการอนุมัติประกาศ (`handleApprove`) หรือ ปฏิเสธประกาศพร้อมระบุเหตุผลผ่าน Pop-up Modal (`openRejectModal`)
 * 4. รองรับการดูตัวอย่างรูปภาพประกาศย่อและแสดงสถิติ SLA
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

/** โครงสร้างข้อมูลประกาศอสังหาริมทรัพย์สำหรับแอดมินตรวจสอบ */
interface PropertyData {
  id: string;                    // รหัสอสังหาฯ ในฐานข้อมูล (UUID)
  title: string;                 // ชื่อหัวข้อประกาศ
  price: string;                 // ราคาขายหรือค่าเช่า (บาท)
  listingType: 'sale' | 'rent';  // ประเภทประกาศ (ขาย = sale, เช่า = rent)
  type: string;                  // ประเภทอสังหาฯ (เช่น บ้านเดี่ยว, คอนโด, ทาวน์เฮาส์)
  location: string;              // ทำเล / ที่ตั้ง (ตำบล, อำเภอ, จังหวัด)
  province?: string;             // จังหวัด
  amphure?: string;              // อำเภอ/เขต
  bedrooms: number;              // จำนวนห้องนอน
  bathrooms: number;             // จำนวนห้องน้ำ
  area: string;                  // ขนาดพื้นที่ (ตารางวา / ตารางเมตร)
  agentName: string;             // ชื่อผู้ลงประกาศ / นายหน้า
  agentPlan: string;             // แพ็กเกจสมาชิกของนายหน้า (Standard, PRO, VIP)
  createdAt: string;             // วันเวลาที่ลงประกาศ
  image: string | null;          // URL รูปภาพหน้าปกหลัก
  images?: string[];             // อาร์เรย์รูปภาพเพิ่มเติมทั้งหมด
  imageCount: number;            // จำนวนรูปภาพทั้งหมดที่มีในประกาศ
}

export default function AdminModerationPage() {
  // ------------------------------------------------------------------------------
  // 1. STATE MANAGEMENT (สภาวะข้อมูลในระบบ)
  // ------------------------------------------------------------------------------
  
  // สภาวะเก็บรายการประกาศที่ดึงมาจาก API หลังบ้าน
  const [properties, setProperties] = useState<PropertyData[]>([]);
  // สภาวะสถานะกำลังโหลดข้อมูล (Spinner)
  const [loading, setLoading] = useState(true);
  // สภาวะแท็บสถานะประกาศที่เลือกอยู่ ('pending' = รอตรวจสอบ, 'approved' = อนุมัติแล้ว, 'rejected' = ถูกปฏิเสธ)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  // สภาวะตัวกรองประเภทการขาย/เช่า ('all' = ทั้งหมด, 'sale' = ขาย, 'rent' = เช่า)
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');

  // ------------------------------------------------------------------------------
  // 2. API FETCHING & HANDLERS (ฟังก์ชันการเชื่อมต่อ API และจัดการอีเวนต์)
  // ------------------------------------------------------------------------------

  /** ฟังก์ชันดึงรายการประกาศจากเซิร์ฟเวอร์หลังบ้านตามสถานะและตัวกรองประเภท */
  const fetchProperties = (status: string, listingType: string) => {
    const query = listingType === 'all' ? '' : `&listingType=${listingType}`;
    fetch(`/api/admin/moderation?status=${status}${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProperties(data.properties);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("เกิดข้อผิดพลาดในการโหลดคิวประกาศ:", err);
        setLoading(false);
      });
  };

  // เรียกดึงข้อมูลใหม่ทุกครั้งที่ผู้ใช้เปลี่ยนแท็บสถานะหรือเปลี่ยนตัวกรองประเภท
  useEffect(() => {
    fetchProperties(activeTab, listingTypeFilter);
  }, [activeTab, listingTypeFilter]);

  /** ฟังก์ชันยิง API อัปเดตสถานะประกาศ (อนุมัติ หรือ ปฏิเสธพร้อมเหตุผล) */
  const updateStatus = async (id: string, newStatus: string, reason?: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, ...(reason ? { reason } : {}) })
      });
      const data = await res.json();
      if (data.success) {
        alert("อัปเดตสถานะประกาศเรียบร้อยแล้ว");
        fetchProperties(activeTab, listingTypeFilter);
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ:", err);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  /** ฟังก์ชันกดอนุมัติประกาศ (Approve) */
  const handleApprove = async (id: string) => {
    if (!confirm('ยืนยันการอนุมัติประกาศนี้เพื่อขึ้นแสดงผลบนเว็บไซต์?')) return;
    await updateStatus(id, 'approved');
  };

  // ------------------------------------------------------------------------------
  // 3. REJECT MODAL STATE & LOGIC (ระบบป๊อบอัปปฏิเสธประกาศพร้อมระบุเหตุผล)
  // ------------------------------------------------------------------------------
  
  // สภาวะเก็บข้อมูลประกาศที่กำลังถูกเลือกเพื่อปฏิเสธ (ถ้าเป็น null คือปิด Modal)
  const [rejectingProperty, setRejectingProperty] = useState<PropertyData | null>(null);
  // สภาวะเก็บตัวเลือกเหตุผลในการปฏิเสธที่แอดมินเลือก
  const [rejectReasonOption, setRejectReasonOption] = useState<string>('ข้อมูล/รูปภาพไม่ครบถ้วนหรือไม่ชัดเจน');
  // สภาวะเก็บข้อความเหตุผลเพิ่มเติมกรณีเลือก 'อื่นๆ'
  const [customRejectReason, setCustomRejectReason] = useState<string>('');
  // สภาวะกำลังกดส่งการปฏิเสธ
  const [submittingReject, setSubmittingReject] = useState(false);

  /** เปิด Modal ปฏิเสธประกาศ */
  const openRejectModal = (property: PropertyData) => {
    setRejectingProperty(property);
    setRejectReasonOption('ข้อมูล/รูปภาพไม่ครบถ้วนหรือไม่ชัดเจน');
    setCustomRejectReason('');
  };

  /** ปิด Modal ปฏิเสธประกาศ */
  const closeRejectModal = () => {
    setRejectingProperty(null);
    setCustomRejectReason('');
  };

  /** ยืนยันการปฏิเสธประกาศและส่งเหตุผลไปยังหลังบ้าน */
  const confirmReject = async () => {
    if (!rejectingProperty) return;
    const finalReason = rejectReasonOption === 'อื่นๆ' ? customRejectReason.trim() : rejectReasonOption;
    if (rejectReasonOption === 'อื่นๆ' && !finalReason) {
      alert('กรุณาระบุเหตุผลการปฏิเสธในช่องข้อความ');
      return;
    }

    setSubmittingReject(true);
    await updateStatus(rejectingProperty.id, 'rejected', finalReason);
    setSubmittingReject(false);
    closeRejectModal();
  };

  // ------------------------------------------------------------------------------
  // 4. JSX STRUCTURE (โครงสร้างการแสดงผล UI)
  // ------------------------------------------------------------------------------
  return (
    <>
        {/* Header แถบด้านบนแสดงชื่อหน้าและช่องค้นหาด่วน */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
          <h2 className="text-lg font-extrabold text-slate-800">คิวตรวจสอบประกาศ (Listing Moderation)</h2>
          <div className="relative w-72">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
            <input type="text" placeholder="ค้นหารหัส PRJ-XXX, ชื่อประกาศ..." className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700" />
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* ส่วนที่ 1: แถบเลือกสถานะ (Tabs) และตัวกรองประเภทการขาย/เช่า */}
          <div className="flex items-center justify-between mb-6">
            {/* แท็บสลับสถานะ: รอตรวจสอบ / อนุมัติแล้ว / ถูกระงับหรือปฏิเสธ */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
              <button 
                onClick={() => { setActiveTab('pending'); setLoading(true); }} 
                className={`px-5 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                รอตรวจสอบ {activeTab === 'pending' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px]">ใหม่</span>}
              </button>
              <button 
                onClick={() => { setActiveTab('approved'); setLoading(true); }} 
                className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'approved' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                อนุมัติแล้ว
              </button>
              <button 
                onClick={() => { setActiveTab('rejected'); setLoading(true); }} 
                className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'rejected' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
              >
                ถูกระงับ/ปฏิเสธ
              </button>
            </div>
            
            {/* ตัวเลือกกรองเฉพาะขาย/เช่า และปุ่มจัดเรียง SLA */}
            <div className="flex items-center gap-3">
              <select
                value={listingTypeFilter}
                onChange={(e) => { setListingTypeFilter(e.target.value as 'all' | 'sale' | 'rent'); setLoading(true); }}
                className="bg-white border border-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg text-xs hover:bg-slate-50 transition shadow-sm cursor-pointer outline-none"
              >
                <option value="all">ขาย/เช่าทั้งหมด</option>
                <option value="sale">เฉพาะขาย</option>
                <option value="rent">เฉพาะเช่า</option>
              </select>
              <button className="bg-white border border-slate-200 text-slate-600 font-bold py-2 px-4 rounded-lg text-xs hover:bg-slate-50 transition shadow-sm">เรียงตาม SLA (ด่วนสุด)</button>
            </div>
          </div>

          {/* ส่วนที่ 2: แสดงผลรายการประกาศตามสถานะ */}
          {loading ? (
             // แสดงไอคอนกำลังหมุนเมื่อดึงข้อมูล
             <div className="flex flex-col items-center justify-center py-20">
               <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-slate-500 font-bold">กำลังโหลดคิวประกาศ...</p>
             </div>
          ) : properties.length === 0 ? (
            // แสดงกล่องว่างเปล่ากรณีไม่มีข้อมูลในสถานะนั้นๆ
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">🏠</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายการประกาศ</h3>
              <p className="text-slate-500 font-medium">ไม่มีประกาศในสถานะที่คุณเลือก</p>
            </div>
          ) : (
            // แสดงรายการประกาศในคิวแบบการ์ด
            <div className="space-y-5">
              {properties.map((property) => (
                <div key={property.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  {/* แถบสีขอบซ้ายแสดงสถานะ (ส้ม = รอตรวจ, เขียว = อนุมัติ, เทา = ปฏิเสธ) */}
                  <div className="flex">
                    <div className={`w-1 shrink-0 ${activeTab === 'pending' ? 'bg-amber-500' : activeTab === 'approved' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                    
                    <div className="flex-1 p-5 flex flex-col xl:flex-row gap-6">
                      
                      {/* ฝั่งซ้าย: รูปภาพหน้าปกและรูปภาพประกอบย่อ */}
                      <div className="xl:w-[280px] shrink-0 space-y-2">
                        {/* รูปหลัก (Main Image) */}
                        <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 group border border-slate-100 flex items-center justify-center">
                           {property.image ? (
                             <Image src={property.image} alt={property.title} width={280} height={176} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 font-bold text-xs gap-1">
                               <span>📷</span>
                               <span>ไม่มีรูปภาพแนบมา</span>
                             </div>
                           )}
                           {property.image && (
                             <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm text-amber-400 text-[9px] font-black px-2 py-1 rounded-md z-10 flex items-center gap-1">
                               ⭐ มีรูปภาพแนบ
                             </div>
                           )}
                        </div>
                        {/* รูปประกอบย่อเพิ่มเติม 3 รูปแรก */}
                        {property.images && property.images.length > 1 && (
                          <div className="grid grid-cols-3 gap-2">
                            {property.images.slice(1, 3).map((subImg, idx) => (
                              <div key={idx} className="h-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-100">
                                <Image src={subImg} alt={`${property.title}-${idx}`} width={90} height={64} className="w-full h-full object-cover opacity-80" />
                              </div>
                            ))}
                            {property.imageCount > 3 ? (
                              <div className="h-16 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shadow-inner border border-slate-200">
                                +{property.imageCount - 3} รูป
                              </div>
                            ) : property.images.length === 2 ? (
                              <div className="h-16 rounded-lg bg-slate-50 border border-dashed border-slate-200" />
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* ฝั่งขวา: รายละเอียดข้อมูลอสังหาฯ และปุ่มดำเนินการ */}
                      <div className="flex-1 flex flex-col">
                        
                        {/* 1. แถบบนแสดงประเภทอสังหาฯ, ป้ายขาย/เช่า, รหัส ID และ SLA */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2 mb-2">
                             {/* ป้ายประเภทอสังหาฯ (เช่น HOUSE, CONDO) */}
                             <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100">{property.type || 'HOUSE'}</span>
                             {/* ป้ายประเภทการขาย/เช่า (ขาย = สีเขียว, เช่า = สีม่วง) */}
                             <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${property.listingType === 'rent' ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                               {property.listingType === 'rent' ? 'ให้เช่า (Rent)' : 'ขาย (Sale)'}
                             </span>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                             {/* รหัสประจำประกาศ (ID ย่อ 8 หลักแรก) */}
                             <span className="text-[10px] text-slate-400 font-bold uppercase">ID: {property.id.slice(0, 8)}</span>
                             {/* ตัวแจ้งเตือนเวลา SLA สำหรับคิวรออนุมัติ */}
                             {activeTab === 'pending' && (
                               <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded-md border border-red-100 flex items-center gap-1">
                                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                 SLA: เหลือ 45 นาที
                               </span>
                             )}
                          </div>
                        </div>

                        {/* 2. ชื่อหัวข้อประกาศ และ ราคาแสดงผล */}
                        <h3 className="text-[16px] font-extrabold text-slate-900 leading-tight mb-2 pr-10">{property.title}</h3>
                        <p className="text-2xl font-black text-blue-600 mb-4">฿ {Number(property.price).toLocaleString()}</p>
                        
                        {/* 3. รายละเอียดสเปกอสังหาฯ (ทำเล, ขนาดพื้นที่, จำนวนห้องนอน/ห้องน้ำ) */}
                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 mb-6">
                           <span className="flex items-center gap-1.5">📍 {property.location}</span>
                           <span className="flex items-center gap-1.5">⛶ {property.area} ตร.ม.</span>
                           <span className="flex items-center gap-1.5">🛏️ {property.bedrooms} นอน</span>
                           <span className="flex items-center gap-1.5">🚿 {property.bathrooms} น้ำ</span>
                        </div>

                        {/* 4. ข้อมูลนายหน้าผู้ลงประกาศ และ ปุ่มดำเนินการ (อนุมัติ / ปฏิเสธ / พรีวิว) */}
                        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                           {/* ข้อมูลโปรไฟล์นายหน้าผู้ส่งประกาศ */}
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black border border-blue-200">
                                {property.agentName[0]}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                   <p className="font-extrabold text-slate-800 text-sm">{property.agentName}</p>
                                   {property.agentPlan === 'pro' && (
                                      <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">PRO Agent</span>
                                   )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">ส่งเมื่อ {new Date(property.createdAt).toLocaleString('th-TH')}</p>
                              </div>
                           </div>

                           {/* กลุ่มปุ่มกดดำเนินการสำหรับแอดมิน */}
                           <div className="flex items-center gap-3">
                              {/* ปุ่มพรีวิวดูหน้าประกาศจริง */}
                              <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all shadow-sm">
                                👁️ ดูพรีวิว
                              </button>
                              
                              {/* ปุ่มอนุมัติ / ปฏิเสธ (แสดงเฉพาะในแท็บ "รอตรวจสอบ") */}
                              {activeTab === 'pending' && (
                                <>
                                  <button onClick={() => openRejectModal(property)} className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2">
                                    ✕ ปฏิเสธการลง
                                  </button>
                                  <button onClick={() => handleApprove(property.id)} className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-600/30 active:scale-95 flex items-center gap-2">
                                    ✓ อนุมัติและเผยแพร่
                                  </button>
                                </>
                              )}
                           </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------------------
         * 5. REJECT REASON POP-UP MODAL (ป๊อบอัปเลือกเหตุผลปฏิเสธประกาศ)
         * ------------------------------------------------------------------------------ */}
        {rejectingProperty && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-100">
              {/* ส่วนหัวของ Modal ปฏิเสธ */}
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-red-600 text-base flex items-center gap-1.5">
                  <span>🚨</span> ยืนยันการปฏิเสธประกาศ
                </h3>
                <button onClick={closeRejectModal} className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer">✕</button>
              </div>

              {/* สรุปชื่อประกาศที่กำลังถูกระงับ/ปฏิเสธ */}
              <div>
                <p className="text-xs font-bold text-slate-500">ประกาศที่จะปฏิเสธ:</p>
                <p className="text-sm font-extrabold text-slate-900 line-clamp-1">{rejectingProperty.title}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">นายหน้า: {rejectingProperty.agentName}</p>
              </div>

              {/* รายการตัวเลือกเหตุผลการปฏิเสธ (Radio Options) */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">กรุณาเลือกเหตุผลในการปฏิเสธ:</label>

                {[
                  'ข้อมูล/รูปภาพไม่ครบถ้วนหรือไม่ชัดเจน',
                  'ราคาหรือรายละเอียดดูผิดปกติ ต้องตรวจสอบเพิ่มเติม',
                  'ข้อมูลไม่ตรงกับความเป็นจริง',
                  'เอกสารสิทธิ์ไม่ครบถ้วน',
                  'อื่นๆ'
                ].map((reasonOpt, idx) => (
                  <label key={idx} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="rejectReasonOption"
                      value={reasonOpt}
                      checked={rejectReasonOption === reasonOpt}
                      onChange={(e) => setRejectReasonOption(e.target.value)}
                      className="accent-red-600"
                    />
                    <span>{reasonOpt}</span>
                  </label>
                ))}

                {/* ช่องกรอกข้อความเหตุผลเพิ่มเติมกรณีเลือก "อื่นๆ" */}
                {rejectReasonOption === 'อื่นๆ' && (
                  <textarea
                    rows={2}
                    placeholder="พิมพ์ระบุเหตุผลเพิ่มเติม..."
                    value={customRejectReason}
                    onChange={(e) => setCustomRejectReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 mt-2"
                  />
                )}
              </div>

              {/* ปุ่มกดย้อนกลับ และ ปุ่มยืนยันปฏิเสธ */}
              <div className="flex items-center justify-end gap-2 border-t pt-3">
                <button
                  type="button"
                  onClick={closeRejectModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={submittingReject}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow disabled:opacity-50"
                >
                  {submittingReject ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

