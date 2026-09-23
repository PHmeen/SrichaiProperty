'use client';

/**
 * ==============================================================================
 * หน้าต่างบริหารจัดการของนายหน้า (Agent Dashboard Page)
 * ==============================================================================
 * ไฟล์: app/agent/dashboard/page.tsx
 * ประเภท: React Client Component ('use client')
 * 
 * หน้าที่หลัก:
 * 1. ตรวจสอบสิทธิ์การใช้งานผ่าน NextAuth
 * 2. แสดงสถิติภาพรวมพอร์ต (เข้าชมรวม, มูลค่าพอร์ต, นัดหมาย)
 * 3. Quick Filter Chips กรองประกาศ (ทั้งหมด / ขาย / เช่า / รออนุมัติ / อนุมัติแล้ว)
 * 4. จัดการประกาศ (ค้นหา, คัดลอกลิงก์, ดูสถิติเชิงลึก, แก้ไข, ลบ)
 * ==============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FREE_LISTING_QUOTA } from '@/lib/constants';
import { toast } from '@/components/ui/toast';
import {
  Clock,
  Crown,
  Search,
  Trash2,
  Home,
  Plus,
  Building2,
  Loader2
} from 'lucide-react';

import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import UpgradeProModal from '@/components/agent/UpgradeProModal';
import PropertyStatsModal, { PropertyData } from '@/components/agent/PropertyStatsModal';

interface AppointmentData {
  id: string;
  status: string;
  timeSlot: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
}

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State การค้นหาและคัดกรองข้อมูล
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'rent' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับ Action แถว
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // State โมดอล
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);

  // State ข้อมูล Dashboard
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

  const loadDashboard = useCallback(() => {
    fetch('/api/agent/portal?type=dashboard')
      .then(res => {
        if (!res.ok) throw new Error('โหลดข้อมูลแผงควบคุมไม่สำเร็จ');
        return res.json();
      })
      .then(data => {
        setDbData(data);
      })
      .catch(err => {
        console.error('Error fetching dashboard:', err);
        toast.error('ไม่สามารถโหลดข้อมูลแผงควบคุมได้ กรุณาลองใหม่อีกครั้ง');
      });
  }, []);

  useEffect(() => {
    document.title = 'คลังประกาศ & แผงควบคุม | Srichai Property';
    if (status === 'authenticated') {
      loadDashboard();
    } else if (status === 'unauthenticated') {
      router.replace('/login/agent');
    }
  }, [status, loadDashboard, router]);

  const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

  const handleDelete = async (propertyId: string) => {
    if (!confirm('ยืนยันลบประกาศนี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้')) return;
    setDeletingId(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedProperty?.id === propertyId) setSelectedProperty(null);
        toast.success('ลบประกาศเรียบร้อยแล้ว');
        loadDashboard();
      } else {
        toast.error('ลบประกาศไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (propertyId: string) => {
    const url = `${window.location.origin}/property/${propertyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(propertyId);
    toast.success('คัดลอกลิงก์ประกาศแล้ว!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const propertiesList = useMemo(() => dbData?.properties || [], [dbData]);

  // สรุปตัวเลขสำหรับชิปแต่ละประเภท
  const counts = useMemo(() => {
    return {
      all: propertiesList.length,
      sale: propertiesList.filter(p => p.listingType === 'sale').length,
      rent: propertiesList.filter(p => p.listingType === 'rent').length,
      pending: propertiesList.filter(p => p.status === 'pending').length,
      approved: propertiesList.filter(p => p.status === 'approved').length
    };
  }, [propertiesList]);

  // กรองรายการประกาศตาม filterType และ searchTerm
  const filteredProperties = useMemo(() => {
    return propertiesList.filter(p => {
      const matchesStatus =
        filterType === 'all' ? true :
        filterType === 'sale' ? p.listingType === 'sale' :
        filterType === 'rent' ? p.listingType === 'rent' :
        filterType === 'pending' ? p.status === 'pending' :
        filterType === 'approved' ? p.status === 'approved' :
        filterType === 'rejected' ? p.status === 'rejected' : true;
      const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [propertiesList, filterType, searchTerm]);

  const isPro = dbData?.isPro || false;
  const remainingQuota = Math.max(0, FREE_LISTING_QUOTA - (dbData?.totalCount || 0));

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-semibold">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (session?.user?.status === 'pending') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">บัญชีอยู่ระหว่างการตรวจสอบ KYC</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            เจ้าหน้าที่จะดำเนินการตรวจสอบข้อมูลยืนยันตัวตนของท่าน เมื่ออนุมัติแล้วจะสามารถจัดการพอร์ตได้เต็มรูปแบบ
          </p>
          <button
            onClick={() => signOut({ callbackUrl: '/login/agent' })}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 sm:pt-8 min-h-screen bg-[#F8FAFC] text-slate-800 text-xs md:text-sm font-sans antialiased pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 text-left">

        {/* แบนเนอร์แจ้งเตือนประกาศรออนุมัติ */}
        <PendingApprovalBanner
          pendingCount={dbData?.pendingApprovalCount || 0}
          onViewPending={() => setFilterType('pending')}
        />

        {/* แบนเนอร์อัปเกรด PRO (ถ้ายังไม่ได้เป็น) */}
        {!isPro && (
          <section className="bg-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-amber-400">อัปเกรดเป็น Verified PRO Partner</h4>
                <p className="text-slate-400 text-xs mt-0.5">ลงประกาศได้ไม่จำกัดจำนวน รับเครื่องหมายยศความน่าเชื่อถือ และรับสิทธิ์ดันประกาศพิเศษ</p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shrink-0 cursor-pointer transition shadow-2xs"
            >
              อัปเกรด (599.-/เดือน)
            </button>
          </section>
        )}

        {/* กล่องสรุปตัวเลขสถิติภาพรวม 4 ด้าน */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">อสังหาริมทรัพย์ในพอร์ต</span>
            <div className="flex items-baseline gap-2">
              <strong className="text-xl font-black text-slate-900">{dbData?.totalCount || 0}</strong>
              <span className="text-xs text-slate-400 font-bold">/ {isPro ? 'ไม่จำกัด' : `${FREE_LISTING_QUOTA} รายการ`}</span>
            </div>
            <span className="text-[10px] text-amber-600 font-bold block">
              {isPro ? 'สิทธิ์ Pro ไม่จำกัด' : remainingQuota === 0 ? 'เต็มโควต้า' : `เหลืออีก ${remainingQuota} สิทธิ์`}
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ยอดเข้าชมสะสม</span>
            <strong className="text-xl font-black text-slate-900 block">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
            <span className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>ได้รับความสนใจต่อเนื่อง</span>
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ลูกค้านัดชมสถานที่</span>
            <strong className="text-xl font-black text-blue-600 block">{dbData?.pendingAptsCount || 0} รายการ</strong>
            <span className="text-[10px] text-slate-400 font-bold block">รอยืนยันการพบลูกค้า</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl font-black text-emerald-600 block">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
            <span className="text-[10px] text-slate-400 font-bold block">มูลค่ารวมทรัพย์สินที่อนุมัติ</span>
          </div>
        </section>

        {/* เลย์เอาต์แบ่ง 2 ฝั่ง (2/3 ตารางบ้าน, 1/3 นัดหมายล่าสุด) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ================================================================= */}
          {/* ฝั่งซ้าย (lg:col-span-8): คลังประกาศพร้อม Quick Filter Chips */}
          {/* ================================================================= */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
            
            {/* Header คลังประกาศ & ช่องค้นหา */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-black text-slate-900 text-sm sm:text-base">
                  รายการประกาศอสังหาริมทรัพย์
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  จัดการคลังบ้าน สลับตัวกรอง หรือคลิกดูสถิติเชิงลึกของแต่ละหลัง
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="ค้นหาตามชื่อประกาศ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-amber-500 transition placeholder-slate-400 font-medium"
                  />
                </div>

                <Link
                  href="/agent/add-property"
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>เพิ่มประกาศ</span>
                </Link>
              </div>
            </div>

            {/* Quick Filter Chips (ปุ่มกรองด่วนคลิกเดียวรู้เรื่อง) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>ทั้งหมด</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  filterType === 'all' ? 'bg-slate-800 text-amber-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('sale')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'sale'
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>ขาย</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  filterType === 'sale' ? 'bg-slate-900 text-amber-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.sale}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('rent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'rent'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>ให้เช่า</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  filterType === 'rent' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.rent}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'approved'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>อนุมัติแล้ว</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  filterType === 'approved' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.approved}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'pending'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>รออนุมัติ</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                  filterType === 'pending' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {counts.pending}
                </span>
              </button>
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
                      <td colSpan={4} className="py-12 text-center text-slate-400 space-y-2">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-xs text-slate-600">
                          {searchTerm ? 'ไม่พบประกาศที่ตรงกับคำค้นหา' : 'ไม่มีรายการประกาศในหมวดหมู่นี้'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          คุณสามารถลงประกาศขายหรือให้เช่าใหม่ได้ทันที
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                        {/* คอลัมน์ที่ 1: ภาพหน้าปก, ชื่อ และราคา */}
                        <td className="py-3 px-2 flex gap-3 items-center">
                          <div className="relative w-14 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs bg-slate-100">
                            {p.image ? (
                              <Image
                                src={p.image}
                                alt={p.title}
                                fill
                                sizes="56px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <Home className="w-5 h-5" />
                              </div>
                            )}
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-slate-900/80 backdrop-blur-xs text-white font-bold text-[8px] rounded">
                              {p.listingType === 'rent' ? 'เช่า' : 'ขาย'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]" title={p.title}>
                              {p.title}
                            </h4>
                            <span className="text-amber-700 font-black text-xs block mt-0.5">
                              {p.price}
                            </span>
                          </div>
                        </td>

                        {/* คอลัมน์ที่ 2: สถิติจำนวนคนเข้าชม และจำนวนนัดหมาย */}
                        <td className="py-3 px-2 text-center font-bold text-slate-600 text-[11px]">
                          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-xl">
                            <span>{p.views.toLocaleString()} วิว</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-blue-600">{p.appointments} นัด</span>
                          </div>
                        </td>

                        {/* คอลัมน์ที่ 3: ป้ายสถานะการอนุมัติ */}
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            p.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200/80' :
                            'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : p.status === 'rejected' ? 'ถูกตีกลับ' : 'รอตรวจสอบ'}
                          </span>
                          {/* 🔑 KEYWORD: บอกนายหน้าว่าแอดมินตรวจประกาศนี้เมื่อไหร่
                              เดิมรู้แค่ผลลัพธ์ ไม่รู้ว่าตรวจตอนไหน ประกาศเก่าจะไม่มีข้อมูลจึงเช็ค null */}
                          {p.reviewedAt && (
                            <p className="text-[9px] text-slate-400 font-bold mt-1">
                              ตรวจเมื่อ {new Date(p.reviewedAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                          <span className="hidden">
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
                              type="button"
                              onClick={() => setSelectedProperty(p)}
                              className="px-2.5 py-1.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-600 hover:text-white font-extrabold rounded-xl transition cursor-pointer shadow-2xs"
                              title="เปิดดูกราฟสถิติเชิงลึก"
                            >
                              สถิติ
                            </button>

                            {/* ปุ่มคัดลอกลิงก์ไปแชร์ */}
                            <button
                              type="button"
                              onClick={() => handleCopyLink(p.id)}
                              className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer"
                              title="คัดลอกลิงก์ประกาศ"
                            >
                              {copiedId === p.id ? 'คัดลอกแล้ว' : 'แชร์'}
                            </button>

                            {/* ลิงก์ไปหน้าแก้ไขประกาศ */}
                            <Link
                              href={`/agent/edit-property/${p.id}`}
                              className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-blue-600 border border-slate-200/80 hover:bg-blue-50 font-bold rounded-xl transition cursor-pointer"
                            >
                              แก้ไข
                            </Link>

                            {/* ปุ่มกดลบประกาศ */}
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="p-1.5 text-[10px] text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-50 cursor-pointer"
                              title="ลบประกาศนี้"
                            >
                              {deletingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
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

          {/* ================================================================= */}
          {/* ฝั่งขวา (lg:col-span-4): รายการลูกค้านัดหมายล่าสุด */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-xs md:text-sm">
                นัดหมายชมสถานที่ล่าสุด
              </h3>
              <Link href="/agent/appointments" className="text-blue-600 font-bold text-[11px] hover:underline">
                ดูทั้งหมด →
              </Link>
            </div>

            {(!dbData?.recentAppointments || dbData.recentAppointments.length === 0) ? (
              <div className="py-8 text-center text-slate-400 font-medium text-xs">
                <p>ยังไม่มีรายการนัดหมายชมสถานที่ในขณะนี้</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dbData.recentAppointments.map(apt => (
                  <div key={apt.id} className="p-3 bg-slate-50/70 hover:bg-blue-50/40 rounded-xl border border-slate-200/60 transition space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="text-slate-900 font-extrabold truncate">
                        {apt.customerName}
                      </span>
                      <a
                        href={toTelHref(apt.customerPhone)}
                        className="text-[10px] bg-blue-100/80 text-blue-800 font-black px-2 py-0.5 rounded-md hover:bg-blue-200 transition shrink-0"
                      >
                        {apt.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold truncate">
                      {apt.propertyTitle}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {apt.timeSlot}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Modal แสดงสถิติเชิงลึกแบบกราฟ */}
      {selectedProperty && (
        <PropertyStatsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      {/* Modal อัปเกรดเป็น PRO */}
      {showUpgradeModal && (
        <UpgradeProModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}

    </div>
  );
}
