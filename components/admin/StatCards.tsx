'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  pendingCount: number;
  approvedListingsCount?: number;
  kycCount?: number;
  paymentsCount?: number;
  pendingAppointmentsCount?: number;
  agentsCount?: number;
  proAgentsCount?: number;
}

export default function StatCards({
  pendingCount = 0,
  approvedListingsCount = 0,
  kycCount = 0,
  paymentsCount = 0,
  pendingAppointmentsCount = 0,
  agentsCount = 0,
  proAgentsCount = 0
}: Props) {
  const stats = [
    {
      title: 'ประกาศรอตรวจสอบ',
      count: pendingCount,
      unit: 'รายการ',
      subtitle: pendingCount > 0 ? 'ต้องตรวจสอบก่อนขึ้นเว็บ' : 'ไม่มีค้าง',
      href: '/admin/moderation',
      isUrgent: pendingCount > 0
    },
    {
      title: 'ยืนยันตัวตน KYC',
      count: kycCount,
      unit: 'ราย',
      subtitle: `นายหน้าทั้งหมด ${agentsCount} คน`,
      href: '/admin/kyc',
      isUrgent: kycCount > 0
    },
    {
      title: 'สลิปชำระเงินรอตรวจ',
      count: paymentsCount,
      unit: 'รายการ',
      subtitle: `สมาชิก PRO ${proAgentsCount} คน`,
      href: '/admin/payments',
      isUrgent: paymentsCount > 0
    },
    {
      title: 'นัดหมายชมบ้าน',
      count: pendingAppointmentsCount,
      unit: 'นัด',
      subtitle: 'คิวนัดหมายที่รอดำเนินการ',
      href: '/admin/dashboard#appointments',
      isUrgent: false
    },
    {
      title: 'ประกาศออนไลน์',
      count: approvedListingsCount,
      unit: 'ประกาศ',
      subtitle: 'แสดงผลบนหน้าเว็บไซต์',
      href: '/admin/moderation',
      isUrgent: false
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {stats.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-medium">{item.title}</span>
              {item.isUrgent && (
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                  รอดำเนินการ
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-slate-900 tracking-tight">
                {item.count.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400">{item.unit}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {item.subtitle}
          </p>
        </Link>
      ))}
    </div>
  );
}
