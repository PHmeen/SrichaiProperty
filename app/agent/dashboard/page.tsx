'use client';

/**
 * ==============================================================================
 * หน้าต่างบริหารจัดการของนายหน้า (Agent Dashboard Page)
 * ==============================================================================
 * ไฟล์: app/agent/dashboard/page.tsx
 * ประเภท: React Client Component ('use client')
 * 
 * หน้าที่หลัก (Main Responsibilities):
 * 1. ตรวจสอบสิทธิ์การใช้งาน (Authentication & KYC Verification) ผ่าน NextAuth
 * 2. โหลดและแสดงผลข้อมูลสถิติรวม (Analytics Overview) เช่น ยอดเข้าชม, มูลค่าพอร์ต, นัดหมาย
 * 3. จัดการรายการประกาศอสังหาริมทรัพย์ (Property Management: ค้นหา, กรอง, คัดลอกลิงก์, แก้ไข, ลบ)
 * 4. แสดงผลโมดอลสถิติเชิงลึก (PropertyStatsModal) และโมดอลอัปเกรดแพ็กเกจ (UpgradeProModal)
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FREE_LISTING_QUOTA } from '@/lib/constants';

// นำเข้า คอมโพเนนต์ย่อยสำหรับระบบ Agent Dashboard
import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import UpgradeProModal from '@/components/agent/UpgradeProModal';
import PropertyStatsModal, { PropertyData } from '@/components/agent/dashboard/PropertyStatsModal';

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
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

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// อินเทอร์เฟซ (Interface) นิยามโครงสร้างข้อมูลนัดหมายของลูกค้า
interface AppointmentData {
  id: string;
  status: string;
  timeSlot: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
}

export default function AgentDashboardPage() {
  // --------------------------------------------------------------------------
  // [ส่วนที่ 1: การจัดการสถานะ (State Management & NextAuth Session)]
  // --------------------------------------------------------------------------
  
  // 1.1 Session State จาก NextAuth เพื่อเช็คผู้ใช้ที่ล็อกอินอยู่
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1.2 State การค้นหาและคัดกรองข้อมูล
  const [filterType, setFilterType] = useState('all'); // ตัวกรองสถานะประกาศ: 'all' | 'approved' | 'pending' | 'rejected'
  const [searchTerm, setSearchTerm] = useState('');   // คำค้นหาตามชื่อประกาศอสังหาฯ

  // 1.3 State การจัดการ Action ประจำแถว
  const [deletingId, setDeletingId] = useState<string | null>(null); // เก็บ ID ของประกาศที่กำลังถูกลบ
  const [copiedId, setCopiedId] = useState<string | null>(null);   // เก็บ ID ของประกาศที่เพิ่งกดคัดลอกลิงก์

  // 1.4 State สำหรับควบคุมการเปิด/ปิด Modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);  // เปิด/ปิด Modal อัปเกรดเป็น PRO
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null); // เก็บข้อมูลอสังหาฯ ที่เลือกเพื่อดูสถิติเชิงลึกใน Modal

  // 1.5 State เก็บข้อมูล Dashboard จาก API หลังบ้าน (/api/agent/portal?type=dashboard)
  const [dbData, setDbData] = useState<{
    properties: PropertyData[];
    totalPortfolioValue: string;
    pendingAptsCount: number;
    pendingApprovalCount?: number;
    totalCount: number;
    totalViews: number;
    isPro?: boolean;
    recentAppointments?: AppointmentData[];
  } | null>(null);

  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const isLoadingDashboard = !dbData && !dashboardError; // คำนวณสถานะ Loading หากข้อมูลยังดึงไม่เสร็จและยังไม่มี Error

  // --------------------------------------------------------------------------
  // [ส่วนที่ 2: การดึงข้อมูลจาก API (Data Fetching with useCallback)]
  // --------------------------------------------------------------------------
  
  // ฟังก์ชันดึงข้อมูล Dashboard จาก API หลังบ้าน
  const loadDashboard = useCallback(() => {
    fetch('/api/agent/portal?type=dashboard')
      .then(res => {
        if (!res.ok) throw new Error('โหลดข้อมูลแผงควบคุมไม่สำเร็จ');
        return res.json();
      })
      .then(data => {
        setDashboardError(null);
        setDbData(data); // บันทึกข้อมูลเข้า State
      })
      .catch(err => {
        console.error('Error fetching dashboard:', err);
        setDashboardError('ไม่สามารถโหลดข้อมูลแผงควบคุมได้ กรุณาลองใหม่อีกครั้ง');
      });
  }, []);

  // 2.2 Effect ตรวจสอบสถานะการเข้าสู่ระบบ (Authentication Guard)
  useEffect(() => {
    if (status === 'authenticated') {
      loadDashboard(); // ถ้าล็อกอินแล้ว ให้ดึงข้อมูล Dashboard
    } else if (status === 'unauthenticated') {
      router.replace('/login/agent'); // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้าเข้าสู่ระบบนายหน้า
    }
  }, [status, loadDashboard, router]);

  // --------------------------------------------------------------------------
  // [ส่วนที่ 3: ฟังก์ชันผู้ช่วยและการทำ Event Handler]
  // --------------------------------------------------------------------------

  // 3.1 ฟังก์ชันฟอร์แมตเบอร์โทรศัพท์สำหรับสร้าง href "tel:xxx" (ตัดตัวอักษรอื่นออกเหลือเฉพาะตัวเลขและเครื่องหมาย +)
  const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

  // 3.2 ฟังก์ชันลบประกาศอสังหาริมทรัพย์ (Delete Property Handler)
  const handleDelete = async (propertyId: string) => {
    if (!confirm('ยืนยันลบประกาศนี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้')) return;
    setDeletingId(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.ok) {
        // หากอสังหาฯ ที่ลบอยู่กำลังเปิดดูสถิติใน Modal ให้ปิด Modal ด้วย
        if (selectedProperty?.id === propertyId) setSelectedProperty(null);
        loadDashboard(); // รีโหลดข้อมูล Dashboard เพื่ออัปเดตตัวเลขล่าสุด
      } else alert('ลบประกาศไม่สำเร็จ');
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  };

  // 3.3 ฟังก์ชันคัดลอกลิงก์สาธารณะของประกาศ (Copy Property Link to Clipboard)
  const handleCopyLink = (propertyId: string) => {
    const url = `${window.location.origin}/property/${propertyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(propertyId);
    setTimeout(() => setCopiedId(null), 2000); // เคลียร์ข้อความแจ้งเตือนหลังผ่านไป 2 วินาที
  };

  // --------------------------------------------------------------------------
  // [ส่วนที่ 4: การตรวจสอบสิทธิ์ และการแสดงผลหน้า Loading / KYC Screen]
  // --------------------------------------------------------------------------

  // 4.1 แสดง Loading Spinner ขณะกำลังตรวจสอบ Session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 4.2 ตรวจสอบสถานะ KYC ของบัญชีนายหน้า (ถ้ายังรออนุมัติให้แสดงหน้าแจ้งเตือน)
  const user = session?.user as { name?: string | null; status?: string | null };
  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md space-y-4">
          <div className="flex items-center justify-center">
            <ClockIcon className="w-9 h-9" />
          </div>
          <h1 className="text-lg font-black">บัญชีอยู่ระหว่างการตรวจสอบ KYC</h1>
          <p className="text-xs text-slate-500">เจ้าหน้าที่จะดำเนินการตรวจสอบข้อมูลยืนยันตัวตนของท่านภายใน 1-2 วันทำการ</p>
          <button onClick={() => signOut({ callbackUrl: '/login/agent' })} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">ออกจากระบบ</button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // [ส่วนที่ 5: การคำนวณและกรองข้อมูลสำหรับแสดงผล (Filtering & Calculations)]
  // --------------------------------------------------------------------------

  // 5.1 กรองรายการประกาศตาม filterType และ searchTerm
  const filteredProperties = (dbData?.properties || []).filter(p => {
    const matchesStatus = filterType === 'all' ? true :
                          filterType === 'approved' ? p.status === 'approved' :
                          filterType === 'pending' ? p.status === 'pending' :
                          filterType === 'rejected' ? p.status === 'rejected' : true;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // 5.2 คำนวณสถานะสิทธิ์ Pro และโควตาการลงประกาศที่เหลืออยู่
  const isPro = dbData?.isPro || false;
  const remainingQuota = Math.max(0, FREE_LISTING_QUOTA - (dbData?.totalCount || 0));

  // --------------------------------------------------------------------------
  // [ส่วนที่ 6: การเรนเดอร์ส่วนประกอบ UI (JSX Rendering)]
  // --------------------------------------------------------------------------
  return (
    <div className="pt-16 min-h-screen bg-slate-50/50 text-slate-800 text-xs md:text-sm font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner แจ้งเตือนเมื่อมีประกาศที่รอ Admin ตรวจสอบอนุมัติ */}
        <PendingApprovalBanner
          pendingCount={dbData?.pendingApprovalCount || 0}
          onViewPending={() => setFilterType('pending')}
        />

        {/* Banner เชิญชวนอัปเกรดเป็นแพ็กเกจ PRO (แสดงเฉพาะเมื่อยังไม่ใช่นายหน้า PRO) */}
        {!isPro && (
          <section className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-slate-900/10">
            <div className="flex items-center gap-3">
              <span className="text-amber-400"><CrownIcon className="w-7 h-7" /></span>
              <div>
                <h4 className="font-bold text-sm text-amber-400">อัปเกรดเป็น Verified PRO Partner</h4>
                <p className="text-slate-400 text-[11px]">ลงประกาศได้ไม่จำกัดจำนวน รับเครื่องหมายยศความน่าเชื่อถือ และรับสิทธิ์ดันประกาศพิเศษ</p>
              </div>
            </div>
            <button onClick={() => setShowUpgradeModal(true)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shrink-0 cursor-pointer transition shadow-md border-0">
              อัปเกรด (599.-/เดือน)
            </button>
          </section>
        )}

        {/* แถบหัวข้อหลัก และปุ่มสร้างประกาศใหม่ */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">ภาพรวมการทำงาน ({user?.name || 'นายหน้า'})</h2>
            <p className="text-slate-500 text-xs mt-0.5">แผงบริหารจัดการรายการประกาศและตารางนัดหมายลูกค้า</p>
          </div>
          <Link href="/agent/add-property" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition border-0">
            + ลงประกาศใหม่ {isPro ? '(สิทธิ์ PRO ไม่จำกัด)' : `(เหลือ ${remainingQuota} สิทธิ์ฟรี)`}
          </Link>
        </section>

        {/* แสดงข้อความขณะกำลังโหลดข้อมูล หรือเมื่อมีข้อผิดพลาด */}
        {isLoadingDashboard && !dbData && (
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-3 text-slate-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            กำลังโหลดข้อมูลแผงควบคุม...
          </section>
        )}
        {dashboardError && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-700">
            <span className="inline-flex items-center gap-1.5"><AlertIcon className="w-4 h-4 shrink-0" /> {dashboardError}</span>
            <button onClick={loadDashboard} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] shrink-0 border-0 cursor-pointer">
              ลองใหม่
            </button>
          </section>
        )}

        {/* การ์ดสรุปสถิติ 4 ใบ (Summary Cards Grid) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* การ์ดที่ 1: โควตาประกาศ */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">โควตาประกาศ</span>
            <strong className="text-xl font-black text-slate-900 block">
              {dbData?.totalCount || 0} {isPro ? 'ประกาศ (PRO)' : `/ ${FREE_LISTING_QUOTA}`}
            </strong>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isPro ? 'bg-amber-500' : 'bg-blue-600'} rounded-full transition-all`}
                style={{ width: isPro ? '100%' : `${Math.min(((dbData?.totalCount || 0) / FREE_LISTING_QUOTA) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* การ์ดที่ 2: ยอดเข้าชมรวม */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ยอดเข้าชมรวม</span>
            <strong className="text-xl font-black text-slate-900 block">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
            <span className="text-[10px] text-emerald-600 font-extrabold block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> ได้รับความสนใจต่อเนื่อง
            </span>
          </div>

          {/* การ์ดที่ 3: จำนวนลูกค้านัดชมสถานที่ */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ลูกค้านัดชมสถานที่</span>
            <strong className="text-xl font-black text-blue-600 block">{dbData?.pendingAptsCount || 0} รายการ</strong>
            <span className="text-[10px] text-slate-400 font-bold block">รอยืนยันการพบลูกค้า</span>
          </div>

          {/* การ์ดที่ 4: มูลค่าพอร์ตโฟลิโอรวม */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl font-black text-emerald-600 block">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
            <span className="text-[10px] text-slate-400 font-bold block">มูลค่ารวมทรัพย์สินที่อนุมัติ</span>
          </div>
        </section>

        {/* เลย์เอาต์แบ่ง 2 ฝั่ง (2 Column Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ฝั่งซ้าย (2/3): ตารางแสดงรายการประกาศอสังหาริมทรัพย์ */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">รายการประกาศอสังหาริมทรัพย์</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">กดปุ่ม &quot;ดูสถิติกราฟ&quot; เพื่อดูรายละเอียดเชิงลึกของบ้านแต่ละหลัง</p>
              </div>

              {/* แถบกล่องค้นหาและตัวกรองสถานะ */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ค้นหาตามชื่อ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-36 sm:w-44 transition placeholder-slate-400 font-medium"
                  />
                </div>
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">ทั้งหมด ({dbData?.properties.length || 0})</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="pending">รอการตรวจสอบ</option>
                  <option value="rejected">ถูกตีกลับ</option>
                </select>
              </div>
            </div>

            {/* ตารางแสดงข้อมูลอสังหาริมทรัพย์ */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-2">อสังหาริมทรัพย์</th>
                    <th className="py-2.5 px-2 text-center">สถิติคนดู / นัดหมาย</th>
                    <th className="py-2.5 px-2 text-center">สถานะ</th>
                    <th className="py-2.5 px-2 text-right">การจัดการ & สถิติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400 font-bold text-xs">
                        ยังไม่มีรายการประกาศในระบบ กดปุ่ม &quot;+ ลงประกาศใหม่&quot; เพื่อเริ่มสร้างประกาศแรกของคุณ
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                        {/* คอลัมน์ที่ 1: ภาพหน้าปก, ชื่อ และราคา */}
                        <td className="py-3 px-2 flex gap-3 items-center">
                          <div className="relative w-14 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                            <Image src={p.image} alt="property" fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]">{p.title}</h4>
                            <span className="text-blue-600 font-black text-xs block mt-0.5">{p.price}</span>
                          </div>
                        </td>

                        {/* คอลัมน์ที่ 2: สถิติจำนวนคนเข้าชม และจำนวนนัดหมาย */}
                        <td className="py-3 px-2 text-center font-bold text-slate-600 text-[11px]">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-xl">
                            <span className="inline-flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" /> {p.views.toLocaleString()}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-blue-600 inline-flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {p.appointments} นัด</span>
                          </div>
                        </td>

                        {/* คอลัมน์ที่ 3: ป้ายสถานะการอนุมัติ (Approved / Pending / Rejected) */}
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            p.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200/80' :
                            'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : p.status === 'rejected' ? 'ถูกตีกลับ' : 'รอตรวจสอบ'}
                          </span>
                          {p.status === 'rejected' && p.rejectReason && (
                            <p className="text-[9px] text-red-500 font-bold mt-1 line-clamp-2 max-w-[140px] mx-auto" title={p.rejectReason}>
                              {p.rejectReason}
                            </p>
                          )}
                        </td>

                        {/* คอลัมน์ที่ 4: ปุ่มการจัดการ (ดูสถิติกราฟ, แชร์ลิงก์, แก้ไข, ลบ) */}
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                            {/* ปุ่มเปิด Modal สถิติเชิงลึก */}
                            <button
                              onClick={() => setSelectedProperty(p)}
                              className="px-2.5 py-1.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-600 hover:text-white font-extrabold rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                              title="เปิดหน้าต่างลอยสถิติเชิงลึก"
                            >
                              <ChartBarIcon className="w-3 h-3" /> สถิติ
                            </button>

                            {/* ปุ่มคัดลอกลิงก์ไปแชร์ */}
                            <button
                              onClick={() => handleCopyLink(p.id)}
                              className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1"
                              title="คัดลอกลิงก์ประกาศไปแชร์"
                            >
                              {copiedId === p.id ? (
                                <><CheckIcon className="w-3 h-3" /> คัดลอกแล้ว</>
                              ) : (
                                <><LinkIcon className="w-3 h-3" /> แชร์</>
                              )}
                            </button>

                            {/* ปุ่มลิงก์ไปหน้าแก้ไขประกาศ */}
                            <Link href={`/agent/edit-property/${p.id}`} className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-blue-600 border border-slate-200/80 hover:bg-blue-50 font-bold rounded-xl transition">
                              แก้ไข
                            </Link>

                            {/* ปุ่มกดลบประกาศ */}
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="px-2 py-1.5 text-[10px] text-rose-500 hover:bg-rose-50 rounded-xl transition disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === p.id ? '...' : <TrashIcon className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ฝั่งขวา (1/3): ตารางแสดงรายการลูกค้านัดหมายชมสถานที่ล่าสุด */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm inline-flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400" /> นัดหมายชมสถานที่ล่าสุด
              </h4>
              <Link href="/agent/appointments" className="text-blue-600 font-bold text-[11px] hover:underline">ดูทั้งหมด</Link>
            </div>

            {(!dbData?.recentAppointments || dbData.recentAppointments.length === 0) ? (
              <p className="py-8 text-center text-slate-400 font-bold text-xs">ยังไม่มีรายการนัดหมายชมสถานที่ในขณะนี้</p>
            ) : (
              <div className="space-y-2.5">
                {dbData.recentAppointments.map(apt => (
                  <div key={apt.id} className="p-3 bg-slate-50/70 hover:bg-blue-50/40 rounded-xl border border-slate-200/60 transition space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="flex items-center gap-1.5 text-slate-900 font-extrabold truncate">
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                        {apt.customerName}
                      </span>
                      {/* ลิงก์โทรศัพท์ tel: ปรับแต่งเบอร์ให้ปลอดภัยก่อนสร้าง href */}
                      <a href={toTelHref(apt.customerPhone)} className="text-[10px] bg-blue-100/80 text-blue-800 font-black px-2 py-0.5 rounded-full hover:bg-blue-200 transition shrink-0 inline-flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3" /> {apt.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold truncate inline-flex items-center gap-1.5">
                      <HomeIcon className="w-3 h-3 text-slate-400 shrink-0" /> {apt.propertyTitle}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium inline-flex items-center gap-1.5">
                      <ClockIcon className="w-3 h-3 shrink-0" /> {apt.timeSlot}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* -------------------------------------------------------------------------- */}
      {/* [ส่วนที่ 7: การเรนเดอร์ Modals ลอย]                                         */}
      {/* -------------------------------------------------------------------------- */}

      {/* 7.1 Modal แสดงสถิติเชิงลึกแบบกราฟและรายชื่อลูกค้านัดหมายเฉพาะทรัพย์นี้ */}
      {selectedProperty && (
        <PropertyStatsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* 7.2 Modal เสนออัปเกรดแพ็กเกจเป็น Verified PRO Agent */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}

