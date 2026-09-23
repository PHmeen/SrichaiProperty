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
      <div className="text-center py-10 px-4 text-slate-500 text-xs">
        <p className="font-semibold text-slate-700">ไม่มีประกาศที่รอการตรวจสอบ</p>
        <p className="text-slate-400 mt-0.5">คิวตรวจสอบประกาศว่าง</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map(item => (
        <div
          key={item.id}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 hover:bg-slate-50/60 transition-colors gap-3"
        >
          {/* Main Info */}
          <div className="flex items-start sm:items-center gap-3 w-full sm:w-auto min-w-0">
            {item.image ? (
              <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                <Image
                  src={item.image}
                  alt={item.title}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 text-xs font-mono border border-slate-200">
                IMG
              </div>
            )}

            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {item.code}
                </span>

                {item.slaUrgent ? (
                  <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    SLA: {item.sla}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">
                    SLA: {item.sla}
                  </span>
                )}

                {item.createdTimeAgo && (
                  <span className="text-[10px] text-slate-400">
                    · {item.createdTimeAgo}
                  </span>
                )}
              </div>

              <h4 className="font-semibold text-slate-900 text-xs leading-snug truncate hover:text-blue-600">
                <Link href="/admin/moderation">
                  {item.title}
                </Link>
              </h4>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-900">{item.price}</span>
                <span className="text-slate-300">·</span>
                <span>{item.seller}</span>
                {item.isVerified && (
                  <span className="text-[10px] text-blue-600 font-medium">(ยืนยันตัวตนแล้ว)</span>
                )}
                <span className="text-slate-300">·</span>
                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                  {item.plan}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end">
            <Link
              href="/admin/moderation"
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              ดูรายละเอียด
            </Link>

            <button
              type="button"
              onClick={() => onApprove(item.id, item.title)}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded transition-colors"
            >
              อนุมัติ
            </button>

            <button
              type="button"
              onClick={() => onReject(item.id, item.title)}
              className="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded transition-colors"
            >
              ไม่อนุมัติ
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
