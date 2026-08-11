'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';

interface AppointmentLead {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  customerName: string;
  customerPhone: string;
}

export interface PropertyData {
  id: string;
  title: string;
  price: string;
  type: string;
  status: 'approved' | 'pending' | 'rejected';
  rejectReason?: string | null;
  image: string;
  location?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqm?: number;
  views: number;
  appointments: number;
  chatsCount?: number;
  savesCount?: number;
  rawViews?: string[];
  rawAppointments?: string[];
  rawChats?: string[];
  rawSaves?: string[];
  appointmentLeads?: AppointmentLead[];
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

// คีย์วันที่แบบ local time (Asia/Bangkok ตามเครื่องผู้ใช้) เพื่อไม่ให้เพี้ยนข้ามวันแบบ UTC
const toLocalDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ตัดอักขระอื่นออกจากเบอร์โทร เหลือแต่ตัวเลขและ + นำหน้า ป้องกันลิงก์ tel: ผิดรูปแบบ
const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

interface PropertyStatsModalProps {
  property: PropertyData;
  onClose: () => void;
}

export default function PropertyStatsModal({ property, onClose }: PropertyStatsModalProps) {
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'month' | 'year'>('month');

  // 🎯 สถิติกราฟคำนวณตรงจากฐานข้อมูลจริงตามช่วงเวลา (วัน / เดือน / ปี)
  // ใช้ local date/time ล้วน (ไม่ผสม toISOString ที่เป็น UTC) เพื่อไม่ให้วันที่เพี้ยนข้ามเขตเวลา
  const modalChartData = useMemo(() => {
    const viewDates = (property.rawViews || []).map(d => new Date(d));
    const aptDates = (property.rawAppointments || []).map(d => new Date(d));
    const chatDates = (property.rawChats || []).map(d => new Date(d));
    const saveDates = (property.rawSaves || []).map(d => new Date(d));

    if (chartTimeframe === 'day') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayLabel = date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
        const dayKey = toLocalDayKey(date);

        const views = viewDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const apts = aptDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const chats = chatDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const saves = saveDates.filter(d => toLocalDayKey(d) === dayKey).length;

        result.push({ timeframe: dayLabel, views, appointments: apts, chats, saves });
      }
      return result;
    } else if (chartTimeframe === 'month') {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLabel = date.toLocaleDateString('th-TH', { month: 'short' });
        const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;

        const views = viewDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const apts = aptDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const chats = chatDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const saves = saveDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;

        result.push({ timeframe: monthLabel, views, appointments: apts, chats, saves });
      }
      return result;
    } else {
      const result = [];
      const currentYear = new Date().getFullYear();
      for (let i = 2; i >= 0; i--) {
        const year = currentYear - i;
        const yearLabel = (year + 543).toString();

        const views = viewDates.filter(d => d.getFullYear() === year).length;
        const apts = aptDates.filter(d => d.getFullYear() === year).length;
        const chats = chatDates.filter(d => d.getFullYear() === year).length;
        const saves = saveDates.filter(d => d.getFullYear() === year).length;

        result.push({ timeframe: yearLabel, views, appointments: apts, chats, saves });
      }
      return result;
    }
  }, [property, chartTimeframe]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-left border border-slate-100 max-h-[92vh] overflow-y-auto">

        {/* Modal Header: รูปบ้านใหญ่ + สเปก + ราคา + ทำเล + ปุ่มปิด */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
          <div className="flex items-center gap-4">
            <Image src={property.image} alt="prop" width={96} height={64} className="w-24 h-16 rounded-2xl object-cover border shrink-0 shadow-sm" unoptimized />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  property.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  property.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {property.status === 'approved' ? 'อนุมัติแล้ว' : property.status === 'rejected' ? '🔴 ถูกตีกลับ' : 'รอตรวจสอบ'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{property.type}</span>
              </div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg line-clamp-1 mt-0.5">{property.title}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-1">
                <span className="text-blue-600 font-black text-sm">{property.price}</span>
                {property.location && <span>📍 {property.location}</span>}
              </div>
              {property.status === 'rejected' && property.rejectReason && (
                <p className="text-xs text-red-600 font-bold mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  💬 เหตุผลที่ถูกตีกลับ: {property.rejectReason}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
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
                <span>🛏️ {property.bedrooms || 0} ห้อง</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ห้องน้ำ:</span>
                <span>🚿 {property.bathrooms || 0} ห้อง</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">พื้นที่ใช้สอย:</span>
                <span>📐 {property.area_sqm || 0} ตร.ม.</span>
              </div>
            </div>
          </div>

          {/* ขวา: 4 การ์ดสถิติตัวเลขระบุตาม DB จริง */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เข้าชมรวม</span>
              <strong className="text-xl font-black text-slate-900 block">👁️ {property.views.toLocaleString()}</strong>
              <span className="text-[9px] text-slate-400 font-semibold block">เปิดดูประกาศ</span>
            </div>

            <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">นัดชมสถานที่</span>
              <strong className="text-xl font-black text-emerald-950 block">📅 {property.appointments}</strong>
              <span className="text-[9px] text-emerald-600 font-semibold block">จองเข้าชมจริง</span>
            </div>

            <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">ทักแชทสอบถาม</span>
              <strong className="text-xl font-black text-blue-950 block">💬 {property.chatsCount || 0}</strong>
              <span className="text-[9px] text-blue-600 font-semibold block">แชทสอบถาม</span>
            </div>

            <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">เซฟเป็นโปรด</span>
              <strong className="text-xl font-black text-amber-950 block">⭐ {property.savesCount || 0}</strong>
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

        {/* 👥 รายชื่อลูกค้านัดหมายเข้าชมบ้านหลังนี้ */}
        <div className="bg-emerald-50/40 rounded-3xl border border-emerald-100 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
            <h4 className="font-extrabold text-emerald-950 text-xs md:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              👥 รายชื่อลูกค้านัดหมายชมบ้านหลังนี้
            </h4>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold">
              {property.appointmentLeads?.length || 0} รายการนัด
            </span>
          </div>

          {property.appointmentLeads && property.appointmentLeads.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {property.appointmentLeads.map((apt) => (
                <div key={apt.id} className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-2xs flex items-center justify-between">
                  <div>
                    <strong className="text-xs font-extrabold text-slate-900 block">{apt.customerName}</strong>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">🕒 วันที่ {apt.date} ({apt.timeSlot})</span>
                  </div>
                  <a
                    href={toTelHref(apt.customerPhone)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-[10px] transition shrink-0 shadow-xs"
                  >
                    📞 โทรหา
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-700/70 text-center py-3">ยังไม่มีลูกค้านัดชมบ้านหลังนี้</p>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href={`/property/${property.id}`}
            target="_blank"
            className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs sm:text-sm text-center transition shadow-md"
          >
            🔗 เปิดดูหน้าประกาศจริงหน้าร้าน
          </Link>
          <Link
            href={`/agent/edit-property/${property.id}`}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-2xl text-xs sm:text-sm text-center transition shadow-md"
          >
            📝 แก้ไขประกาศนี้
          </Link>
        </div>

      </div>
    </div>
  );
}
