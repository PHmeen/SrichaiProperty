'use client';

/**
 * ==============================================================================
 * หน้าต่างลอยแสดงสถิติอสังหาริมทรัพย์เชิงลึก (Property Stats Modal Component)
 * ==============================================================================
 * ไฟล์: components/agent/dashboard/PropertyStatsModal.tsx
 * ประเภท: React Client Component ('use client')
 * 
 * หน้าที่หลัก (Main Responsibilities):
 * 1. แสดงผล Pop-up Modal รายละเอียดเชิงลึกของอสังหาริมทรัพย์หลังที่เลือก
 * 2. แสดงตัวเลขสรุป KPI 4 ด้าน: เข้าชมรวม, นัดชมสถานที่, ทักแชทสอบถาม, กดเซฟเป็นทรัพย์โปรด
 * 3. ประมวลผลและวาดกราฟแท่ง (Recharts Multi-Bar Chart) เปรียบเทียบสถิติตามช่วงเวลา (รายวัน / รายเดือน / รายปี)
 * 4. แสดงรายชื่อลูกค้าผู้ขอ นัดหมายชมบ้านหลังนี้ (Customer Appointment Leads) พร้อมปุ่มกดโทรออกทันที
 * ==============================================================================
 */

import { useMemo, useState } from 'react';
import Link from 'next/link'; // ใช้ลิงก์ไปหน้าประกาศสาธารณะและหน้าแก้ไขทรัพย์ในส่วนปุ่มด้านล่าง
import Image from 'next/image'; // ใช้แสดงรูปหน้าปกทรัพย์ในหัวข้อของโมดัล
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'; // ใช้สร้างกราฟแท่งเปรียบเทียบสถิติหลายชุด
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart'; // ชุด wrapper/tooltip/legend ของ shadcn สำหรับตกแต่งกราฟ Recharts

// --------------------------------------------------------------------------
// [ส่วนที่ 1: การกำหนดโครงสร้างข้อมูล (TypeScript Interfaces & Types)]
// --------------------------------------------------------------------------

// 1.1 โครงสร้างข้อมูลรายชื่อลูกค้านัดหมายชมสถานที่ (Appointment Lead)
interface AppointmentLead {
  id: string;
  date: string;
  timeSlot: string;
  status: string;
  customerName: string;
  customerPhone: string;
}

// 1.2 โครงสร้างข้อมูลอสังหาริมทรัพย์ (Property Data) สำหรับนำมาแสดงใน Modal
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
  rawViews?: string[];         // รายการ Timestamp เวลาคนเปิดดู
  rawAppointments?: string[];  // รายการ Timestamp เวลานัดหมาย
  rawChats?: string[];         // รายการ Timestamp เวลาทักแชท
  rawSaves?: string[];         // รายการ Timestamp เวลากดเซฟ
  appointmentLeads?: AppointmentLead[]; // รายชื่อลูกค้านัดหมายเฉพาะบ้านหลังนี้
}

// --------------------------------------------------------------------------
// [ส่วนที่ 2: การตั้งค่ากราฟและการแปลงรูปแบบข้อมูล (Chart Config & Helpers)]
// --------------------------------------------------------------------------

// 2.1 การตั้งค่าสีและข้อความกำกับสำหรับ shadcn/ui Chart (รองรับ 4 แท่งสถิติ)
const propertyModalChartConfig = {
  views: {
    label: "เข้าชมรวม (Views)",
    color: "#64748b", // สีเทา Slate
  },
  appointments: {
    label: "นัดชมสถานที่ (Bookings)",
    color: "#10b981", // สีเขียว Emerald
  },
  chats: {
    label: "ทักแชทสอบถาม (Chats)",
    color: "#3b82f6", // สีน้ำเงิน Blue
  },
  saves: {
    label: "เซฟเป็นโปรด (Saves)",
    color: "#f59e0b", // สีส้ม Amber
  },
} satisfies ChartConfig;

// 2.2 ฟังก์ชันสร้าง Key วันที่ในระบบเวลาท้องถิ่น (Local Time: YYYY-MM-DD)
// ช่วยป้องกันปัญหาวันที่เพี้ยนข้ามวันอันเกิดจากการใช้ toISOString() ของ UTC
const toLocalDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 2.3 ฟังก์ชันตัดอักขระพิเศษออกจากเบอร์โทรศัพท์ เพื่อสร้าง href "tel:xxx" ที่ถูกต้อง
const toTelHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// 2.4 Props ที่ส่งเข้ามายัง Modal
interface PropertyStatsModalProps {
  property: PropertyData;
  onClose: () => void;
}

// --------------------------------------------------------------------------
// [ส่วนที่ 3: คอมโพเนนต์หลัก PropertyStatsModal]
// --------------------------------------------------------------------------
export default function PropertyStatsModal({ property, onClose }: PropertyStatsModalProps) {
  // State เลือกช่วงเวลาของกราฟ: 'day' (รายวัน 7 วัน) | 'month' (รายเดือน 6 เดือน) | 'year' (รายปี 3 ปี)
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'month' | 'year'>('month');

  // --------------------------------------------------------------------------
  // [ส่วนที่ 4: การประมวลผลข้อมูลสถิติกราฟ (Data Aggregation with useMemo)]
  // --------------------------------------------------------------------------
  // คำนวณแจกแจงจำนวน Timestamp ออกตามช่วงเวลาจริง (วัน/เดือน/ปี)
  const modalChartData = useMemo(() => {
    // แปลง String ISO Timestamp ใน Array เป็น Date Object
    const viewDates = (property.rawViews || []).map(d => new Date(d));
    const aptDates = (property.rawAppointments || []).map(d => new Date(d));
    const chatDates = (property.rawChats || []).map(d => new Date(d));
    const saveDates = (property.rawSaves || []).map(d => new Date(d));

    // 4.1 กรณีเลือกดูแบบ "รายวัน" (ย้อนหลัง 7 วัน)
    if (chartTimeframe === 'day') {
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayLabel = date.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
        const dayKey = toLocalDayKey(date);

        // นับจำนวนรายการที่ตรงกับวันที่นั้นๆ
        const views = viewDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const apts = aptDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const chats = chatDates.filter(d => toLocalDayKey(d) === dayKey).length;
        const saves = saveDates.filter(d => toLocalDayKey(d) === dayKey).length;

        result.push({ timeframe: dayLabel, views, appointments: apts, chats, saves });
      }
      return result;

    // 4.2 กรณีเลือกดูแบบ "รายเดือน" (ย้อนหลัง 6 เดือน)
    } else if (chartTimeframe === 'month') {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthLabel = date.toLocaleDateString('th-TH', { month: 'short' });
        const yearMonth = `${date.getFullYear()}-${date.getMonth()}`;

        // นับจำนวนรายการที่ตรงกับปี-เดือนนั้นๆ
        const views = viewDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const apts = aptDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const chats = chatDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;
        const saves = saveDates.filter(d => `${d.getFullYear()}-${d.getMonth()}` === yearMonth).length;

        result.push({ timeframe: monthLabel, views, appointments: apts, chats, saves });
      }
      return result;

    // 4.3 กรณีเลือกดูแบบ "รายปี" (ย้อนหลัง 3 ปี พ.ศ.)
    } else {
      const result = [];
      const currentYear = new Date().getFullYear();
      for (let i = 2; i >= 0; i--) {
        const year = currentYear - i;
        const yearLabel = (year + 543).toString(); // แปลงเป็นปี พ.ศ.

        // นับจำนวนรายการที่ตรงกับปีนั้นๆ
        const views = viewDates.filter(d => d.getFullYear() === year).length;
        const apts = aptDates.filter(d => d.getFullYear() === year).length;
        const chats = chatDates.filter(d => d.getFullYear() === year).length;
        const saves = saveDates.filter(d => d.getFullYear() === year).length;

        result.push({ timeframe: yearLabel, views, appointments: apts, chats, saves });
      }
      return result;
    }
  }, [property, chartTimeframe]);

  // --------------------------------------------------------------------------
  // [ส่วนที่ 5: การเรนเดอร์ UI ส่วนประกอบของ Modal (JSX)]
  // --------------------------------------------------------------------------
  return (
    // ฉากหลังสีมืดเบลอ (Modal Backdrop Overlay)
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      {/* กล่องเนื้อหาหลักของ Modal */}
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in duration-200 text-left border border-slate-100 max-h-[92vh] overflow-y-auto">

        {/* 5.1 ส่วนหัว Modal (Modal Header): ภาพปก, ชื่อประกาศ, ราคา, สถานะ และปุ่มปิด ✕ */}
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
              {/* แสดงเหตุผลหากประกาศโดน Admin ตีกลับ */}
              {property.status === 'rejected' && property.rejectReason && (
                <p className="text-xs text-red-600 font-bold mt-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                  💬 เหตุผลที่ถูกตีกลับ: {property.rejectReason}
                </p>
              )}
            </div>
          </div>

          {/* ปุ่มกดปิด Modal */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition shrink-0 cursor-pointer self-end sm:self-center"
          >
            ✕
          </button>
        </div>

        {/* 5.2 ส่วนแสดงข้อมูลสเปกบ้านและการ์ดตัวเลขสรุป 4 ด้าน (Specs & KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ซ้าย (1/3): การ์ดแสดงสเปกของทรัพย์สิน */}
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

          {/* ขวา (2/3): 4 การ์ดแสดงตัวเลขสถิติรวม */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* การ์ด 1: ยอดเข้าชมรวม */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">เข้าชมรวม</span>
              <strong className="text-xl font-black text-slate-900 block">👁️ {property.views.toLocaleString()}</strong>
              <span className="text-[9px] text-slate-400 font-semibold block">เปิดดูประกาศ</span>
            </div>

            {/* การ์ด 2: จำนวนนัดชมสถานที่ */}
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">นัดชมสถานที่</span>
              <strong className="text-xl font-black text-emerald-950 block">📅 {property.appointments}</strong>
              <span className="text-[9px] text-emerald-600 font-semibold block">จองเข้าชมจริง</span>
            </div>

            {/* การ์ด 3: จำนวนทักแชท */}
            <div className="p-3.5 bg-blue-50/80 border border-blue-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">ทักแชทสอบถาม</span>
              <strong className="text-xl font-black text-blue-950 block">💬 {property.chatsCount || 0}</strong>
              <span className="text-[9px] text-blue-600 font-semibold block">แชทสอบถาม</span>
            </div>

            {/* การ์ด 4: จำนวนเซฟโปรด */}
            <div className="p-3.5 bg-amber-50/80 border border-amber-100 rounded-2xl space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">เซฟเป็นโปรด</span>
              <strong className="text-xl font-black text-amber-950 block">⭐ {property.savesCount || 0}</strong>
              <span className="text-[9px] text-amber-600 font-semibold block">กดเซฟไว้</span>
            </div>
          </div>

        </div>

        {/* 5.3 ส่วนแสดงกราฟ Recharts แท่งเปรียบเทียบสถิติ (Recharts Bar Chart Section) */}
        <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm md:text-base">📊 กราฟวิเคราะห์สถิติสรุป 4 ด้าน (Multiple Bar Chart)</h4>
              <p className="text-[11px] text-slate-500">เปรียบเทียบสถิติ: เข้าชมรวม 👁️, นัดชมสถานที่ 📅, ทักแชทสอบถาม 💬 และ กดเซฟโปรด ⭐</p>
            </div>

            {/* ปุ่มสลับช่วงเวลากราฟ (Segmented Timeframe Switcher) */}
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

          {/* องค์ประกอบกราฟ Recharts แสดงแท่งสีสถิติทั้ง 4 ด้าน */}
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

        {/* 5.4 ส่วนแสดงรายชื่อลูกค้านัดหมายเข้าชมบ้านหลังนี้ (Customer Appointment Leads) */}
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
                  {/* ปุ่มโทรหากดแล้วโทรออกตามเบอร์ลูกค้า */}
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

        {/* 5.5 ปุ่มดำเนินการส่วนท้าย Modal (Bottom Actions Bar) */}
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

