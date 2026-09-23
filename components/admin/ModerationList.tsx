'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface ModerationItem {
  id: string;
  title: string;
  code: string;
  price: string;
  seller: string;
  sellerPhone?: string;
  plan: string;
  isVerified?: boolean;
  sla: string;
  slaUrgent?: boolean;
  image?: string;
  createdTimeAgo?: string;
}

interface Props {
  items: ModerationItem[];
  onApprove: (id: string, title: string) => void;
  onReject: (id: string, title: string) => void;
}

export default function ModerationList({ items, onApprove, onReject }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 px-4 text-slate-500">
        <p className="font-semibold text-slate-700 text-sm">ไม่มีประกาศที่รอการตรวจสอบ</p>
        <p className="text-slate-400 text-xs mt-1">คิวตรวจสอบประกาศว่าง</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 hover:bg-slate-50/60 transition-colors gap-4"
        >
          {/* Main Info */}
          <div className="flex items-start sm:items-center gap-4 w-full sm:w-auto min-w-0">
            {item.image ? (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 text-xs font-mono border border-slate-200">
                ไม่มีรูป
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  {item.code}
                </span>

                {item.slaUrgent ? (
                  <span className="text-xs font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full">
                    SLA: {item.sla}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    SLA: {item.sla}
                  </span>
                )}

                {item.createdTimeAgo && (
                  <span className="text-xs text-slate-400">
                    · ส่งมา {item.createdTimeAgo}
                  </span>
                )}
              </div>

              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate hover:text-blue-600 transition-colors">
                <Link href="/admin/moderation">
                  {item.title}
                </Link>
              </h4>

              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-slate-600">
                <span className="font-extrabold text-blue-600 text-sm sm:text-base">{item.price}</span>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-slate-700">{item.seller}</span>
                {item.isVerified && (
                  <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                    ยืนยันตัวตนแล้ว
                  </span>
                )}
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {item.plan}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
            <Link
              href="/admin/moderation"
              className="px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ดูรายละเอียด
            </Link>

            <button
              type="button"
              onClick={() => onApprove(item.id, item.title)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors shadow-xs"
            >
              อนุมัติ
            </button>

            <button
              type="button"
              onClick={() => onReject(item.id, item.title)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
