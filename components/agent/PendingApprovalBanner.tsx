'use client';

import React from 'react';
import Link from 'next/link'; // ใช้ลิงก์ไปหน้าแดชบอร์ดกรณีไม่มีการส่งฟังก์ชัน onViewPending มา

interface PendingApprovalBannerProps {
  pendingCount: number;
  onViewPending?: () => void;
}

export default function PendingApprovalBanner({ pendingCount, onViewPending }: PendingApprovalBannerProps) {
  if (pendingCount <= 0) return null;

  return (
    <section className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 text-amber-950 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
        </div>
        <div>
          <h4 className="font-extrabold text-sm md:text-base text-amber-900">
            คุณมีประกาศ {pendingCount} รายการที่อยู่ระหว่างรอแอดมินอนุมัติ
          </h4>
          <p className="text-amber-800/80 text-[11px] mt-0.5 font-medium">
            เมื่อแอดมินอนุมัติเรียบร้อย ประกาศจะแสดงผลในหน้าลูกค้าและเปิดให้จองคิวนัดหมายโดยอัตโนมัติทันที
          </p>
        </div>
      </div>
      {onViewPending ? (
        <button onClick={onViewPending} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shrink-0 cursor-pointer">
          ดูรายการรออนุมัติ ({pendingCount})
        </button>
      ) : (
        <Link href="/agent/dashboard" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs shrink-0 cursor-pointer">
          ดูรายการรออนุมัติ ({pendingCount})
        </Link>
      )}
    </section>
  );
}
