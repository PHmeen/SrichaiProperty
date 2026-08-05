'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import UpgradeProModal from '@/components/agent/UpgradeProModal';

interface PropertyData {
  id: string;
  title: string;
  price: string;
  type: string;
  status: 'approved' | 'pending';
  image: string;
  views: number;
  appointments: number;
}

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
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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
    if (!confirm('ยืนยันลบประกาศนี้หรือไม่?')) return;
    setDeletingId(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' });
      if (res.ok) loadDashboard();
      else alert('ลบประกาศไม่สำเร็จ');
    } catch {
      alert('เกิดข้อผิดพลาด');
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
    <div className="pt-16 min-h-screen bg-slate-50 text-slate-800 text-xs md:text-sm">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Banner รออนุมัติประกาศ */}
        <PendingApprovalBanner
          pendingCount={dbData?.pendingApprovalCount || 0}
          onViewPending={() => setFilterType('pending')}
        />

        {/* Banner PRO ชวนอัปเกรด (ถ้ายังไม่เป็น PRO) */}
        {!isPro && (
          <section className="bg-slate-900 rounded-3xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <h4 className="font-bold text-sm text-amber-400">อัปเกรดเป็น Verified PRO</h4>
                <p className="text-slate-400 text-[11px]">ลงประกาศได้ไม่จำกัดจำนวน พร้อมรับสิทธิ์การดันโพสต์พิเศษ</p>
              </div>
            </div>
            <button onClick={() => setShowUpgradeModal(true)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shrink-0 cursor-pointer">
              อัปเกรด (599.-/เดือน)
            </button>
          </section>
        )}

        {/* Title Bar & Main Actions */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900">ภาพรวมการทำงาน ({user?.name || 'นายหน้า'}) 👋</h2>
            <p className="text-slate-500 text-xs mt-0.5">จัดการประกาศและติดตามลูกค้านัดหมาย</p>
          </div>
          <Link href="/agent/add-property" className="bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-sm transition">
            + ลงประกาศใหม่ {isPro ? '(สิทธิ์ PRO ไม่จำกัด)' : `(เหลือ ${remainingQuota} สิทธิ์ฟรี)`}
          </Link>
        </section>

        {/* Stats Grid - 4 การ์ดสรุปสถิติจำเป็น */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">ประกาศของคุณ</span>
            <strong className="text-xl font-black text-slate-900 block mt-1">
              {dbData?.totalCount || 0} {isPro ? 'ประกาศ (PRO)' : '/ 3'}
            </strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">ยอดเข้าชมรวม</span>
            <strong className="text-xl font-black text-slate-900 block mt-1">{(dbData?.totalViews || 0).toLocaleString()} ครั้ง</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">ลูกค้านัดหมายชมบ้าน</span>
            <strong className="text-xl font-black text-blue-600 block mt-1">{dbData?.pendingAptsCount || 0} รายการ</strong>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">มูลค่าพอร์ตโฟลิโอ</span>
            <strong className="text-xl font-black text-emerald-600 block mt-1">{dbData?.totalPortfolioValue || '0.0 ลบ.'}</strong>
          </div>
        </section>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* ซ้าย: ตารางประกาศอสังหาฯ */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm md:text-base">รายการประกาศอสังหาฯ</h3>
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="🔍 ค้นชื่อประกาศ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border rounded-xl px-3 py-1 text-xs text-slate-700 outline-none focus:border-blue-500 w-36 sm:w-40"
                />
                <select 
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-slate-50 border rounded-xl px-3 py-1 text-xs font-semibold text-slate-700 outline-none"
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
                  <tr className="border-b text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-1">อสังหาริมทรัพย์</th>
                    <th className="py-2.5 px-2 text-center">คนดู / นัดหมาย</th>
                    <th className="py-2.5 px-2 text-center">สถานะ</th>
                    <th className="py-2.5 px-1 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProperties.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">ไม่พบรายการประกาศ</td>
                    </tr>
                  ) : (
                    filteredProperties.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-1 flex gap-3 items-center">
                          <Image src={p.image} alt="property" width={56} height={40} className="w-14 h-10 rounded-xl object-cover border shrink-0" unoptimized />
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs line-clamp-1">{p.title}</h4>
                            <span className="text-blue-600 font-black text-[11px] block">{p.price}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-600 text-[11px]">
                          👁️ {p.views} | 📅 {p.appointments}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${p.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {p.status === 'approved' ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                          </span>
                        </td>
                        <td className="py-3 px-1 text-right">
                          <div className="flex items-center justify-end gap-2.5 text-xs font-bold">
                            <button
                              onClick={() => handleCopyLink(p.id)}
                              className="text-slate-600 hover:text-blue-600 transition"
                              title="คัดลอกลิงก์ประกาศไปแชร์"
                            >
                              {copiedId === p.id ? '✓ สำเนาแล้ว' : '🔗 แชร์'}
                            </button>
                            <Link href={`/agent/edit-property/${p.id}`} className="text-blue-600 hover:underline">แก้ไข</Link>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="text-red-500 hover:underline disabled:opacity-50"
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
              <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">📅 ลูกค้านัดหมายล่าสุด</h4>
              <Link href="/agent/appointments" className="text-blue-600 font-bold text-[11px]">ดูทั้งหมด</Link>
            </div>

            {(!dbData?.recentAppointments || dbData.recentAppointments.length === 0) ? (
              <p className="py-6 text-center text-slate-400 font-bold text-xs">ยังไม่มีนัดหมายล่าสุด</p>
            ) : (
              <div className="space-y-2.5">
                {dbData.recentAppointments.map(apt => (
                  <div key={apt.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>{apt.customerName}</span>
                      <span className="text-[10px] text-blue-600 font-black">📞 {apt.customerPhone}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">🏠 {apt.propertyTitle}</p>
                    <span className="text-[10px] text-slate-400 block">🕒 {apt.timeSlot}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={loadDashboard}
      />
    </div>
  );
}