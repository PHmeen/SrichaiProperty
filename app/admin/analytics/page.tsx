'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

type RangeType = 'day' | 'month' | 'year';

interface AppointmentBucket {
  timeframe: string;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  cancelled: number;
}

interface UserBucket {
  timeframe: string;
  customer: number;
  agent: number;
}

interface TopProperty {
  title: string;
  views: number;
}

interface AnalyticsData {
  appointmentsChart: AppointmentBucket[];
  usersChart: UserBucket[];
  topPropertiesChart: TopProperty[];
  summary: {
    totalAppointments: number;
    totalUsers: number;
    agentsCount: number;
    proAgentsCount: number;
    totalViews: number;
  };
}

// สีและป้ายกำกับกราฟนัดหมาย แยกตามสถานะจริงในระบบ (pending/approved/completed/rejected/cancelled)
const appointmentsChartConfig = {
  pending: { label: 'รอดำเนินการ', color: '#f59e0b' },
  approved: { label: 'ยืนยันแล้ว', color: '#3b82f6' },
  completed: { label: 'เข้าชมสำเร็จ', color: '#10b981' },
  rejected: { label: 'ปฏิเสธ', color: '#ef4444' },
  cancelled: { label: 'ยกเลิก', color: '#94a3b8' },
} satisfies ChartConfig;

const usersChartConfig = {
  customer: { label: 'ลูกค้าใหม่', color: '#3b82f6' },
  agent: { label: 'นายหน้าใหม่', color: '#10b981' },
} satisfies ChartConfig;

const viewsChartConfig = {
  views: { label: 'ยอดเข้าชม', color: '#6366f1' },
} satisfies ChartConfig;

const RANGE_LABELS: { value: RangeType; label: string }[] = [
  { value: 'day', label: 'รายวัน (7 วัน)' },
  { value: 'month', label: 'รายเดือน (6 เดือน)' },
  { value: 'year', label: 'รายปี' },
];

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeType>('month');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadAnalytics = useCallback((selectedRange: RangeType) => {
    setLoading(true);
    fetch(`/api/admin/analytics?range=${selectedRange}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) {
          setFetchError(json.error);
        } else {
          setData(json);
          setFetchError(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setFetchError('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadAnalytics(range);
  }, [range, loadAnalytics]);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">สถิติและรายงาน (Analytics)</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">ภาพรวมนัดหมาย ยอดเข้าชมบ้าน และผู้ใช้งานในระบบ</p>
        </div>

        {/* ตัวสลับช่วงเวลา ใช้รูปแบบเดียวกับกราฟฝั่งนายหน้า */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          {RANGE_LABELS.map(r => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                range === r.value ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-8 flex-1 overflow-y-auto space-y-6">
        {fetchError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center justify-between">
            <span>⚠️ {fetchError}</span>
            <button onClick={() => loadAnalytics(range)} className="underline font-black">ลองใหม่</button>
          </div>
        )}

        {loading && !data ? (
          <div className="py-24 text-center text-slate-400 font-bold text-sm">🔄 กำลังโหลดข้อมูลสถิติ...</div>
        ) : (
          <>
            {/* 4 การ์ดสรุปตัวเลขรวม */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border-l-4 border-blue-500 border-y border-r border-slate-200/80 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">นัดหมายทั้งหมด</span>
                <strong className="text-2xl font-black text-slate-900 block">{(data?.summary.totalAppointments ?? 0).toLocaleString()}</strong>
                <span className="text-[10px] text-slate-400 font-bold block">📅 สะสมทั้งระบบ</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border-l-4 border-indigo-500 border-y border-r border-slate-200/80 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ยอดเข้าชมรวม</span>
                <strong className="text-2xl font-black text-slate-900 block">{(data?.summary.totalViews ?? 0).toLocaleString()}</strong>
                <span className="text-[10px] text-slate-400 font-bold block">👁️ ทุกประกาศรวมกัน</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border-l-4 border-slate-500 border-y border-r border-slate-200/80 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">ผู้ใช้งานทั้งหมด</span>
                <strong className="text-2xl font-black text-slate-900 block">{(data?.summary.totalUsers ?? 0).toLocaleString()}</strong>
                <span className="text-[10px] text-slate-400 font-bold block">👥 ลูกค้า + นายหน้า</span>
              </div>

              <div className="bg-white rounded-2xl p-4 border-l-4 border-emerald-500 border-y border-r border-slate-200/80 shadow-sm space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">นายหน้า PRO</span>
                <strong className="text-2xl font-black text-slate-900 block">{data?.summary.proAgentsCount ?? 0} / {data?.summary.agentsCount ?? 0}</strong>
                <span className="text-[10px] text-slate-400 font-bold block">👑 สมาชิก Verified PRO</span>
              </div>
            </section>

            {/* กราฟนัดหมาย แยกตามสถานะ */}
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-sm">📅 สถิตินัดหมาย (Appointments)</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">จำนวนนัดหมายแยกตามสถานะ ตามช่วงเวลาที่เลือก</p>
              </div>

              {data && data.appointmentsChart.every(b => b.pending + b.approved + b.completed + b.rejected + b.cancelled === 0) ? (
                <p className="py-10 text-center text-slate-400 font-bold text-xs">ยังไม่มีข้อมูลนัดหมายในช่วงเวลานี้</p>
              ) : (
                <ChartContainer config={appointmentsChartConfig} className="h-64 w-full">
                  <BarChart data={data?.appointmentsChart ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="timeframe" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="pending" fill="var(--color-pending)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="approved" fill="var(--color-approved)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" fill="var(--color-completed)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="rejected" fill="var(--color-rejected)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="cancelled" fill="var(--color-cancelled)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* กราฟผู้ใช้/นายหน้าสมัครใหม่ */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm">👥 ผู้ใช้งาน/นายหน้าสมัครใหม่</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">จำนวนสมาชิกสมัครใหม่ ตามช่วงเวลาที่เลือก</p>
                </div>

                {data && data.usersChart.every(b => b.customer + b.agent === 0) ? (
                  <p className="py-10 text-center text-slate-400 font-bold text-xs">ยังไม่มีผู้ใช้สมัครใหม่ในช่วงเวลานี้</p>
                ) : (
                  <ChartContainer config={usersChartConfig} className="h-56 w-full">
                    <BarChart data={data?.usersChart ?? []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="timeframe" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="customer" fill="var(--color-customer)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="agent" fill="var(--color-agent)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </section>

              {/* Top 5 บ้านที่มีคนเข้าชมมากที่สุด (views_count เป็นตัวเลขสะสม ไม่มี log รายวัน จึงไม่มี toggle ช่วงเวลา) */}
              <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-sm">🏆 Top 5 บ้านที่มีคนเข้าชมมากที่สุด</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">อันดับยอดเข้าชมสะสมตลอดกาลของแต่ละประกาศ</p>
                </div>

                {!data || data.topPropertiesChart.length === 0 ? (
                  <p className="py-10 text-center text-slate-400 font-bold text-xs">ยังไม่มีประกาศในระบบ</p>
                ) : (
                  <ChartContainer config={viewsChartConfig} className="h-56 w-full">
                    <BarChart data={data.topPropertiesChart} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        dataKey="title"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={140}
                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                      />
                      <ChartTooltip content={<ChartTooltipContent indicator="dashed" hideLabel />} />
                      <Bar dataKey="views" fill="var(--color-views)" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
