'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function AgentLoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
      } else {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        if (role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else {
          window.location.href = '/agent/home';
        }
      }
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อระบบความปลอดภัยหลังบ้านได้");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white text-slate-800 antialiased">
      {/* Left Dark Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#090d16] items-center justify-center p-12 overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e293b,transparent)] opacity-40" />
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        <div className="relative z-10 w-full max-w-md flex flex-col justify-between h-full py-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
              S
            </div>
            <span className="text-2xl font-black text-white tracking-tight">
              Srichai<span className="text-amber-500">Agent</span>
            </span>
          </div>

          {/* Main Copy */}
          <div className="my-auto py-12">
            <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 backdrop-blur-md rounded-full px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              PARTNER PORTAL
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-5 leading-[1.3] tracking-tight">
              ระบบบริหารจัดการ<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-300">สำหรับนายหน้ามืออาชีพ</span>
            </h1>
            <p className="text-slate-400 text-sm font-light leading-relaxed mb-8">
              จัดการรายการประกาศ, ติดตามสถานะการนัดหมาย, ดูแลลูกค้า และเพิ่มโอกาสปิดการขายด้วยเครื่องมือระดับพรีเมียมของเรา
            </p>
            
            <div className="w-full h-px bg-slate-800/60 mb-8" />

            {/* Stats */}
            <div className="flex gap-12">
              <div>
                <div className="text-3xl font-black text-amber-500 mb-1">24/7</div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">ระบบออนไลน์</div>
              </div>
              <div>
                <div className="text-3xl font-black text-white mb-1">5K+</div>
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">ฐานลูกค้าในระบบ</div>
              </div>
            </div>
          </div>

          {/* Banner Footer */}
          <div className="text-[10px] text-slate-600 font-medium">
            Srichai Property Agents Platform &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-16 min-h-screen bg-white">
        {/* Top bar with back button */}
        <div className="flex justify-end w-full mb-8">
          <Link 
            href="/home" 
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition text-slate-600 font-medium text-xs shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับหน้าหลัก (ลูกค้า)
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">เข้าสู่ระบบนายหน้า</h2>
            <p className="text-slate-500 text-xs font-medium">กรอกอีเมลบริษัทและรหัสผ่านเพื่อเข้าสู่ Agent Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2 ml-0.5 uppercase tracking-wider">อีเมลตัวแทน (Agent Email)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@srichaiproperty.com" 
                  className="w-full pl-10 pr-4 py-3.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  required 
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-2 ml-0.5 uppercase tracking-wider">รหัสผ่าน (Password)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input 
                  type={passwordVisible ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-10 py-3.5 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={togglePassword} 
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-amber-600 transition cursor-pointer bg-transparent border-none"
                >
                  {passwordVisible ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-amber-500 border-slate-300 rounded focus:ring-amber-500 accent-amber-500 cursor-pointer" />
                <span className="text-xs text-slate-500 font-medium select-none">จำฉันไว้ในเครื่องนี้</span>
              </label>
              <a href="#" className="text-xs font-bold text-amber-600 hover:text-amber-700 transition">ลืมรหัสผ่านพนักงาน?</a>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#0d1527] hover:bg-[#16223d] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] mt-4 text-xs cursor-pointer"
            >
              {isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ Agent Dashboard"}
            </button>
          </form>

          {/* Register box */}
          <div className="mt-8 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-3">ต้องการเป็นนายหน้ากับ Srichai Property?</p>
            <Link 
              href="/register/agent" 
              className="inline-block bg-white hover:bg-slate-50 text-amber-600 border border-amber-500 font-extrabold px-6 py-2.5 rounded-xl text-xs transition"
            >
              สมัครร่วมเป็นพาร์ทเนอร์
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex justify-center gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-8">
          <a href="#" className="hover:text-slate-600 transition">Privacy Policy</a>
          <span>&middot;</span>
          <a href="#" className="hover:text-slate-600 transition">Terms of Use</a>
        </div>
      </div>
    </div>
  );
}

