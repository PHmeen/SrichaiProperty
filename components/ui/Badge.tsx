import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export default function Badge({ status, className = '' }: BadgeProps) {
  const normStatus = status.toLowerCase();

  let styles = 'bg-slate-50 text-slate-600 border-slate-100'; // Default fallback
  let text = status;

  if (normStatus === 'approved' || normStatus === 'resolved' || normStatus === 'online') {
    styles = 'bg-emerald-50 text-emerald-600 border-emerald-100';
    text = normStatus === 'resolved' ? 'แก้ไขแล้ว' : normStatus === 'online' ? 'ออนไลน์' : 'อนุมัติแล้ว';
  } else if (normStatus === 'pending' || normStatus === 'processing' || normStatus === 'รอตรวจสอบ') {
    styles = 'bg-amber-50 text-amber-600 border-amber-100';
    text = normStatus === 'processing' ? 'กำลังดำเนินการ' : 'รอตรวจสอบ';
  } else if (
    normStatus === 'rejected' ||
    normStatus === 'dismissed' ||
    normStatus === 'scam' ||
    normStatus === 'suspended' ||
    normStatus.includes('ฉ้อโกง')
  ) {
    styles = 'bg-red-50 text-red-600 border-red-100';
    text = normStatus === 'rejected' ? 'ปฏิเสธ/ไม่อนุมัติ' : normStatus === 'dismissed' ? 'ปัดตก (Dismissed)' : normStatus === 'suspended' ? 'ระงับบัญชี' : status;
  }

  return (
    <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase border transition-colors ${styles} ${className}`}>
      {text}
    </span>
  );
}
