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
      subtitle: pendingCount > 0 ? 'จำเป็นต้องตรวจก่อนขึ้นเว็บ' : 'ไม่มีประกาศค้างตรวจ',
      href: '/admin/moderation',
      topBorderColor: pendingCount > 0 ? 'border-t-amber-500' : 'border-t-slate-200',
      badge: pendingCount > 0 ? { text: 'ต้องตรวจ', className: 'text-amber-800 bg-amber-50 border border-amber-200' } : null
    },
    {
      title: 'ยืนยันตัวตน KYC',
      count: kycCount,
      unit: 'ราย',
      subtitle: `นายหน้าทั้งหมด ${agentsCount} คน`,
      href: '/admin/kyc',
      topBorderColor: kycCount > 0 ? 'border-t-indigo-500' : 'border-t-slate-200',
      badge: kycCount > 0 ? { text: 'รออนุมัติ', className: 'text-indigo-800 bg-indigo-50 border border-indigo-200' } : null
    },
    {
      title: 'สลิปชำระเงินรอตรวจ',
      count: paymentsCount,
      unit: 'รายการ',
      subtitle: `สมาชิก PRO ${proAgentsCount} คน`,
      href: '/admin/payments',
      topBorderColor: paymentsCount > 0 ? 'border-t-emerald-500' : 'border-t-slate-200',
      badge: paymentsCount > 0 ? { text: 'รอตรวจสอบ', className: 'text-emerald-800 bg-emerald-50 border border-emerald-200' } : null
    },
    {
      title: 'นัดหมายชมบ้าน',
      count: pendingAppointmentsCount,
      unit: 'นัด',
      subtitle: 'คิวนัดหมายที่รอดำเนินการ',
      href: '/admin/dashboard#appointments',
      topBorderColor: pendingAppointmentsCount > 0 ? 'border-t-sky-500' : 'border-t-slate-200',
      badge: pendingAppointmentsCount > 0 ? { text: 'มีคิวใหม่', className: 'text-sky-800 bg-sky-50 border border-sky-200' } : null
    },
    {
      title: 'ประกาศออนไลน์',
      count: approvedListingsCount,
      unit: 'ประกาศ',
      subtitle: 'แสดงผลบนหน้าเว็บไซต์',
      href: '/admin/moderation',
      topBorderColor: 'border-t-slate-400',
      badge: { text: 'Active', className: 'text-emerald-700 bg-emerald-50 border border-emerald-200' }
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-5">
      {stats.map((item, idx) => (
        <Link
          key={idx}
          href={item.href}
          className={`bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 ${item.topBorderColor} border-t-3 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-600">{item.title}</span>
              {item.badge && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.badge.className}`}>
                  {item.badge.text}
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

          <p className="text-xs text-slate-500 mt-3 font-medium truncate pt-2.5 border-t border-slate-100">
            {item.subtitle}
          </p>
        </Link>
      ))}
    </div>
  );
}
