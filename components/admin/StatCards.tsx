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
      subtitle: pendingCount > 0 ? 'ต้องตรวจสอบก่อนขึ้นเว็บ' : 'ไม่มีงานค้าง',
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
      {stats.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">{item.title}</span>
              {item.isUrgent && (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                  รอดำเนินการ
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {item.count.toLocaleString()}
              </span>
              <span className="text-sm text-slate-500 font-medium">{item.unit}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3 font-medium truncate pt-2 border-t border-slate-100">
            {item.subtitle}
          </p>
        </Link>
      ))}
    </div>
  );
}
