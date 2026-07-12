'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const [role, setRole] = useState<'buyer' | 'agent'>('buyer');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  
  // สร้างสเตตสำหรับเก็บค่าจากฟอร์ม
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRoleChange = (selectedRole: 'buyer' | 'agent') => {
    setRole(selectedRole);
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    setShowOtpModal(true);
  };

  const verifyOtp = async () => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "การสมัครสมาชิกไม่สำเร็จ");
        setShowOtpModal(false);
        return;
      }

      // เมื่อสมัครสมาชิกผ่านสำเร็จ ยิงล็อกอินเข้าระบบโดยอัตโนมัติทันที
      const loginRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (loginRes?.error) {
        alert("สมัครสมาชิกสำเร็จเรียบร้อย! กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ");
        window.location.href = '/login';
      } else {
        alert("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!");
        if (role === 'agent') {
          window.location.href = '/agent/wait';
        } else {
          window.location.href = '/home';
        }
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านเพื่อสมัครสมาชิกได้");
    }
    setShowOtpModal(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Focus next input automatically
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse relative z-0 font-sans bg-white text-slate-800">
      {/* Right/Top Side Graphic */}
      <div className="flex w-full lg:w-5/12 relative bg-slate-900 items-center justify-center overflow-hidden min-h-[450px] lg:min-h-screen">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-50" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')", transform: "scaleX(-1)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-blue-900/40"></div>
        
        <div className="relative z-10 p-8 lg:p-12 text-white max-w-lg">
          <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 leading-tight">เริ่มต้นค้นหาบ้านในฝัน<br />หรือขยายธุรกิจของคุณ</h2>
          <div className="space-y-6 mt-6 lg:mt-10">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-xl shadow-lg">🏡</div>
              <div>
                <h4 className="font-bold text-lg text-white">สำหรับผู้สนใจซื้อ</h4>
                <p className="text-slate-300 text-sm mt-1">ค้นหา บันทึกรายการโปรด และนัดหมายเข้าชมบ้านกับนายหน้าได้โดยตรง</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 text-xl shadow-lg">💼</div>
              <div>
                <h4 className="font-bold text-lg text-white">สำหรับนายหน้า</h4>
                <p className="text-slate-300 text-sm mt-1">ลงประกาศฟรี จัดการนัดหมายลูกค้า และเพิ่มโอกาสปิดการขาย</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Left/Bottom Side Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-2xl">
          
          <Link href="/" className="flex items-center gap-2 mb-8 mt-8 lg:mt-0 cursor-pointer group">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-105 transition-transform">S</div>
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
          </Link>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">สร้างบัญชีผู้ใช้ใหม่</h2>
            <p className="text-slate-500 font-medium">กรอกข้อมูลด้านล่างหรือใช้โซเชียลมีเดียเพื่อเริ่มต้นใช้งาน</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => signIn('google', { callbackUrl: '/home' })}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-bold text-slate-700 active:scale-95 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-2xl shadow-sm transition font-bold cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook
            </button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-medium">หรือสมัครด้วยอีเมล</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">ประเภทบัญชีผู้ใช้ <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative flex cursor-pointer rounded-2xl border bg-slate-50 p-4 shadow-sm transition-all hover:bg-white group">
                  <input 
                    type="radio" 
                    name="user_role" 
                    value="buyer" 
                    checked={role === 'buyer'}
                    onChange={() => handleRoleChange('buyer')}
                    className="peer sr-only" 
                  />
                  <span className="flex flex-col items-center justify-center w-full text-center">
                    <span className="text-3xl mb-2 group-hover:scale-110 transition">🏡</span>
                    <span className="font-bold text-slate-900 peer-checked:text-blue-700">ผู้สนใจซื้อ (Buyer)</span>
                  </span>
                  <span className={`absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all ${role === 'buyer' ? 'border-blue-600 bg-blue-50/50' : 'border-transparent'}`}></span>
                </label>

                <label className="relative flex cursor-pointer rounded-2xl border bg-slate-50 p-4 shadow-sm transition-all hover:bg-white group">
                  <input 
                    type="radio" 
                    name="user_role" 
                    value="agent" 
                    checked={role === 'agent'}
                    onChange={() => handleRoleChange('agent')}
                    className="peer sr-only" 
                  />
                  <span className="flex flex-col items-center justify-center w-full text-center">
                    <span className="text-3xl mb-2 group-hover:scale-110 transition">💼</span>
                    <span className="font-bold text-slate-900 peer-checked:text-blue-700">นายหน้า (Agent)</span>
                  </span>
                  <span className={`absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all ${role === 'agent' ? 'border-blue-600 bg-blue-50/50' : 'border-transparent'}`}></span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  placeholder="สมชาย ใจดี" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">เบอร์โทรศัพท์ (สำหรับรับ OTP) <span className="text-red-500">*</span></label>
                <input 
                  type="tel" 
                  placeholder="08X-XXX-XXXX" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">อีเมล (Email) <span className="text-red-500">*</span></label>
              <input 
                type="email" 
                placeholder="example@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium" 
                required 
              />
            </div>

            {role === 'agent' && (
              <div id="agent-extra-fields" className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-3 transition-opacity">
                <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <div className="text-sm text-amber-900">
                  <span className="font-bold block mb-1">หมายเหตุสำหรับตัวแทนนายหน้า:</span> 
                  หลังจากสมัครสมาชิกเสร็จสิ้น กรุณาไปที่เมนู <span className="font-bold underline">&quot;โปรไฟล์ของฉัน&quot;</span> เพื่ออัปโหลดเอกสารยืนยันตัวตน (เช่น สำเนาบัตรประชาชน) 
                  <div className="mt-2 text-xs text-amber-700 bg-amber-100/50 p-2 rounded-lg border border-amber-200">
                    <span className="font-bold">🔒 การคุ้มครองข้อมูล (PDPA):</span> เอกสารของท่านจะถูกใช้เพื่อวัตถุประสงค์ในการ <span className="font-bold">&quot;ยืนยันตัวตนและป้องกันการฉ้อโกง&quot;</span> เท่านั้น โดยจะถูกตรวจสอบโดยผู้ดูแลระบบ และจะไม่ถูกเปิดเผยต่อสาธารณะ
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่าน <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ยืนยันรหัสผ่าน <span className="text-red-500">*</span></label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 font-medium" 
                  required 
                />
              </div>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms-consent" className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" required />
                <label htmlFor="terms-consent" className="text-sm text-slate-600 font-medium leading-relaxed select-none">
                  ฉันได้อ่านและยอมรับ <a href="#" className="text-blue-600 font-bold hover:underline">ข้อกำหนดการใช้งาน</a> และ <a href="#" className="text-blue-600 font-bold hover:underline">นโยบายความเป็นส่วนตัว</a> 
                  และยินยอมให้ระบบประมวลผลข้อมูลส่วนบุคคล เพื่อวัตถุประสงค์ในการเป็นสื่อกลางซื้อขายอสังหาริมทรัพย์ <span className="text-red-500">*</span>
                </label>
              </div>

              <div className="w-full h-px bg-slate-200 my-2"></div>

              <div className="flex items-start gap-3">
                <input type="checkbox" id="marketing-consent" className="mt-1 w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" />
                <label htmlFor="marketing-consent" className="text-sm text-slate-600 font-medium leading-relaxed select-none">
                  <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold mr-1">ทางเลือก</span>
                  ฉันยินยอมให้ Srichai Property ส่งข้อมูลข่าวสาร โปรโมชั่น และโครงการบ้านใหม่ที่ตรงกับความสนใจของฉัน
                </label>
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-700/30 transform hover:-translate-y-0.5 cursor-pointer">
              รับรหัส OTP เพื่อยืนยันตัวตน
            </button>
          </form>

          <p className="mt-8 text-center text-slate-600 font-medium pb-12 lg:pb-0">
            มีบัญชีผู้ใช้แล้วใช่หรือไม่? 
            <Link href="/login" className="text-blue-600 font-bold hover:underline ml-1">เข้าสู่ระบบเลย</Link>
          </p>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowOtpModal(false)}></div>
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full relative z-10 shadow-2xl transform scale-100 transition-transform">
            <button onClick={() => setShowOtpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📱</div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2">ยืนยันรหัส OTP</h3>
              <p className="text-slate-500 text-sm">เราได้ส่งรหัส 6 หลักไปที่เบอร์โทรศัพท์ของคุณแล้ว</p>
            </div>
            <div className="flex justify-between gap-2 mb-6" id="otp-inputs">
              {otpValues.map((val, idx) => (
                <input 
                  key={idx}
                  id={`otp-input-${idx}`}
                  type="text" 
                  maxLength={1} 
                  value={val}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-blue-600 bg-slate-50 focus:bg-white transition-colors outline-none text-slate-800" 
                />
              ))}
            </div>
            <button onClick={verifyOtp} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition shadow-lg cursor-pointer">ยืนยันและสร้างบัญชี</button>
          </div>
        </div>
      )}
    </div>
  );
}
