'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Step = 'details' | 'payment' | 'success';

export default function UpgradePage() {
  const { status } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('details');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProUser, setIsProUser] = useState(false);
  const [planExpiredAt, setPlanExpiredAt] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        if (data.user?.isPro) {
          setIsProUser(true);
          setPlanExpiredAt(data.user.planExpiredAt || null);
        }
      })
      .catch(console.error);
  }, []);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('ไฟล์มีขนาดใหญ่เกิน 5MB กรุณาลดขนาดไฟล์ก่อน');
      return;
    }
    setErrorMsg('');
    setSlipFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSlipPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = async () => {
    if (!slipFile) {
      setErrorMsg('กรุณาแนบรูปสลิปการโอนเงินก่อน');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // ส่งไฟล์สลิปตรงไปที่ checkout API (multipart/form-data)
      const formData = new FormData();
      formData.append('slip', slipFile);
      formData.append('packageId', '1');
      formData.append('amount', '599');

      const res = await fetch('/api/packages/checkout', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล');

      setStep('success');
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMsg(e.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== ALREADY PRO MEMBER SCREEN =====
  if (isProUser) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center space-y-6 border border-slate-100">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-200">
            <span className="text-4xl">👑</span>
          </div>
          <div className="space-y-1">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              VERIFIED PRO ACTIVE
            </span>
            <h1 className="text-xl font-black text-slate-900 pt-2">คุณใช้งานสมาชิก PRO อยู่แล้ว</h1>
            <p className="text-slate-500 text-xs leading-relaxed">
              บัญชีของคุณได้รับสิทธิ์สมาชิกพรีเมียมเรียบร้อยแล้ว ไม่ต้องอัปเกรดซ้ำ
            </p>
          </div>

          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/60 text-left space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-amber-900 border-b border-amber-200/50 pb-2">
              <span>สถานะแพ็กเกจ</span>
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-[10px]">ใช้งานอยู่</span>
            </div>
            <p className="text-xs text-amber-900 font-semibold flex justify-between pt-1">
              <span>วันหมดอายุสิทธิ์:</span>
              <span className="font-extrabold">{planExpiredAt ? new Date(planExpiredAt).toLocaleDateString('th-TH') : 'ใช้งานต่อเนื่อง'}</span>
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Link
              href="/agent/add-property"
              className="w-full block py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition text-center shadow-md shadow-amber-200/60 active:scale-[0.98]"
            >
              ➕ ลงประกาศบ้านพรีเมียมทันที
            </Link>
            <Link
              href="/agent/home"
              className="w-full block py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center"
            >
              กลับสู่หน้าหลัก
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===== SUCCESS SCREEN =====
  if (step === 'success') {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 text-center space-y-5 border border-slate-100">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border-4 border-amber-200">
            <span className="text-4xl">🎉</span>
          </div>
          <div>
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              ส่งข้อมูลเรียบร้อยแล้ว
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">รอการยืนยันจาก Admin</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            เราได้รับสลิปการโอนเงินของคุณแล้ว ทีมงานจะตรวจสอบและเปิดใช้งาน <strong>Verified PRO 👑</strong> ให้คุณภายใน <strong>1 วันทำการ</strong>
          </p>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-left space-y-2">
            <p className="text-xs font-bold text-amber-800">✅ สิทธิประโยชน์ที่คุณจะได้รับ</p>
            <ul className="space-y-1.5">
              {[
                'ลงประกาศไม่จำกัดจำนวน',
                'แบดจ์ Verified PRO ติดโปรไฟล์',
                'ดันประกาศขึ้นหน้าแรกฟรี',
                'สถิติยอดวิวและแชทแบบละเอียด',
                'Priority Support จากทีมงาน',
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
                  <span className="text-amber-500">★</span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href="/agent/home"
            className="w-full block py-3.5 bg-slate-900 hover:bg-slate-950 text-white font-black rounded-xl text-sm transition text-center"
          >
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  // ===== PAYMENT STEP =====
  if (step === 'payment') {
    return (
      <div className="pt-16 min-h-screen bg-slate-50 p-4">
        <div className="max-w-lg mx-auto space-y-5">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('details')} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-sm">
              ←
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-900">แนบหลักฐานการชำระเงิน</h1>
              <p className="text-xs text-slate-400 font-semibold">ขั้นตอน 2 / 2</p>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm text-center space-y-4">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 inline-block">
              <div className="bg-white rounded-xl p-2 w-40 h-40 flex items-center justify-center">
                {/* QR Code Placeholder - ใน production ใช้ QR จริง */}
                <div className="text-center">
                  <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* QR Pattern Simulation */}
                    <rect width="100" height="100" fill="white"/>
                    {/* Corner squares */}
                    <rect x="5" y="5" width="25" height="25" rx="3" fill="#1e293b"/>
                    <rect x="8" y="8" width="19" height="19" rx="2" fill="white"/>
                    <rect x="11" y="11" width="13" height="13" rx="1" fill="#1e293b"/>
                    <rect x="70" y="5" width="25" height="25" rx="3" fill="#1e293b"/>
                    <rect x="73" y="8" width="19" height="19" rx="2" fill="white"/>
                    <rect x="76" y="11" width="13" height="13" rx="1" fill="#1e293b"/>
                    <rect x="5" y="70" width="25" height="25" rx="3" fill="#1e293b"/>
                    <rect x="8" y="73" width="19" height="19" rx="2" fill="white"/>
                    <rect x="11" y="76" width="13" height="13" rx="1" fill="#1e293b"/>
                    {/* Data modules */}
                    {[35,40,45,50,55,60].map((x, i) =>
                      [5,10,15,20,25].filter((_, j) => (i + j) % 2 === 0).map(y => (
                        <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1e293b"/>
                      ))
                    )}
                    {[5,10,15,20,25,30].map((y, i) =>
                      [35,40,45,50,55,60].filter((_, j) => (i + j) % 3 !== 0).map(x => (
                        <rect key={`m-${x}-${y}`} x={x} y={y} width="4" height="4" fill="#1e293b"/>
                      ))
                    )}
                    {[35,38,41,44,47,50,53,56,59,62,65,68].map((x, i) =>
                      [35,40,45,50,55,60,65].filter((_, j) => (i * 3 + j * 7) % 5 !== 0).map(y => (
                        <rect key={`d-${x}-${y}`} x={x} y={y} width="3" height="3" fill="#1e293b"/>
                      ))
                    )}
                    {/* Center logo hint */}
                    <rect x="43" y="43" width="14" height="14" rx="2" fill="white"/>
                    <text x="50" y="53" textAnchor="middle" fontSize="8" fill="#f59e0b" fontWeight="bold">฿</text>
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">PromptPay / พร้อมเพย์</p>
              <p className="text-2xl font-black text-slate-900 mt-1">099-XXX-XXXX</p>
              <p className="text-sm text-slate-500 font-semibold">บริษัท ศรีชัย พร็อพเพอร์ตี้ จำกัด</p>
            </div>
            <div className="bg-amber-50 rounded-2xl py-3 px-4 border border-amber-200">
              <p className="text-xs text-amber-700 font-bold">จำนวนเงินที่ต้องโอน</p>
              <p className="text-3xl font-black text-amber-600">฿599<span className="text-sm font-bold text-amber-400">.00</span></p>
              <p className="text-xs text-amber-600 font-semibold">Verified PRO · 30 วัน</p>
            </div>
          </div>

          {/* Upload Slip */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm">📎 แนบสลิปการโอนเงิน</h3>

            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-amber-400 bg-amber-50'
                  : slipPreview
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />

              {slipPreview ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slipPreview || ''}
                    alt="สลิปการโอนเงิน"
                    className="mx-auto max-h-48 rounded-xl object-contain shadow-md"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-emerald-600 font-bold text-xs">✓ แนบสลิปแล้ว</span>
                    <span className="text-slate-400 text-xs">· {slipFile?.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">กดเพื่อเปลี่ยนรูปสลิป</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
                    <span className="text-2xl">🧾</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">วางหรือกดเพื่อเลือกรูปสลิป</p>
                    <p className="text-xs text-slate-400 font-semibold mt-1">รองรับ JPG, PNG, WEBP · ขนาดไม่เกิน 5MB</p>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 rounded-xl px-4 py-3 text-xs font-bold border border-red-100">
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !slipFile}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-200 active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                  กำลังส่งข้อมูล...
                </span>
              ) : (
                '✅ ส่งหลักฐานการชำระเงิน'
              )}
            </button>

            <p className="text-center text-[11px] text-slate-400 font-semibold">
              🔒 ข้อมูลและสลิปของคุณจะถูกเก็บเป็นความลับและปลอดภัย
            </p>
          </div>

        </div>
      </div>
    );
  }

  // ===== DETAILS STEP (default) =====
  return (
    <div className="pt-16 min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/agent/home"
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition shadow-sm"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900">อัปเกรด Verified PRO 👑</h1>
            <p className="text-xs text-slate-400 font-semibold">ขั้นตอน 1 / 2 · ตรวจสอบแพ็กเกจ</p>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full translate-y-8 -translate-x-8 blur-2xl" />

          <div className="flex items-start justify-between relative">
            <div className="space-y-3">
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                VERIFIED PRO 👑
              </span>
              <h2 className="text-xl font-black tracking-tight leading-tight">
                ขยายธุรกิจแบบ<br />ไร้ขีดจำกัด
              </h2>
              <p className="text-slate-300 text-[11px] leading-relaxed max-w-xs">
                ดันประกาศและฟีเจอร์พรีเมียมเฉพาะตัวแทนที่อัปเกรดเพื่อรับยอดเข้าชมและฐานลูกค้าที่กว้างขวางขึ้น
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-slate-400 font-bold uppercase">ราคา</p>
              <p className="text-3xl font-black text-amber-400">฿599</p>
              <p className="text-[10px] text-slate-400 font-semibold">/เดือน</p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-extrabold text-slate-900 text-sm">✨ สิทธิประโยชน์ที่คุณจะได้รับ</h3>
          <div className="space-y-3">
            {[
              { icon: '♾️', title: 'ลงประกาศไม่จำกัด', desc: 'จากเดิม 3 รายการ → ไม่จำกัดจำนวน' },
              { icon: '👑', title: 'แบดจ์ Verified PRO', desc: 'ติดโปรไฟล์เพื่อสร้างความน่าเชื่อถือ' },
              { icon: '🚀', title: 'ดันประกาศขึ้นหน้าแรก', desc: 'รับสิทธิ์ boost ฟรี 5 ครั้ง/เดือน' },
              { icon: '📊', title: 'สถิติแบบละเอียด', desc: 'ยอดวิว, แชท, อัตราการนัดหมาย' },
              { icon: '🎯', title: 'Priority Support', desc: 'ทีมงานดูแลคุณก่อนในทุกปัญหา' },
            ].map((b) => (
              <div key={b.title} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xl shrink-0">{b.icon}</span>
                <div>
                  <p className="font-extrabold text-slate-800 text-xs">{b.title}</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{b.desc}</p>
                </div>
                <span className="ml-auto text-emerald-500 text-sm font-black">✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm">💳 สรุปคำสั่งซื้อ</h3>
          <div className="space-y-2 text-xs font-semibold">
            <div className="flex justify-between text-slate-600">
              <span>Verified PRO Package · 30 วัน</span>
              <span>฿599.00</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%)</span>
              <span>รวมอยู่แล้ว</span>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex justify-between text-slate-900 font-black text-sm">
              <span>ยอดรวมสุทธิ</span>
              <span className="text-amber-500">฿599.00</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => setStep('payment')}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-sm transition shadow-lg shadow-amber-200/60 active:scale-[0.98]"
        >
          ดำเนินการชำระเงิน →
        </button>

        <p className="text-center text-[11px] text-slate-400 font-semibold pb-4">
          การชำระเงินผ่านระบบ PromptPay · หลังแอดมินยืนยันภายใน 1 วันทำการ
        </p>

      </div>
    </div>
  );
}
