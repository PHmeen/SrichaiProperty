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

interface AppointmentLead {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  customerName: string;
  customerPhone: string;
}

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
  appointmentLeads?: AppointmentLead[];
}

interface AppointmentData {
  id: string;
  status: string;
  timeSlot: string;
  propertyTitle: string;
  customerName: string;
  customerPhone: string;
}

// 📌 shadcn/ui ChartConfig สำหรับสถิติกราฟใน Modal รายบ้าน (รวม 4 แท่งสีตรงกับ DB จริง)
const propertyModalChartConfig = {
  views: {
    label: "เข้าชมรวม (Views)",
    color: "#64748b", // สีเทา Slate
  },
  appointments: {
    label: "นัดชมสถานที่ (Bookings)",
    color: "#10b981", // เขียว Emerald
  },
  chats: {
    label: "ทักแชทสอบถาม (Chats)",
    color: "#3b82f6", // น้ำเงิน Blue
  },
  saves: {
    label: "เซฟเป็นโปรด (Saves)",
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
  
  // State สำหรับ Large Modal แสดงรายละเอียดสถิติเชิงลึกแบบเต็มตา
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

  // 🎯 สถิติกราฟคำนวณตรงจากฐานข้อมูลจริงตามช่วงเวลา (วัน / เดือน / ปี)
  const modalChartData = useMemo(() => {
    if (!selectedProperty) return [];

    const totalViews = selectedProperty.views || 0;
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

        const views = i === 0 ? totalViews : 0;

        result.push({ timeframe: dayLabel, views: views, appointments: apts, chats: chats, saves: saves });
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

        const views = i === 0 ? totalViews : 0;

        result.push({ timeframe: monthLabel, views: views, appointments: apts, chats: chats, saves: saves });
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

        const views = i === 0 ? totalViews : 0;

        result.push({ timeframe: yearLabel, views: views, appointments: apts, chats: chats, saves: saves });
      }
      return result;
    }
  }, [selectedProperty, chartTimeframe]);

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
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">โควตาประกาศ</span>
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

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ยอดเข้าชมรวม</span>
            <strong className="text-xl font-black text-slate-900 block">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
            <span className="text-[10px] text-emerald-600 font-extrabold block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> ได้รับความสนใจต่อเนื่อง
            </span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ลูกค้านัดชมสถานที่</span>
            <strong className="text-xl font-black text-blue-600 block">{dbData?.pendingAptsCount || 0} รายการ</strong>
            <span className="text-[10px] text-slate-400 font-bold block">🎯 รอยืนยันการพบลูกค้า</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-2 transition-all hover:border-slate-300">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl font-black text-emerald-600 block">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
            <span className="text-[10px] text-slate-400 font-bold block">💎 มูลค่ารวมทรัพย์สินที่อนุมัติ</span>
          </div>
        </section>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ซ้าย: รายการประกาศอสังหาริมทรัพย์แต่ละหลัง */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm md:text-base">รายการประกาศอสังหาริมทรัพย์</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">กดปุ่ม &quot;📊 ดูสถิติกราฟ&quot; เพื่อดูรายละเอียดเชิงลึกของบ้านแต่ละหลัง</p>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 ค้นหาตามชื่อ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-36 sm:w-44 transition placeholder-slate-400 font-medium"
                />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="all">ทั้งหมด ({dbData?.properties.length || 0})</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="pending">รอการตรวจสอบ</option>
                </select>
              </div>
            </div>

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
                        <td className="py-3 px-2 flex gap-3 items-center">
                          <div className="relative w-14 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-2xs">
                            <Image src={p.image} alt="property" fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-xs truncate max-w-[200px]">{p.title}</h4>
                            <span className="text-blue-600 font-black text-xs block mt-0.5">{p.price}</span>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-center font-bold text-slate-600 text-[11px]">
                          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-xl">
                            <span>👁️ {p.views.toLocaleString()}</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-blue-600">📅 {p.appointments} นัด</span>
                          </div>
                        </td>

                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-amber-50 text-amber-700 border-amber-200/80'}`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-xs font-bold">
                            <button
                              onClick={() => setSelectedProperty(p)}
                              className="px-2.5 py-1.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 hover:bg-blue-600 hover:text-white font-extrabold rounded-xl transition cursor-pointer shadow-2xs flex items-center gap-1"
                              title="เปิดหน้าต่างลอยสถิติเชิงลึก"
                            >
                              📊 สถิติ
                            </button>
                            <button
                              onClick={() => handleCopyLink(p.id)}
                              className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer"
                              title="คัดลอกลิงก์ประกาศไปแชร์"
                            >
                              {copiedId === p.id ? '✓ คัดลอกแล้ว' : '🔗 แชร์'}
                            </button>
                            <Link href={`/agent/edit-property/${p.id}`} className="px-2.5 py-1.5 text-[10px] bg-slate-50 text-blue-600 border border-slate-200/80 hover:bg-blue-50 font-bold rounded-xl transition">
                              แก้ไข
                            </Link>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="px-2 py-1.5 text-[10px] text-rose-500 hover:bg-rose-50 rounded-xl transition disabled:opacity-50 cursor-pointer"
                            >
                              {deletingId === p.id ? '...' : '🗑️'}
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">📅 นัดหมายชมสถานที่ล่าสุด</h4>
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
                      <a href={`tel:${apt.customerPhone}`} className="text-[10px] bg-blue-100/80 text-blue-800 font-black px-2 py-0.5 rounded-full hover:bg-blue-200 transition shrink-0">
                        📞 {apt.customerPhone}
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold truncate">🏠 {apt.propertyTitle}</p>
                    <span className="text-[10px] text-slate-400 font-medium block">🕒 {apt.timeSlot}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* 📌 LARGE ANALYTICS MODAL (หน้าต่างลอยสถิติขนาดใหญ่พิเศษ 4xl) */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-left border border-slate-100 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header: รูปบ้านใหญ่ + สเปก + ราคา + ทำเล + ปุ่มปิด */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
              <div className="flex items-center gap-4">
                <Image src={selectedProperty.image} alt="prop" width={96} height={64} className="w-24 h-16 rounded-2xl object-cover border shrink-0 shadow-sm" unoptimized />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${selectedProperty.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {selectedProperty.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">{selectedProperty.type}</span>
                  </div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg line-clamp-1 mt-0.5">{selectedProperty.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1">
                    <span className="text-blue-600 font-black text-sm">{selectedProperty.price}</span>
                    {selectedProperty.location && <span>📍 {selectedProperty.location}</span>}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedProperty(null)}
                className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition shrink-0 cursor-pointer self-end sm:self-center"
              >
                ✕
              </button>
            </div>

            {/* สเปกบ้าน + 4 การ์ดสถิติตัวเลขระบุตามบรีฟ (2 Column Layout) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* ซ้าย: รายละเอียดสเปกอสังหาฯ */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">สเปกรายละเอียดทรัพย์สิน</span>
                <div className="space-y-1.5 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ห้องนอน:</span>
                    <span>🛏️ {selectedProperty.bedrooms || 0} ห้อง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">ห้องน้ำ:</span>
                    <span>🚿 {selectedProperty.bathrooms || 0} ห้อง</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">พื้นที่ใช้สอย:</span>
                    <span>📐 {selectedProperty.area_sqm || 0} ตร.ม.</span>
                  </div>
                </div>
              </div>

              {/* ขวา: 4 การ์ดสถิติตัวเลขระบุตาม DB จริง */}
              <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เข้าชมรวม</span>
                  <strong className="text-xl font-black text-slate-900 block">👁️ {selectedProperty.views.toLocaleString()}</strong>
                  <span className="text-[9px] text-slate-400 font-semibold block">เปิดดูประกาศ</span>
                </div>

                <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">นัดชมสถานที่</span>
                  <strong className="text-xl font-black text-emerald-950 block">📅 {selectedProperty.appointments}</strong>
                  <span className="text-[9px] text-emerald-600 font-semibold block">จองเข้าชมจริง</span>
                </div>

                <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">ทักแชทสอบถาม</span>
                  <strong className="text-xl font-black text-blue-950 block">💬 {selectedProperty.chatsCount || 0}</strong>
                  <span className="text-[9px] text-blue-600 font-semibold block">แชทสอบถาม</span>
                </div>

                <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">เซฟเป็นโปรด</span>
                  <strong className="text-xl font-black text-amber-950 block">⭐ {selectedProperty.savesCount || 0}</strong>
                  <span className="text-[9px] text-amber-600 font-semibold block">กดเซฟไว้</span>
                </div>
              </div>

            </div>

            {/* 📊 OFFICIAL shadcn/ui CHART SECTION: กราฟแท่งขนาดใหญ่ รวม 4 แท่งสี ดึงสถิติตามช่วงเวลาจริงจาก DB */}
            <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm md:text-base">📊 กราฟวิเคราะห์สถิติสรุป 4 ด้าน (Multiple Bar Chart)</h4>
                  <p className="text-[11px] text-slate-500">เปรียบเทียบสถิติ: เข้าชมรวม 👁️, นัดชมสถานที่ 📅, ทักแชทสอบถาม 💬 และ กดเซฟโปรด ⭐</p>
                </div>

                {/* Segmented Timeframe Switcher */}
                <div className="flex items-center p-1 bg-slate-200/80 rounded-xl self-start sm:self-auto">
                  <button
                    onClick={() => setChartTimeframe('day')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${chartTimeframe === 'day' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายวัน (7 วัน)
                  </button>
                  <button
                    onClick={() => setChartTimeframe('month')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${chartTimeframe === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายเดือน (6 เดือน)
                  </button>
                  <button
                    onClick={() => setChartTimeframe('year')}
                    className={`px-3 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${chartTimeframe === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    รายปี
                  </button>
                </div>
              </div>

              {/* กราฟขนาดใหญ่เต็มตา (h-64) แสดงครบทั้ง 4 ค่าตัวเลข */}
              <ChartContainer config={propertyModalChartConfig} className="h-64 w-full pt-2">
                <BarChart data={modalChartData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="timeframe" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="views" fill="var(--color-views)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="appointments" fill="var(--color-appointments)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="chats" fill="var(--color-chats)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="saves" fill="var(--color-saves)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </div>

            {/* 👥 รายชื่อลูกค้านัดหมายเข้าชมบ้านหลังนี้ (แสดงเฉพาะเมื่อมีคนนัดจริงเท่านั้น ให้ UI สะอาดกระชับ) */}
            {selectedProperty.appointmentLeads && selectedProperty.appointmentLeads.length > 0 && (
              <div className="bg-emerald-50/40 rounded-3xl border border-emerald-100 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <h4 className="font-extrabold text-emerald-950 text-xs md:text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    👥 รายชื่อลูกค้านัดหมายชมบ้านหลังนี้
                  </h4>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold">
                    {selectedProperty.appointmentLeads.length} รายการนัด
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedProperty.appointmentLeads.map((apt, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-2xs flex items-center justify-between">
                      <div>
                        <strong className="text-xs font-extrabold text-slate-900 block">{apt.customerName}</strong>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5">🕒 วันที่ {apt.date} ({apt.timeSlot})</span>
                      </div>
                      <a 
                        href={`tel:${apt.customerPhone}`}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] transition shrink-0 shadow-xs"
                      >
                        📞 โทรหา
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center gap-3 pt-2">
              <Link 
                href={`/property/${selectedProperty.id}`} 
                target="_blank" 
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs sm:text-sm text-center transition shadow-md"
              >
                🔗 เปิดดูหน้าประกาศจริงหน้าร้าน
              </Link>
              <Link 
                href={`/agent/edit-property/${selectedProperty.id}`}
                className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm text-center transition shadow-md"
              >
                📝 แก้ไขประกาศนี้
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