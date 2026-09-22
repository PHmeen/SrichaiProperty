'use client';

import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from '@/components/ui/toast';
import {
  Camera,
  Trash2,
  Save,
  Loader2,
  ChevronLeft,
  Check,
  Phone,
  MessageCircle
} from 'lucide-react';

export default function AgentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    lineId: '',
    profileImage: '',
    experience: '',
    specialtyZone: '',
    specialtyType: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '',
    isPro: false,
    isVerified: false,
    planExpiredAt: null as string | null
  });

  useEffect(() => {
    document.title = 'จัดการโปรไฟล์นายหน้า | Srichai Property';
    fetch('/api/user/profile')
      .then(r => r.json())
      .then(data => {
        const u = data?.user || {};
        setForm(prev => ({
          ...prev,
          id: u.id || '',
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          email: u.email || '',
          phone: u.phone || '',
          lineId: u.lineId || '',
          profileImage: u.profileImage || '',
          experience: u.experience || '3 ปีในวงการอสังหาฯ',
          specialtyZone: u.specialtyZone || 'หาดใหญ่, คอหงส์, สงขลา',
          specialtyType: u.specialtyType || 'บ้านเดี่ยว, ทาวน์โฮม, คอนโด',
          isPro: Boolean(u.isPro),
          isVerified: Boolean(u.isVerified),
          planExpiredAt: u.planExpiredAt || null
        }));
      })
      .catch(err => {
        console.error(err);
        toast.error('โหลดข้อมูลโปรไฟล์ไม่สำเร็จ');
      })
      .finally(() => setLoading(false));
  }, []);

  // อัปโหลดรูปภาพโปรไฟล์ผ่าน /api/upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingAvatar(true);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setForm(prev => ({ ...prev, profileImage: data.url }));
        toast.success('อัปโหลดรูปภาพเรียบร้อย (อย่าลืมกดบันทึก)');
      } else {
        toast.error(data.error || 'อัปโหลดรูปภาพไม่สำเร็จ');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูป');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword) {
      if (form.newPassword.length < 6) {
        toast.error('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (form.newPassword !== form.confirmPassword) {
        toast.error('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
      if (!form.currentPassword) {
        toast.error('กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          lineId: form.lineId,
          profileImage: form.profileImage,
          experience: form.experience,
          specialtyZone: form.specialtyZone,
          specialtyType: form.specialtyType,
          ...(form.newPassword ? { newPassword: form.newPassword, currentPassword: form.currentPassword } : {})
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('บันทึกข้อมูลโปรไฟล์สำเร็จเรียบร้อยแล้ว');
        setForm(prev => ({
          ...prev,
          newPassword: '',
          confirmPassword: '',
          currentPassword: ''
        }));
      } else {
        toast.error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('ลบบัญชีถาวรเรียบร้อยแล้ว');
        signOut({ callbackUrl: '/login/agent' });
      } else {
        toast.error(data.error || 'ไม่สามารถลบบัญชีได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการลบบัญชี');
    } finally {
      setDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs font-semibold">กำลังโหลดข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  const agentFullName = `${form.firstName} ${form.lastName}`.trim() || 'ตัวแทนนายหน้า';
  const agentCode = form.id ? 'AGT-' + form.id.substring(0, 4).toUpperCase() : 'AGT-0001';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 text-xs md:text-sm font-sans antialiased pb-16">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6 text-left">

        {/* 1. Header บาร์ย้อนกลับและหัวข้อ */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              โปรไฟล์นายหน้า & นามบัตรดิจิทัล
            </h1>
            <p className="text-xs text-slate-500">
              ปรับแต่งข้อมูลตัวตน ประสบการณ์ และทำเลที่เชี่ยวชาญ ข้อมูลเหล่านี้จะแสดงบนการ์ดนายหน้าที่ลูกค้าเห็น
            </p>
          </div>

          <Link
            href="/agent/home"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition self-start sm:self-auto cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </section>

        {/* 2. เนื้อหาหลักแบ่งเป็น 2 คอลัมน์ (ซ้าย: ฟอร์มแก้ไข / ขวา: Live Preview) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ================================================================= */}
          {/* ฝั่งซ้าย (lg:col-span-7): ฟอร์มแก้ไขข้อมูลโปรไฟล์ */}
          {/* ================================================================= */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">

            {/* ส่วนที่ 1: รูปภาพโปรไฟล์ */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                รูปถ่ายประจำตัวตัวแทนนายหน้า
              </span>

              <div className="flex items-center gap-4">
                <div className="relative shrink-0 group">
                  {form.profileImage ? (
                    <Image
                      src={form.profileImage}
                      alt={agentFullName}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                      unoptimized
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 flex items-center justify-center font-black text-2xl shadow-2xs">
                      {form.firstName ? form.firstName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                    title="เปลี่ยนรูปโปรไฟล์"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="space-y-1">
                  <strong className="text-xs font-bold text-slate-900 block">
                    รูปภาพแสดงความน่าเชื่อถือ
                  </strong>
                  <p className="text-[11px] text-slate-500">
                    แนะนำรูปถ่ายหน้าตรง สวมชุดสุภาพ ไฟล์ JPEG หรือ PNG ขนาดไม่เกิน 5MB
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    คลิกเพื่ออัปโหลดรูปใหม่
                  </button>
                </div>
              </div>
            </div>

            {/* ส่วนที่ 2: ข้อมูลส่วนตัว & ช่องทางติดต่อ */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                ข้อมูลส่วนตัวและช่องทางติดต่อ
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ชื่อจริง *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={e => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={e => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์ติดต่อ *</label>
                  <input
                    type="tel"
                    required
                    placeholder="เช่น 0812345678"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">LINE ID (สำหรับลูกค้ากดทัก)</label>
                  <input
                    type="text"
                    placeholder="เช่น srichai_agent"
                    value={form.lineId}
                    onChange={e => setForm({ ...form, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">อีเมลประจำตัว (เข้าสู่ระบบ)</label>
                <input
                  type="email"
                  disabled
                  value={form.email}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 font-medium cursor-not-allowed outline-none"
                />
              </div>
            </div>

            {/* ส่วนที่ 3: ข้อมูลวิชาชีพนายหน้า (Specialties & Experience) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                ความเชี่ยวชาญ & ทำเลประจำตัว
              </span>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ทำเลที่เชี่ยวชาญพิเศษ (Specialty Zones)</label>
                <input
                  type="text"
                  placeholder="เช่น หาดใหญ่, คอหงส์, คลองแห, สงขลา"
                  value={form.specialtyZone}
                  onChange={e => setForm({ ...form, specialtyZone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                />
                <p className="text-[10px] text-slate-400">
                  ระบุชื่ออำเภอ ตำบล หรือย่านสำคัญที่พร้อมพาลูกค้าไปชมบ้านได้รวดเร็ว
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ประสบการณ์ทำงาน</label>
                  <input
                    type="text"
                    placeholder="เช่น 3 ปี, 5 ปีในวงการอสังหาฯ"
                    value={form.experience}
                    onChange={e => setForm({ ...form, experience: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">ประเภทอสังหาฯ ที่ถนัด</label>
                  <input
                    type="text"
                    placeholder="เช่น บ้านเดี่ยว, ทาวน์โฮม, คอนโด"
                    value={form.specialtyType}
                    onChange={e => setForm({ ...form, specialtyType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* ส่วนที่ 4: เปลี่ยนรหัสผ่าน (Optional) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                เปลี่ยนรหัสผ่าน (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)
              </span>

              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="รหัสผ่านปัจจุบัน (จำเป็นต้องระบุหากจะเปลี่ยนรหัสผ่าน)"
                  value={form.currentPassword}
                  onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-slate-400 outline-none transition"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="password"
                    placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                  <input
                    type="password"
                    placeholder="ยืนยันรหัสผ่านใหม่"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-amber-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* ปุ่มบันทึกการเปลี่ยนแปลง & ลบบัญชี */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs font-bold text-red-500 hover:text-red-700 inline-flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ขอลบบัญชีนายหน้าถาวร</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition shadow-2xs inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* ================================================================= */}
          {/* ฝั่งขวา (lg:col-span-5): Live Card Preview (มุมมองที่ลูกค้าเห็นคุณ) */}
          {/* ================================================================= */}
          <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-slate-900 font-extrabold text-xs">
                  ตัวอย่างนามบัตรดิจิทัล (Live Preview)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                  มุมมองลูกค้า
                </span>
              </div>

              {/* การ์ดนามบัตรเสมือนจริงที่ลูกค้ามองเห็นในหน้าค้นหา */}
              <div className="bg-gradient-to-b from-white to-slate-50/70 rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4">
                
                {/* รูปโปรไฟล์ + ตรา Verified */}
                <div className="relative">
                  {form.profileImage ? (
                    <Image
                      src={form.profileImage}
                      width={72}
                      height={72}
                      className="w-18 h-18 rounded-2xl border-2 border-white shadow-md object-cover"
                      alt={agentFullName}
                      unoptimized
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
                      {form.firstName ? form.firstName.charAt(0).toUpperCase() : 'A'}
                    </div>
                  )}

                  {form.isVerified && (
                    <span className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs" title="ยืนยันตัวตนแล้ว">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>

                {/* ชื่อ & รหัสตัวแทน */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      {agentFullName}
                    </h3>
                    {form.isPro && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded uppercase">
                        PRO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono font-semibold">
                    รหัสตัวแทน: {agentCode}
                  </p>
                </div>

                {/* แถบไฮไลท์ประสบการณ์ & ประเภทที่ถนัด แบบเรียบหรูไม่มีไอคอนรก */}
                <div className="w-full bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-left text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium text-[11px]">ประสบการณ์</span>
                    <span className="font-bold text-slate-800 text-[11px]">{form.experience || 'นายหน้ามืออาชีพ'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium text-[11px]">ทำเลเชี่ยวชาญ</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]">{form.specialtyZone || 'สงขลา-หาดใหญ่'}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="text-slate-400 font-medium text-[11px]">ประเภทที่ถนัด</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]">{form.specialtyType || 'บ้านเดี่ยว, ทาวน์โฮม'}</span>
                  </div>
                </div>

                {/* ปุ่มติดต่อจำลอง (โทร & LINE) */}
                <div className="w-full grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-blue-600 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-2xs">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{form.phone ? 'โทรติดต่อ' : 'ยังไม่ระบุเบอร์'}</span>
                  </div>
                  <div className="bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-2xs">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{form.lineId ? `LINE: ${form.lineId}` : 'ยังไม่ระบุ LINE'}</span>
                  </div>
                </div>

              </div>

              {/* คำแนะนำเพิ่มเติม */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200/60 rounded-xl space-y-1 text-blue-900 text-[11px]">
                <p className="font-bold">
                  โปรไฟล์ที่ครบถ้วนช่วยเพิ่มความมั่นใจ
                </p>
                <p className="text-blue-800/80 leading-relaxed text-[10px]">
                  ลูกค้าจะตัดสินใจทักแชทหรือจองคิวนัดหมายได้เร็วยิ่งขึ้นเมื่อเห็นรูปถ่ายชัดเจนและทำเลที่เชี่ยวชาญตรงกับที่กำลังมองหา
                </p>
              </div>

            </div>
          </aside>

        </div>

        {/* Modal ยืนยันการลบบัญชี */}
        {showConfirmDelete && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowConfirmDelete(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-sm sm:text-base">ยืนยันการลบบัญชีถาวร?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ข้อมูลส่วนตัวและประกาศทั้งหมดในระบบจะถูกลบอย่างถาวร ไม่สามารถกู้คืนกลับมาได้อีก
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'กำลังลบ...' : 'ยืนยันลบ'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
