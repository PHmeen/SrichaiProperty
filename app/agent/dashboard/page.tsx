'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";

import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import UpgradeProModal from '@/components/agent/UpgradeProModal';

interface PropertyData {
  id: string;
  title: string;
  price: string;
  type: string;
  status: 'approved' | 'pending';
  image: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  views: number;
  appointments: number;
  chatsCount?: number;
  savesCount?: number;
  rawAppointments?: string[];
  rawChats?: string[];
  rawSaves?: string[];
}

interface AppointmentData {
  id: string;
  status: string;
  timeSlot: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
}

// 📌 shadcn/ui ChartConfig สำหรับสถิติกราฟใน Modal รายบ้าน (ใช้ชุดสี HSL ยอดนิยมของ shadcn)
const propertyModalChartConfig = {
  appointments: {
    label: "นัดชมสถานที่",
    color: "#10b981", // เขียว Emerald
  },
  chats: {
    label: "ทักแชทสอบถาม",
    color: "#3b82f6", // น้ำเงิน Blue
  },
  saves: {
    label: "กดเซฟเป็นโปรด",
    color: "#f59e0b", // ส้ม Amber
  },
} satisfies ChartConfig;

export default function AgentDashboardPage() {
  const { data: session, status } = useSession();
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // State สำหรับ Modal สถิติเชิงลึกรายบ้าน
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'month' | 'year'>('month');

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
      .then(res => res.json())
      .then(data => setDbData(data))
      .catch(err => console.error('Error fetching dashboard:', err));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadDashboard();
  }, [status, loadDashboard]);

  const handleDelete = async (propertyId: string) => {
    if (!confirm('ยืนยันลบประกาศนี้หรือไม่? การลบจะไม่สามารถย้อนกลับได้')) return;
    setDeletingId(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedProperty?.id === propertyId) setSelectedProperty(null);
        loadDashboard();
      } else alert('ลบประกาศไม่สำเร็จ');
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (propertyId: string) => {
    const url = `${window.location.origin}/property/${propertyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(propertyId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // คำนวณชุดข้อมูลสำหรับ shadcn/ui Multiple Bar Chart ตามช่วงเวลา (วัน/เดือน/ปี)
  const modalChartData = useMemo(() => {
    if (!selectedProperty) return [];

    const aptDates = (selectedProperty.rawAppointments || []).map(d => new Date(d));
    const chatDates = (selectedProperty.rawChats || []).map(d => new Date(d));
    const saveDates = (selectedProperty.rawSaves || []).map(d => new Date(d));

    if (chartTimeframe === 'day') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayLabel = date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
        const dateString = date.toISOString().split('T')[0];

        const apts = aptDates.filter(d => d.toISOString().split('T')[0] === dateString).length;
        const chats = chatDates.filter(d => d.toISOString().split('T')[0] === dateString).length;
        const saves = saveDates.filter(d => d.toISOString().split('T')[0] === dateString).length;

        result.push({ timeframe: dayLabel, appointments: apts, chats: chats, saves: saves });
      }
      return result;
    } else if (chartTimeframe === 'month') {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLabel = date.toLocaleDateString('th-TH', { month: 'short' });
        const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;

        const apts = aptDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const chats = chatDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const saves = saveDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;

        result.push({ timeframe: monthLabel, appointments: apts, chats: chats, saves: saves });
      }
      return result;
    } else {
      const result = [];
      const currentYear = new Date().getFullYear();
      for (let i = 2; i >= 0; i--) {
        const year = currentYear - i;
        const yearLabel = (year + 543).toString();

        const apts = aptDates.filter(d => d.getFullYear() === year).length;
        const chats = chatDates.filter(d => d.getFullYear() === year).length;
        const saves = saveDates.filter(d => d.getFullYear() === year).length;

        result.push({ timeframe: yearLabel, appointments: apts, chats: chats, saves: saves });
      }
      return result;
    }
  }, [selectedProperty, chartTimeframe]);

  // คำนวณ Conversion Rates
  const chatRate = useMemo(() => {
    if (!selectedProperty || selectedProperty.views === 0) return '0.0';
    return (((selectedProperty.chatsCount || 0) / selectedProperty.views) * 100).toFixed(1);
  }, [selectedProperty]);

  const bookingRate = useMemo(() => {
    if (!selectedProperty || selectedProperty.views === 0) return '0.0';
    return ((selectedProperty.appointments / selectedProperty.views) * 100).toFixed(1);
  }, [selectedProperty]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session?.user as { name?: string | null; status?: string | null };
  if (user?.status === 'pending') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md space-y-4">
          <div className="text-4xl">🕒</div>
          <h1 className="text-lg font-black">บัญชีอยู่ระหว่างการตรวจสอบ KYC</h1>
          <p className="text-xs text-slate-500">เจ้าหน้าที่จะดำเนินการตรวจสอบข้อมูลยืนยันตัวตนของท่านภายใน 1-2 วันทำการ</p>
          <button onClick={() => signOut({ callbackUrl: '/login/agent' })} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl">ออกจากระบบ</button>
        </div>
      </div>
    );
  }

  const filteredProperties = (dbData?.properties || []).filter(p => {
    const matchesStatus = filterType === 'all' ? true :
                          filterType === 'approved' ? p.status === 'approved' :
                          filterType === 'pending' ? p.status === 'pending' : true;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const isPro = dbData?.isPro || false;
  const remainingQuota = Math.max(0, 3 - (dbData?.totalCount || 0));

  return (
    <div className="pt-16 min-h-screen bg-slate-50/50 text-slate-800 text-xs md:text-sm font-sans antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner รออนุมัติประกาศ */}
        <PendingApprovalBanner
          pendingCount={dbData?.pendingApprovalCount || 0}
          onViewPending={() => setFilterType('pending')}
        />

        {/* Banner PRO ชวนอัปเกรด (ถ้ายังไม่เป็น PRO) */}
        {!isPro && (
          <section className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg shadow-slate-900/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
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

        {/* Title Bar & Main Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">ภาพรวมการทำงาน ({user?.name || 'นายหน้า'}) 👋</h2>
            <p className="text-slate-500 text-xs mt-0.5">แผงบริหารจัดการรายการประกาศและตารางนัดหมายลูกค้า</p>
          </div>
          <Link href="/agent/add-property" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition border-0">
            + ลงประกาศใหม่ {isPro ? '(สิทธิ์ PRO ไม่จำกัด)' : `(เหลือ ${remainingQuota} สิทธิ์ฟรี)`}
          </Link>
        </section>

        {/* 4 Cards Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">โควตาประกาศ</span>
            <strong className="text-xl font-black text-slate-900 block">
              {dbData?.totalCount || 0} {isPro ? 'ประกาศ (PRO)' : '/ 3'}
            </strong>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full ${isPro ? 'bg-amber-500' : 'bg-blue-600'} rounded-full transition-all`}
                style={{ width: isPro ? '100%' : `${Math.min(((dbData?.totalCount || 0) / 3) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ยอดเข้าชมรวม</span>
            <strong className="text-xl font-black text-slate-900 block">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
            <span className="text-[10px] text-emerald-600 font-bold block">📈 ได้รับความสนใจต่อเนื่อง</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ลูกค้านัดชมสถานที่</span>
            <strong className="text-xl font-black text-blue-600 block">{dbData?.pendingAptsCount || 0} รายการ</strong>
            <span className="text-[10px] text-slate-400 block">🎯 รอยืนยันการพบลูกค้า</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl font-black text-emerald-600 block">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
            <span className="text-[10px] text-slate-400 block">💎 มูลค่ารวมทรัพย์สินที่อนุมัติ</span>
          </div>
        </section>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ซ้าย: รายการประกาศอสังหาริมทรัพย์ */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">รายการประกาศอสังหาริมทรัพย์</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">กดปุ่ม &quot;📊 ดูสถิติ&quot; เพื่อดูสถิติกราฟแยกรายวัน/เดือน/ปี ของบ้านแต่ละหลัง</p>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 ค้นหาตามชื่อประกาศ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 w-36 sm:w-44 transition"
                />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">ทั้งหมด ({dbData?.properties.length || 0})</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="pending">รอการตรวจสอบ</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-1">อสังหาริมทรัพย์</th>
                    <th className="py-2.5 px-2 text-center">ยอดเข้าชม / นัดหมาย</th>
                    <th className="py-2.5 px-2 text-center">สถานะ</th>
                    <th className="py-2.5 px-1 text-right">การจัดการ & สถิติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                        ยังไม่มีรายการประกาศในระบบ กดปุ่ม &quot;+ ลงประกาศใหม่&quot; เพื่อเริ่มสร้างประกาศแรกของคุณ
                      </td>
                    </tr>
                  ) : (
                    filteredProperties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-1 flex gap-3 items-center">
                          <Image src={p.image} alt="property" width={56} height={40} className="w-14 h-10 rounded-xl object-cover border shrink-0" unoptimized />
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{p.title}</h4>
                            <span className="text-blue-600 font-black text-[11px] block">{p.price}</span>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-center font-semibold text-slate-600 text-[11px]">
                          👁️ {p.views.toLocaleString()} ครั้ง | 📅 {p.appointments} นัด
                        </td>

                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                          </span>
                        </td>

                        <td className="py-3 px-1 text-right">
                          <div className="flex items-center justify-end gap-2 text-xs font-bold">
                            <button
                              onClick={() => setSelectedProperty(p)}
                              className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 font-bold rounded-lg transition cursor-pointer shadow-2xs"
                              title="ดูสถิติกราฟ shadcn/ui ของประกาศนี้"
                            >
                              📊 ดูสถิติ
                            </button>
                            <button
                              onClick={() => handleCopyLink(p.id)}
                              className="text-slate-600 hover:text-blue-600 transition cursor-pointer"
                              title="คัดลอกลิงก์ประกาศไปแชร์"
                            >
                              {copiedId === p.id ? '✓ คัดลอกแล้ว' : '🔗 แชร์'}
                            </button>
                            <Link href={`/agent/edit-property/${p.id}`} className="text-blue-600 hover:underline">แก้ไข</Link>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="text-red-500 hover:underline disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === p.id ? '...' : 'ลบ'}
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

          {/* ขวา: ตารางนัดหมายลูกค้าล่าสุด */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">📅 นัดหมายชมสถานที่ล่าสุด</h4>
              <Link href="/agent/appointments" className="text-blue-600 font-bold text-[11px]">ดูทั้งหมด</Link>
            </div>

            {(!dbData?.recentAppointments || dbData.recentAppointments.length === 0) ? (
              <p className="py-6 text-center text-slate-400 font-bold text-xs">ยังไม่มีรายการนัดหมายชมสถานที่ในขณะนี้</p>
            ) : (
              <div className="space-y-2.5">
                {dbData.recentAppointments.map(apt => (
                  <div key={apt.id} className="p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        {apt.customerName}
                      </span>
                      <a href={`tel:${apt.customerPhone}`} className="text-[10px] bg-blue-100 text-blue-800 font-black px-2 py-0.5 rounded-full hover:bg-blue-200 transition">
                        📞 {apt.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-700 font-medium line-clamp-1">🏠 {apt.propertyTitle}</p>
                    <span className="text-[10px] text-slate-400 block">🕒 {apt.timeSlot}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 📌 OFFICIAL shadcn/ui CHART MODAL: แสดงสถิติกราฟเชิงลึกรายบ้านตามหลัก UX/UI สากล */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-200 text-left border border-slate-100 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header: รูปบ้าน + ชื่อบ้าน + ราคา + สถานะ + ปุ่มปิด */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <Image src={selectedProperty.image} alt="prop" width={64} height={48} className="w-16 h-12 rounded-xl object-cover border shrink-0" unoptimized />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm md:text-base line-clamp-1">{selectedProperty.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-blue-600 font-black text-xs">{selectedProperty.price}</span>
                    <span className={`text-[9px] font-black px-2 py-0.2 rounded-full border ${selectedProperty.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {selectedProperty.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                    </span>
                  </div>
                  {selectedProperty.location && (
                    <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">📍 {selectedProperty.location}</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setSelectedProperty(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* สเปกอสังหาริมทรัพย์ย่อ (Bedrooms / Bathrooms / Area) */}
            <div className="flex items-center justify-around bg-slate-50 p-2.5 rounded-2xl text-[11px] font-bold text-slate-600 border border-slate-100">
              <span>🛏️ {selectedProperty.bedrooms || 0} ห้องนอน</span>
              <span className="text-slate-300">|</span>
              <span>🚿 {selectedProperty.bathrooms || 0} ห้องน้ำ</span>
              <span className="text-slate-300">|</span>
              <span>📐 {selectedProperty.area_sqm || 0} ตร.ม.</span>
            </div>

            {/* 4 Summary Cards: สถิติตัวเลข 4 ด้าน (จัดระเบียบ Hierarchy ให้อ่านง่าย ชัดเจน) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">เข้าชมรวม</span>
                <strong className="text-base font-black text-slate-900 block">👁️ {selectedProperty.views.toLocaleString()}</strong>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-0.5">
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">นัดชมสถานที่</span>
                <strong className="text-base font-black text-emerald-950 block">📅 {selectedProperty.appointments}</strong>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl space-y-0.5">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">ทักแชทสอบถาม</span>
                <strong className="text-base font-black text-blue-950 block">💬 {selectedProperty.chatsCount || 0}</strong>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-0.5">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">เซฟเป็นโปรด</span>
                <strong className="text-base font-black text-amber-950 block">⭐ {selectedProperty.savesCount || 0}</strong>
              </div>
            </div>

            {/* 💡 ฟีเจอร์วิเคราะห์Conversion Rate พิเศษ (Chat Rate & Booking Rate) */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100/70 space-y-1.5">
              <span className="text-[10px] font-extrabold text-blue-900 block">📊 วิเคราะห์อัตราการตัดสินใจของลูกค้า (Conversion Insights)</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-500 block">อัตราทักแชทสอบถาม:</span>
                  <strong className="text-sm font-black text-blue-600">{chatRate}%</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-500 block">อัตรานัดหมายชมบ้าน:</span>
                  <strong className="text-sm font-black text-emerald-600">{bookingRate}%</strong>
                </div>
              </div>
            </div>

            {/* 📊 OFFICIAL shadcn/ui CHART SECTION: กราฟแท่งเปรียบเทียบสถิติย่อยตามช่วงเวลา */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">📊 กราฟวิเคราะห์พฤติกรรมลูกค้า (Multiple Bar Chart)</h4>
                  <p className="text-[10px] text-slate-500">เปรียบเทียบความสนใจ: นัดหมาย, ทักแชท และ กดเซฟโปรด</p>
                </div>

                {/* Pill Tab Switcher สไตล์ UX/UI ยุคใหม่ */}
                <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setChartTimeframe('day')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${chartTimeframe === 'day' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายวัน (7 วัน)
                  </button>
                  <button
                    onClick={() => setChartTimeframe('month')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${chartTimeframe === 'month' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายเดือน (6 เดือน)
                  </button>
                  <button
                    onClick={() => setChartTimeframe('year')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${chartTimeframe === 'year' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายปี
                  </button>
                </div>
              </div>

              {/* การใช้องค์ประกอบแท้จาก shadcn/ui <ChartContainer /> สัดส่วนสมส่วน (h-48) */}
              <ChartContainer config={propertyModalChartConfig} className="h-48 w-full pt-1">
                <BarChart data={modalChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="timeframe" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="appointments" fill="var(--color-appointments)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="chats" fill="var(--color-chats)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saves" fill="var(--color-saves)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* Bottom Actions Bar (ปุ่มหลัก UX/UI ชัดเจน) */}
            <div className="flex items-center gap-2.5 pt-1">
              <Link 
                href={`/property/${selectedProperty.id}`} 
                target="_blank" 
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs text-center transition shadow-sm"
              >
                🔗 เปิดดูหน้าประกาศจริง
              </Link>
              <Link 
                href={`/agent/edit-property/${selectedProperty.id}`}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs text-center transition shadow-sm"
              >
                📝 แก้ไขประกาศ
              </Link>
            </div>

          </div>
        </div>
      )}

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}