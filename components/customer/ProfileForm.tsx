'use client';

import React from 'react';
import { signOut } from 'next-auth/react';

interface ProfileFormProps {
  firstName: string;
  setFirstName: (val: string) => void;
  lastName: string;
  setLastName: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  lineId: string;
  setLineId: (val: string) => void;
  email: string;
  emailNotification: boolean;
  setEmailNotification: (val: boolean) => void;
  smsNotification: boolean;
  setSmsNotification: (val: boolean) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  isSaving: boolean;
  statusMsg: { type: 'success' | 'error'; text: string } | null;
  lastLoginTime: string;
  handleSaveProfile: (e: React.FormEvent) => void;
}

export default function ProfileForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phone,
  setPhone,
  lineId,
  setLineId,
  email,
  emailNotification,
  setEmailNotification,
  smsNotification,
  setSmsNotification,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  isSaving,
  statusMsg,
  lastLoginTime,
  handleSaveProfile,
}: ProfileFormProps) {
  return (
    <main className="flex-1">
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">ตั้งค่าข้อมูลพื้นฐาน</h2>
            <p className="text-slate-400 text-xs mt-0.5">ข้อมูลที่ครบถ้วนช่วยเพิ่มความน่าเชื่อถือในการติดต่อ</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            อีเมลยืนยันแล้ว
          </span>
        </div>

        {/* Notification Alert Status */}
        {statusMsg && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-8">
          
          {/* Personal Info Group */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ข้อมูลส่วนบุคคล</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ชื่อจริง <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder="กรอกชื่อจริง"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  นามสกุล <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder="กรอกนามสกุล"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์มือถือ <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="tel" 
                  required
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="097-xxx-xxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">LINE ID (แนะนำ)</label>
                <input 
                  type="text" 
                  value={lineId} 
                  onChange={(e) => setLineId(e.target.value)} 
                  placeholder="ใส่ไลน์ไอดีเพื่อการติดต่อที่รวดเร็ว"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">อีเมล (Email)</label>
              <input 
                type="email" 
                value={email} 
                disabled 
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">ไม่อนุญาตให้แก้ไขอีเมลเพื่อความปลอดภัย หากต้องการเปลี่ยนกรุณาติดต่อแอดมิน</p>
            </div>
          </div>

          {/* Notification Toggles */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">การตั้งค่าการแจ้งเตือน</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-semibold text-slate-800">รับแจ้งเตือนผ่านอีเมล (Email)</h4>
                  <p className="text-slate-400 text-[11px]">ข่าวสาร, โครงการใหม่, สถานะการนัดหมาย</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setEmailNotification(!emailNotification)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    emailNotification ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailNotification ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-semibold text-slate-800">รับข้อความแชทผ่าน SMS</h4>
                  <p className="text-slate-400 text-[11px]">แจ้งเตือนด่วนเมื่อนายหน้า/ลูกค้าส่งข้อความหาคุณ</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setSmsNotification(!smsNotification)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    smsNotification ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    smsNotification ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Password & Security Section */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ความปลอดภัย</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">รหัสผ่านใหม่ (ทิ้งว่างไว้หากไม่ต้องการเปลี่ยน)</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">ยืนยันรหัสผ่านใหม่</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition text-slate-900"
                />
              </div>
            </div>

            {/* Login History Bar */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-100 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold text-slate-700">ประวัติเข้าสู่ระบบล่าสุด</span>
                <span className="text-slate-400 font-mono hidden sm:inline">Windows 10 - Chrome - Hat Yai (IP: 182.176.x.x)</span>
              </div>
              <span className="text-slate-400">{lastLoginTime}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => {
                setFirstName('');
                setLastName('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
            >
              ยกเลิก
            </button>

            <button 
              type="submit" 
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>

        </form>

        {/* Danger Zone: Delete Account */}
        <div className="pt-6 border-t border-slate-100">
          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-rose-700 text-xs">ลบบัญชีผู้ใช้ (Delete Account)</h4>
              <p className="text-rose-500 text-[11px] mt-0.5">
                เมื่อคุณลบบัญชี ข้อมูลส่วนตัว ประวัติการค้นหา และประกาศทั้งหมดของคุณจะถูกลบออกจากระบบอย่างถาวร
              </p>
            </div>

            <button 
              type="button"
              onClick={async () => {
                const confirmDel = window.confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้");
                if (confirmDel) {
                  try {
                    const res = await fetch('/api/auth/delete-account', { method: 'DELETE' });
                    if (res.ok) {
                      alert('ลบบัญชีเรียบร้อยแล้ว');
                      signOut({ callbackUrl: '/login' });
                    }
                  } catch {
                    alert('ไม่สามารถลบบัญชีได้');
                  }
                }
              }}
              className="px-4 py-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl text-xs transition cursor-pointer flex-shrink-0"
            >
              ลบบัญชีถาวร
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}
