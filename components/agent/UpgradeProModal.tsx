'use client';

import React, { useState } from 'react';

interface UpgradeProModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UpgradeProModal({ isOpen, onClose, onSuccess }: UpgradeProModalProps) {
  const [slipUrl, setSlipUrl] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!slipUrl.trim()) return alert('กรุณาแนบลิงก์รูปภาพสลิปการโอนเงิน');
    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/packages/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slipUrl, packageId: 1, amount: 599 })
      });
      const data = await res.json();
      if (data.success) {
        alert('ส่งหลักฐานการชำระเงินเรียบร้อยแล้ว! ทีมงานจะตรวจสอบและอนุมัติแพ็กเกจ PRO ภายใน 1-2 ชม.');
        setSlipUrl('');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('ส่งสลิปชำระเงินล้มเหลว');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <span>👑</span> สมัครสมาชิก Verified PRO
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center space-y-1">
          <span className="text-[10px] font-black text-amber-700 uppercase">ค่าบริการแพ็กเกจ</span>
          <p className="text-2xl font-black text-slate-900">฿ 599 <span className="text-xs font-normal text-slate-500">/ 30 วัน</span></p>
          <p className="text-[10px] text-slate-500 font-medium">สิทธิ์ลงประกาศไม่จำกัด + โควต้าดันโพสต์ฟรี 30 วัน</p>
        </div>

        <div className="space-y-2 border-t pt-3">
          <h4 className="font-extrabold text-xs text-slate-800">1. ชำระเงินผ่าน PromptPay / ธนาคาร</h4>
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-center space-y-2">
            <p className="text-xs font-bold text-amber-400">สแกน QR Code ชำระเงิน</p>
            <div className="w-40 h-40 bg-white mx-auto rounded-xl flex items-center justify-center p-2 shadow-inner">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PROMPTPAY_599_SRICHAI" alt="PromptPay QR" className="w-full h-full object-contain" />
            </div>
            <p className="text-[10px] text-slate-300 font-medium">บจก. ศรีชัย พร็อพเพอร์ตี้ (ธ.กสิกรไทย 012-3-45678-9)</p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <h4 className="font-extrabold text-xs text-slate-800">2. แนบลิงก์รูปภาพสลิปโอนเงิน</h4>
          <input
            type="text"
            value={slipUrl}
            onChange={e => setSlipUrl(e.target.value)}
            placeholder="ระบุ URL รูปภาพสลิปการโอนเงิน (เช่น https://...)"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">ยกเลิก</button>
          <button
            onClick={handleCheckout}
            disabled={submittingPayment}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-md cursor-pointer"
          >
            {submittingPayment ? 'กำลังส่งข้อมูล...' : 'ส่งสลิปชำระเงิน ➔'}
          </button>
        </div>
      </div>
    </div>
  );
}
