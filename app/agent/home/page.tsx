'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import PendingApprovalBanner from '@/components/agent/PendingApprovalBanner';
import { FREE_LISTING_QUOTA } from '@/lib/constants';
import { toast } from '@/components/ui/toast';
import {
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  Home,
  Plus,
  Check,
  Eye,
  Sparkles,
  ChevronRight,
  TrendingUp,
  User,
  Loader2,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  Building2,
  ExternalLink,
  FileText,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface AppointmentData {
  id: string;
  status: 'completed' | 'pending';
  rawStatus?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'no_show';
  date: string;
  time: string;
  timeSlot?: string;
  propertyId?: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyPrice?: number | null;
  propertyCode?: string;
  customerName: string;
  customerPhone: string;
  note?: string;
}

interface RecentPropertyData {
  id: string;
  title: string;
  price: number;
  viewsCount: number;
  status: string;
  image: string | null;
  listingType: string;
}

interface AgentProfileData {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialtyZone: string;
  experience: string;
  isVerified: boolean;
  avatar: string | null;
  agentCode: string;
}

export default function AgentHomePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'all' | 'completed'>('today');
  const [currentDate, setCurrentDate] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [dbData, setDbData] = useState<{
    propertiesCount: number;
    pendingAptsCount: number;
    pendingApprovalCount?: number;
    isPro?: boolean;
    totalViews: number;
    pendingChatCount: number;
    agentProfile?: AgentProfileData;
    recentProperties?: RecentPropertyData[];
    appointments: AppointmentData[];
    lowSlotProperties?: { propertyId: string; title: string; remainingSlots: number; lastAvailableDate: string | null }[];
  } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    document.title = 'หน้าหลักนายหน้า | Srichai Property';

    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const now = new Date();
    const formattedDate = `วัน${days[now.getDay()]}ที่ ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear() + 543}`;

    const timer = setTimeout(() => {
      setCurrentDate(formattedDate);
    }, 0);

    if (status === 'authenticated') {
      fetch('/api/agent/portal?type=home')
        .then(res => res.json())
        .then(data => {
          setDbData(data);
          // หากวันนี้ไม่มีนัดหมาย ให้เลือกแท็บ "รอนัดพบ" เป็นค่าเริ่มต้นโดยอัตโนมัติ เพื่อให้เห็นงานถัดไปทันที
          const todayStr = new Date().toISOString().split('T')[0];
          const hasToday = (data.appointments || []).some((a: AppointmentData) => a.date === todayStr);
          if (!hasToday) {
            setActiveTab('pending');
          }
        })
        .catch(err => {
          console.error('Error fetching home data:', err);
          setLoadError(true);
        })
        .finally(() => setIsLoadingData(false));
    }

    return () => clearTimeout(timer);
  }, [status]);

  // กดยืนยันรับนัดหมายจากหน้าแรกได้ทันที
  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      setConfirmingId(appointmentId);
      const res = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId, action: 'confirm' })
      });
      const data = await res.json();
      if (res.ok && (data.success || data.data)) {
        toast.success('ยืนยันรับนัดหมายเรียบร้อยแล้ว');
        setDbData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            pendingAptsCount: Math.max(0, prev.pendingAptsCount - 1),
            appointments: prev.appointments.map(apt =>
              apt.id === appointmentId
                ? { ...apt, rawStatus: 'approved', status: 'completed' }
                : apt
            )
          };
        });
      } else {
        toast.error(data.error || 'ไม่สามารถยืนยันนัดหมายได้');
      }
    } catch (err) {
      console.error('Confirm appointment error:', err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setConfirmingId(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-semibold">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  // หน้าจอสำหรับนายหน้าที่รอการอนุมัติบัญชีจากแอดมิน
  if (session?.user?.status === 'pending') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl max-w-md space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-slate-900">บัญชีอยู่ระหว่างการตรวจสอบ</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            ทีมงานกำลังตรวจสอบข้อมูลและเอกสารของคุณ เมื่อเรียบร้อยแล้วระบบจะเปิดสิทธิ์ให้เข้าใช้งานเต็มรูปแบบทันที
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

  const appointments = dbData?.appointments || [];
  const todayKey = new Date().toISOString().split('T')[0];

  // จำแนกรายการนัดหมาย
  const todayAptsList = appointments.filter(a => a.date === todayKey);
  const pendingAptsList = appointments.filter(a => a.rawStatus === 'pending');
  const upcomingAptsList = appointments.filter(a => a.status === 'pending' || a.rawStatus === 'approved');
  const completedAptsList = appointments.filter(a => a.status === 'completed' && a.rawStatus !== 'pending');

  const filteredApts = (
    activeTab === 'today' ? todayAptsList :
    activeTab === 'pending' ? upcomingAptsList :
    activeTab === 'completed' ? completedAptsList :
    appointments
  ).slice(0, 8);

  const pendingApprovalCount = dbData?.pendingApprovalCount || 0;
  const pendingChatCount = dbData?.pendingChatCount || 0;
  const lowSlotProperties = dbData?.lowSlotProperties || [];
  const propertiesCount = dbData?.propertiesCount || 0;
  const isPro = Boolean(dbData?.isPro);
  const quotaRemaining = Math.max(0, FREE_LISTING_QUOTA - propertiesCount);
  const quotaPercentage = isPro ? 100 : Math.min(100, Math.round((propertiesCount / FREE_LISTING_QUOTA) * 100));

  const profile = dbData?.agentProfile;
  const agentDisplayName = profile?.name || session?.user?.name || 'นายหน้า';
  const recentProperties = dbData?.recentProperties || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 text-xs md:text-sm font-sans antialiased pb-16">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 text-left">

        {/* 1. Header บ่งบอกตัวตนนายหน้าแบบสุภาพ สะอาดตา (Human-Crafted Identity Bar) */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* ฝั่งซ้าย: รูปโปรไฟล์ + ชื่อ + รหัสตัวแทน + สถานะ */}
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {profile?.avatar ? (
                  <Image
                    src={profile.avatar}
                    alt={agentDisplayName}
                    width={56}
                    height={56}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                    unoptimized
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-black text-xl shadow-2xs">
                    {agentDisplayName.charAt(0)}
                  </div>
                )}
                {isPro && (
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-2xs uppercase">
                    PRO
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-slate-900">
                    สวัสดีครับคุณ{agentDisplayName.split(' ')[0]}
                  </h1>
                  {profile?.agentCode && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md">
                      {profile.agentCode}
                    </span>
                  )}
                  {profile?.isVerified && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>ยืนยันตัวตนแล้ว</span>
                    </span>
                  )}
                </div>

                <p className="text-slate-500 text-xs font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{currentDate}</span>
                  <span className="text-slate-300">•</span>
                  <span>
                    {todayAptsList.length > 0
                      ? `วันนี้มีนัดชมบ้าน ${todayAptsList.length} รายการ`
                      : 'วันนี้ไม่มีคิวนัดหมาย'}
                  </span>
                  {pendingChatCount > 0 && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-emerald-700 font-bold">แชทรอตอบ {pendingChatCount} ข้อความ</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* ฝั่งขวา: ปุ่มลัดเข้าดูโปรไฟล์สาธารณะที่ลูกค้าเห็น */}
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <Link
                href="/agent/profile"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition"
              >
                <span>จัดการโปรไฟล์ของฉัน</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>

          </div>
        </section>

        {/* แบนเนอร์แจ้งเตือนประกาศรออนุมัติ (ถ้ามี) */}
        <PendingApprovalBanner pendingCount={pendingApprovalCount} />

        {/* 2. โครงสร้างหลักแบบ 2 คอลัมน์ (Asymmetrical Pro Layout: ซ้าย 8 / ขวา 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ================================================================= */}
          {/* คอลัมน์ซ้าย (lg:col-span-8): พื้นที่ปฏิบัติงานประจำวันของนายหน้า */}
          {/* ================================================================= */}
          <div className="lg:col-span-8 space-y-6">

            {/* 2.1 แถบปุ่มลัดงานด่วน (Quick Action Launchpad) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  ทางลัดสำหรับนายหน้า
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* 1. ลงประกาศใหม่ */}
                <Link
                  href="/agent/add-property"
                  className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 hover:bg-amber-100/60 transition group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center mb-2 shadow-2xs group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <strong className="text-xs font-bold text-slate-900 group-hover:text-amber-900 transition">
                    ลงประกาศใหม่
                  </strong>
                  <span className="text-[10px] text-slate-500 mt-0.5">เพิ่มบ้านเข้าพอร์ต</span>
                </Link>

                {/* 2. ตารางวันว่าง */}
                <Link
                  href="/agent/schedule"
                  className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-blue-50/50 hover:border-blue-200 transition group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <CalendarDays className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <strong className="text-xs font-bold text-slate-900 group-hover:text-blue-800 transition">
                    ตั้งวันว่างรับนัด
                  </strong>
                  <span className="text-[10px] text-slate-500 mt-0.5">เปิดรอบให้จอง</span>
                </Link>

                {/* 3. ตอบแชทลูกค้า */}
                <Link
                  href="/agent/chat"
                  className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition group relative cursor-pointer"
                >
                  {pendingChatCount > 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-500 text-white font-black text-[9px] rounded-full shadow-xs">
                      {pendingChatCount}
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <strong className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition">
                    ตอบแชทลูกค้า
                  </strong>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {pendingChatCount > 0 ? `รอตอบ ${pendingChatCount} คน` : 'เปิดกล่องข้อความ'}
                  </span>
                </Link>

                {/* 4. จัดการประกาศ */}
                <Link
                  href="/agent/dashboard"
                  className="flex flex-col items-center justify-center text-center p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 transition group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Building2 className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <strong className="text-xs font-bold text-slate-900 group-hover:text-indigo-800 transition">
                    คลังประกาศ
                  </strong>
                  <span className="text-[10px] text-slate-500 mt-0.5">สต็อก {propertiesCount} รายการ</span>
                </Link>
              </div>
            </section>

            {/* 2.2 คิวนัดหมายพาลูกค้าชมบ้านจริง (Live Site-Visit Appointments) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>ตารางนัดหมายพาลูกค้าชมบ้าน</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    คิวงานนำชมโครงการจริง กดยืนยันรับนัดหรือโทรหาลูกค้าได้ทันที
                  </p>
                </div>
                <Link
                  href="/agent/appointments"
                  className="text-blue-600 hover:text-blue-700 font-bold text-xs inline-flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>จัดการคิวทั้งหมด ({appointments.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* แถบกรองสถานะนัดหมาย */}
              <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'today'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>วันนี้ ({todayAptsList.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  รอนัดพบ / ที่จะถึง ({upcomingAptsList.length})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ทั้งหมด ({appointments.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeTab === 'completed'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  เสร็จสิ้นแล้ว ({completedAptsList.length})
                </button>
              </div>

              {/* รายการนัดหมายพร้อมรูปภาพหน้าปกบ้าน */}
              <div className="p-4 sm:p-5 space-y-3">
                {isLoadingData ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : loadError ? (
                  <div className="py-10 text-center text-red-500 font-bold space-y-1">
                    <p>โหลดข้อมูลนัดหมายไม่สำเร็จ</p>
                    <p className="text-xs text-slate-400 font-normal">กรุณาลองรีเฟรชหน้านี้ใหม่อีกครั้ง</p>
                  </div>
                ) : filteredApts.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-700">
                        {activeTab === 'today'
                          ? 'ไม่มีคิวนัดหมายสำหรับวันนี้'
                          : 'ไม่มีรายการนัดหมายในหมวดหมู่นี้'}
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        แนะนำให้เปิดวันว่างรับนัดสำหรับวันหยุดสุดสัปดาห์ เพื่อให้ลูกค้าสามารถเลือกจองเข้าชมได้สะดวกขึ้น
                      </p>
                    </div>
                    <Link
                      href="/agent/schedule"
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
                    >
                      <span>เปิดวันว่างรับนัด</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ) : (
                  filteredApts.map((apt) => {
                    const isToday = apt.date === todayKey;
                    const isPendingAction = apt.rawStatus === 'pending';

                    return (
                      <div
                        key={apt.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row gap-4 ${
                          isToday
                            ? 'bg-blue-50/30 border-blue-200/90 shadow-2xs hover:border-blue-300'
                            : 'bg-white border-slate-200/80 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        {/* รูปหน้าปกบ้านจิ๋ว (Thumbnail) */}
                        <div className="w-full sm:w-24 h-28 sm:h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
                          {apt.propertyImage ? (
                            <Image
                              src={apt.propertyImage}
                              alt={apt.propertyTitle}
                              fill
                              sizes="(max-width: 640px) 100vw, 96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                              <Home className="w-6 h-6" />
                              <span className="text-[9px]">ไม่มีภาพ</span>
                            </div>
                          )}
                        </div>

                        {/* ข้อมูลนัดหมาย & ลูกค้า */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {isToday && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-600 text-white inline-flex items-center gap-1 shadow-2xs">
                                <Clock className="w-2.5 h-2.5" /> นัดวันนี้
                              </span>
                            )}

                            <span className="text-[11px] font-bold px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-slate-700 inline-flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              <span>{apt.date} ({apt.time})</span>
                            </span>

                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                apt.rawStatus === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isPendingAction
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {apt.rawStatus === 'completed'
                                ? 'เสร็จสิ้นแล้ว'
                                : isPendingAction
                                ? 'รอยืนยันรับนัด'
                                : 'ยืนยันนัดแล้ว'}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                            {apt.propertyTitle}
                            {apt.propertyPrice ? (
                              <span className="text-amber-700 ml-1.5 font-black">
                                (฿{apt.propertyPrice.toLocaleString()})
                              </span>
                            ) : null}
                          </h3>

                          <p className="text-slate-600 text-xs font-medium inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>ลูกค้า: <strong className="text-slate-900">{apt.customerName}</strong></span>
                          </p>

                          {/* โน้ตบันทึกเพิ่มเติมจากลูกค้า (ถ้ามี) */}
                          {apt.note && (
                            <div className="text-[11px] text-slate-600 bg-slate-50/90 border border-slate-200/60 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                              <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1 italic">“{apt.note}”</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons ฝั่งขวา */}
                        <div className="flex sm:flex-col items-center justify-end sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {isPendingAction && (
                            <button
                              onClick={() => handleConfirmAppointment(apt.id)}
                              disabled={confirmingId === apt.id}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              {confirmingId === apt.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              )}
                              <span>ยืนยันรับนัด</span>
                            </button>
                          )}

                          {apt.customerPhone ? (
                            <a
                              href={`tel:${apt.customerPhone}`}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-2xs active:scale-95"
                            >
                              <Phone className="w-3 h-3" />
                              <span>โทรหา</span>
                            </a>
                          ) : null}

                          <Link
                            href="/agent/chat"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-600" />
                            <span>แชท</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 2.3 ประกาศล่าสุดในพอร์ตของคุณ (Recent Listings Preview) */}
            {recentProperties.length > 0 && (
              <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span>ประกาศล่าสุดในพอร์ตของคุณ</span>
                  </h2>
                  <Link href="/agent/dashboard" className="text-blue-600 hover:text-blue-700 font-bold text-xs">
                    ดูสต็อกทั้งหมด ({propertiesCount}) →
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recentProperties.map((p) => (
                    <Link
                      key={p.id}
                      href={`/agent/edit-property/${p.id}`}
                      className="group border border-slate-200/80 hover:border-slate-300 rounded-xl p-2.5 transition block bg-slate-50/40 hover:bg-white"
                    >
                      <div className="w-full h-24 rounded-lg bg-slate-200 overflow-hidden relative mb-2">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.title}
                            fill
                            sizes="(max-width: 640px) 100vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <Home className="w-5 h-5" />
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white font-bold text-[9px] rounded">
                          {p.listingType === 'rent' ? 'ให้เช่า' : 'ขาย'}
                        </span>
                      </div>
                      <p className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-600 transition">
                        {p.title}
                      </p>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <strong className="text-amber-700 font-black">
                          ฿{p.price.toLocaleString()}
                        </strong>
                        <span className="text-slate-400 flex items-center gap-0.5 text-[10px]">
                          <Eye className="w-3 h-3" /> {p.viewsCount}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ================================================================= */}
          {/* คอลัมน์ขวา (lg:col-span-4): แผงตรวจสอบสถานะพอร์ตและงานเร่งด่วน */}
          {/* ================================================================= */}
          <div className="lg:col-span-4 space-y-6">

            {/* 3.1 การ์ดโควต้าลงประกาศและสถานะแพ็กเกจ (Inventory & Quota Card) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  โควต้าลงประกาศ
                </span>
                {isPro ? (
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md border border-amber-300 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> PRO สมาชิก
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500">
                    แพ็กเกจฟรีทั่วไป
                  </span>
                )}
              </div>

              <div>
                {isPro ? (
                  <div className="space-y-1">
                    <strong className="text-2xl font-black text-slate-900 block">ลงได้ไม่จำกัด</strong>
                    <p className="text-xs text-slate-500">
                      คุณสามารถลงประกาศขายและเช่าอสังหาฯ ได้ไม่จำกัดจำนวน
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <strong className="text-2xl font-black text-slate-900">
                        {propertiesCount}{' '}
                        <span className="text-xs font-bold text-slate-400">/ {FREE_LISTING_QUOTA} รายการ</span>
                      </strong>
                      <span className="text-xs font-bold text-amber-600">
                        {quotaRemaining === 0 ? 'เต็มโควต้า' : `เหลืออีก ${quotaRemaining}`}
                      </span>
                    </div>

                    {/* หลอดแสดงความจุโควต้า */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          quotaPercentage >= 100 ? 'bg-red-500' : quotaPercentage >= 80 ? 'bg-amber-500' : 'bg-slate-900'
                        }`}
                        style={{ width: `${quotaPercentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {!isPro && (
                <Link
                  href="/agent/upgrade"
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-2xs"
                >
                  <span>อัปเกรดเป็น PRO Agent</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </section>

            {/* 3.2 ภาพรวมสุขภาพพอร์ตและยอดเข้าชม (Portfolio Highlights) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                ภาพรวมพอร์ตของคุณ
              </span>

              <div className="divide-y divide-slate-100">
                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span>ยอดเข้าชมประกาศสะสม</span>
                  </div>
                  <strong className="font-extrabold text-slate-900 text-sm">
                    {(dbData?.totalViews || 0).toLocaleString()} ครั้ง
                  </strong>
                </div>

                <div className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>ประกาศในระบบทั้งหมด</span>
                  </div>
                  <strong className="font-extrabold text-slate-900 text-sm">
                    {propertiesCount} รายการ
                  </strong>
                </div>

                {pendingApprovalCount > 0 && (
                  <div className="py-2.5 flex items-center justify-between text-amber-700">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>รอแอดมินอนุมัติ</span>
                    </div>
                    <strong className="font-black text-sm">
                      {pendingApprovalCount} รายการ
                    </strong>
                  </div>
                )}
              </div>
            </section>

            {/* 3.3 กล่องเตือนงานด่วน (Attention Required) */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                สิ่งที่ควรตรวจสอบ (Action Items)
              </span>

              {lowSlotProperties.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold">
                        มี {lowSlotProperties.length} ประกาศที่วันว่างใกล้หมด
                      </p>
                      <p className="text-[10px] text-amber-800 leading-tight">
                        ลูกค้าจะไม่สามารถจองคิวได้ แนะนำให้เปิดรอบเข้าชมเพิ่ม
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {lowSlotProperties.slice(0, 3).map(p => (
                      <li key={p.propertyId} className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                        <span className="truncate text-slate-800 font-medium text-[11px]">{p.title}</span>
                        <Link
                          href={`/agent/schedule?propertyId=${p.propertyId}`}
                          className="shrink-0 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          เปิดรอบ →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : pendingChatCount > 0 ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl text-emerald-900">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold">มี {pendingChatCount} แชทใหม่รอนายหน้าตอบ</span>
                  </div>
                  <Link href="/agent/chat" className="text-xs font-black text-emerald-700 hover:underline">
                    ตอบทันที →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200/60 rounded-xl text-slate-600 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ไม่มีงานค้างด่วนในขณะนี้ คุณพร้อมรับลูกค้าได้เต็มที่</span>
                </div>
              )}
            </section>

          </div>

        </div>

      </main>
    </div>
  );
}
