'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FREE_LISTING_QUOTA } from '@/lib/constants';

import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import UpgradeProModal from '@/components/agent/UpgradeProModal';
import PropertyStatsModal, { PropertyData } from '@/components/agent/dashboard/PropertyStatsModal';

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
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // State สำหรับ Large Modal แสดงรายละเอียดสถิติเชิงลึกแบบเต็มตา
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);

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
  const isLoadingDashboard = !dbData && !dashboardError;

  const loadDashboard = useCallback(() => {
    fetch('/api/agent/portal?type=dashboard')
      .then(res => {
        if (!res.ok) throw new Error('โหลดข้อมูลแผงควบคุมไม่สำเร็จ');
        return res.json();
      })
      .then(data => {
        setDashboardError(null);
        setDbData(data);
      })
      .catch(err => {
        console.error('Error fetching dashboard:', err);
        setDashboardError('ไม่สามารถโหลดข้อมูลแผงควบคุมได้ กรุณาลองใหม่อีกครั้ง');
      });
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadDashboard();
    else if (status === 'unauthenticated') router.replace('/login/agent');
  }, [status, loadDashboard, router]);

  // ตัดอักขระอื่นออกจากเบอร์โทร เหลือแต่ตัวเลขและ + นำหน้า ป้องกันลิงก์ tel: ผิดรูปแบบ
  const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

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
                          filterType === 'pending' ? p.status === 'pending' :
                          filterType === 'rejected' ? p.status === 'rejected' : true;
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const isPro = dbData?.isPro || false;
  const remainingQuota = Math.max(0, FREE_LISTING_QUOTA - (dbData?.totalCount || 0));

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

        {/* สถานะโหลดข้อมูล / ข้อผิดพลาดจากการเชื่อมต่อ API */}
        {isLoadingDashboard && !dbData && (
          <section className="bg-white rounded-2xl p-4 border border-slate-200/80 flex items-center gap-3 text-slate-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
            กำลังโหลดข้อมูลแผงควบคุม...
          </section>
        )}
        {dashboardError && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-red-700">
            <span>⚠️ {dashboardError}</span>
            <button onClick={loadDashboard} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[11px] shrink-0 border-0 cursor-pointer">
              ลองใหม่
            </button>
          </section>
        )}

        {/* 4 Cards Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <option value="rejected">ถูกตีกลับ</option>
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
                          <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            p.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200/80' :
                            'bg-amber-50 text-amber-700 border-amber-200/80'
                          }`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : p.status === 'rejected' ? '🔴 ถูกตีกลับ' : 'รอตรวจสอบ'}
                          </span>
                          {p.status === 'rejected' && p.rejectReason && (
                            <p className="text-[9px] text-red-500 font-bold mt-1 line-clamp-2 max-w-[140px] mx-auto" title={p.rejectReason}>
                              {p.rejectReason}
                            </p>
                          )}
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
                      <a href={toTelHref(apt.customerPhone)} className="text-[10px] bg-blue-100/80 text-blue-800 font-black px-2 py-0.5 rounded-full hover:bg-blue-200 transition shrink-0">
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

      {selectedProperty && (
        <PropertyStatsModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}
