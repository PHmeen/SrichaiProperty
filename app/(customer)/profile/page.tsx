'use client';

/**
 * page.tsx (User Profile Settings) - หน้าแก้ไขและจัดการโปรไฟล์ส่วนตัว
 * เหมาะสำหรับมือใหม่: แสดงวิธีการเชื่อมต่อฟิลด์ข้อมูล Input ให้ผูกกับ state
 * และอัปเดตข้อมูลกลับไปยังระบบฐานข้อมูลจำลอง (Context) เพื่อไปแสดงข้ามหน้าเพจ
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/app/context/AppContext';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session } = useSession();
  // === 1. ดึงข้อมูลส่วนตัวและฟังก์ชันบันทึกโปรไฟล์จาก Context ===
  const { profile, updateProfile } = useApp();

  // === 2. กำหนดสถานะอินพุตเริ่มต้นจากประวัติโปรไฟล์ที่มีอยู่ ===
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [kycDoc, setKycDoc] = useState<File | null>(null);

  // เมธอดส่งข้อมูลฟอร์มบันทึก
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // อัปเดตลง Context และเซฟเข้า LocalStorage
    updateProfile({
      fullName,
      phone
    });
    alert('บันทึกการเปลี่ยนแปลงข้อมูลเรียบร้อยแล้ว!');
  };

  // เมธอดอัปโหลดเอกสาร KYC ยืนยันตัวนายหน้า (รองรับโหมดนายหน้า)
  const handleKycUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setKycDoc(e.target.files[0]);
      alert('อัปโหลดไฟล์เรียบร้อย: ' + e.target.files[0].name);
    }
  };

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      
      {/* 🧭 เมนูนำทางด้านบน */}
      <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/home" className="flex-shrink-0 flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:scale-105 transition-transform">S</div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
            </Link>

            <div className="hidden lg:flex space-x-1 items-center bg-slate-100/50 p-0.5 rounded-full border border-slate-200">
              <Link href="/home" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">หน้าแรก</Link>
              <Link href="/search" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ค้นหาอสังหาฯ</Link>
              <Link href="/agents" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">นายหน้าของเรา</Link>
              <Link href="/appointments" className="text-slate-600 hover:text-blue-600 hover:bg-white/50 rounded-full px-4 py-1.5 text-xs font-medium transition">ประวัติการนัดหมาย</Link>
            </div>

            <div className="flex items-center space-x-2">
              <Link href="/profile" className="flex items-center space-x-2 bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-sm hover:bg-slate-100 transition cursor-pointer">
                <img src={session?.user?.image || "https://i.pravatar.cc/150?img=68"} alt="Profile" className="w-7 h-7 rounded-full border border-white shadow-sm object-cover" />
                <div className="flex flex-col hidden sm:flex">
                  <span className="text-xs font-bold text-slate-900 leading-none">{session?.user?.name || profile.fullName}</span>
                  <span className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                    {profile.role === 'buyer' ? 'ผู้สนใจซื้อ' : profile.role === 'agent' ? 'นายหน้า' : 'ผู้ดูแลระบบ'}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ส่วนหัวแสดงชื่อหน้าเพจ */}
      <div className="bg-slate-950 pt-24 pb-12 relative overflow-hidden flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 relative z-10 text-white">
          <h1 className="text-2xl font-extrabold">จัดการบัญชีผู้ใช้</h1>
          <p className="text-slate-300 text-xs mt-1">อัปเดตข้อมูลส่วนตัว ตั้งค่าความปลอดภัย และยืนยันตัวตนนายหน้า</p>
        </div>
      </div>

      {/* 📦 แผงเนื้อหาหลัก */}
      <div className="max-w-5xl mx-auto px-4 pb-16 -mt-6 flex flex-col lg:flex-row gap-6 relative z-20 w-full flex-grow">
        
        {/* เมนูแท็บด้านข้าง (Sidebar) */}
        <aside className="w-full lg:w-1/4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 lg:sticky lg:top-24 space-y-5">
            <div className="text-center pb-4 border-b border-slate-100 space-y-2">
              <div className="relative inline-block group cursor-pointer">
                <img src={session?.user?.image || "https://i.pravatar.cc/150?img=68"} alt="Profile" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 shadow-md" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm">{session?.user?.name || fullName}</h3>
              <p className="text-slate-500 text-[11px]">{session?.user?.email || profile.email}</p>
            </div>

            {/* ปุ่มสลับบทบาทการใช้งาน (ผู้ซื้อ / นายหน้า / แอดมิน) */}
            <div className="bg-slate-100 p-1 rounded-xl flex gap-1 relative">
              <button 
                onClick={() => updateProfile({ role: 'buyer' })}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${profile.role === 'buyer' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                ผู้ซื้อ
              </button>
              <button 
                onClick={() => updateProfile({ role: 'agent' })}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${profile.role === 'agent' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
              >
                นายหน้า
              </button>
              <button 
                onClick={() => updateProfile({ role: 'admin' })}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${profile.role === 'admin' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
              >
                แอดมิน
              </button>
            </div>

            <nav className="space-y-1 text-xs font-medium">
              <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-100">
                👤 ข้อมูลส่วนตัว
              </Link>
              <Link href="/favorites" className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
                ❤️ รายการโปรด
              </Link>
              <Link href="/appointments" className="flex items-center gap-2.5 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition">
                📅 การนัดหมายชมบ้าน
              </Link>
              {profile.role === 'agent' && (
                <Link href="/agent/dashboard" className="flex items-center gap-2.5 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition font-bold border border-dashed border-blue-200">
                  🖥️ แดชบอร์ดนายหน้า
                </Link>
              )}
              {profile.role === 'admin' && (
                <Link href="/admin/dashboard" className="flex items-center gap-2.5 px-3 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition font-bold border border-dashed border-purple-200">
                  🖥️ แดชบอร์ดผู้ดูแลระบบ
                </Link>
              )}
            </nav>
          </div>
        </aside>

        {/* คอลัมน์กรอกข้อมูลทางขวา */}
        <main className="w-full lg:w-3/4">
          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">ตั้งค่าข้อมูลพื้นฐาน</h2>
                <p className="text-slate-500 text-xs">แก้ไขข้อมูลเพื่อให้การติดต่อกับนายหน้ามีความถูกต้อง</p>
              </div>
              <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-1 rounded">✓ ยืนยันแล้ว</span>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ชื่อ-นามสกุล</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs text-slate-800" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">อีเมลที่ผูกกับระบบ</label>
                <input 
                  type="email" 
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-400 cursor-not-allowed" 
                />
              </div>

              {/* ส่วนแนบเอกสารยืนยันตัวตน (KYC) จะทำงานเฉพาะโหมดนายหน้า */}
              {profile.role === 'agent' && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                  <h3 className="text-xs font-bold text-amber-800">🔒 ยืนยันตัวตนตัวแทนนายหน้า (KYC Documents)</h3>
                  <p className="text-[11px] text-slate-600 leading-relaxed">กรุณาแนบสำเนาบัตรประชาชน หรือเอกสารใบอนุญาตตัวแทนนายหน้าเพื่อประกอบการพิจารณาตรวจสอบสิทธิ์</p>
                  <div>
                    <input 
                      type="file" 
                      onChange={handleKycUpload}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 cursor-pointer" 
                    />
                  </div>
                  {kycDoc && <p className="text-[10px] text-amber-700 font-bold">ไฟล์ปัจจุบัน: {kycDoc.name}</p>}
                </div>
              )}

              <button 
                type="submit" 
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2.5 rounded-xl transition text-xs shadow cursor-pointer"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </form>
          </div>

          {/* ส่วนของการลบบัญชีอย่างถาวร (Danger Zone) */}
          <div className="mt-6 bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-red-100 space-y-4">
            <div className="border-b border-red-50 pb-3">
              <h3 className="text-sm font-extrabold text-red-600 flex items-center gap-2">
                ⚠️ โซนอันตราย (Danger Zone)
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                การดำเนินการในส่วนนี้จะไม่สามารถกู้คืนข้อมูลได้ในภายหลัง
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">ลบบัญชีผู้ใช้งานถาวร</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
                  เมื่อลบบัญชีแล้ว ข้อมูลประกาศ ประวัตินัดหมาย และข้อมูลการแชททั้งหมดของคุณจะถูกทำลายทิ้งและลบออกจากระบบอย่างถาวรทันที
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const checkConfirm = window.confirm("⚠️ คุณแน่ใจอย่างยิ่งใช่หรือไม่ว่าต้องการลบบัญชีผู้ใช้งานนี้? การกระทำนี้ไม่สามารถย้อนกลับได้");
                  if (checkConfirm) {
                    try {
                      const res = await fetch('/api/auth/delete-account', {
                        method: 'DELETE'
                      });
                      const result = await res.json();
                      if (res.ok) {
                        alert("ลบบัญชีสำเร็จแล้ว ระบบจะนำคุณออกจากระบบโดยอัตโนมัติ");
                        window.location.href = '/login';
                      } else {
                        alert(result.error || "เกิดข้อผิดพลาดในการลบบัญชี");
                      }
                    } catch {
                      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อขอลบบัญชีได้");
                    }
                  }
                }}
                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-4 py-2.5 rounded-xl transition text-xs shadow-sm cursor-pointer whitespace-nowrap"
              >
                ลบบัญชีของฉัน
              </button>
            </div>
          </div>
        </main>

      </div>
    </div>
  );
}
