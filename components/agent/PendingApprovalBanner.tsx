'use client';

import React from 'react';
import Link from 'next/link'; // ใช้ลิงก์ไปหน้าแดชบอร์ดกรณีไม่มีการส่งฟังก์ชัน onViewPending มา
import { Clock } from 'lucide-react';

interface PendingApprovalBannerProps {
  pendingCount: number;
  onViewPending?: () => void;
}

export default function PendingApprovalBanner({ pendingCount, onViewPending }: PendingApprovalBannerProps) {
  if (pendingCount <= 0) return null;

  return (
    <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 text-amber-950 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3.5 text-left">
        <div className="w-10 h-10 bg-amber-500 text-slate-950 rounded-xl flex items-center justify-center font-black shrink-0">
          <Clock className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h4 className="font-extrabold text-xs md:text-sm text-amber-900">
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
