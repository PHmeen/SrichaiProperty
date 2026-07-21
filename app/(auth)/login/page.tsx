'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null);
  const [showCookies, setShowCookies] = useState(true);

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
        } else if (role === 'agent') {
          window.location.href = '/agent/home';
        } else {
          window.location.href = '/';
        }
      }
    } catch {
      setErrorMsg("ไม่สามารถเชื่อมต่อระบบความปลอดภัยหลังบ้านได้");
      setIsLoading(false);
    }
  };

  const policies = {
    privacy: {
      title: "📄 นโยบายความเป็นส่วนตัว",
      content: "การจัดเก็บข้อมูล: เราจะจัดเก็บข้อมูลส่วนบุคคลของคุณ เช่น ชื่อ, อีเมล และเบอร์โทรศัพท์ เพื่อวัตถุประสงค์ในการให้บริการ และการทำนัดหมายชมบ้าน ข้อมูลทั้งหมดจะได้รับการเข้ารหัสและไม่ถูกส่งต่อให้บุคคลภายนอกที่ไม่เกี่ยวข้อง"
    },
    terms: {
      title: "⚖️ เงื่อนไขการใช้งาน",
      content: "ข้อตกลงและเงื่อนไข:\n1. ผู้ใช้ต้องใช้ข้อมูลที่เป็นจริงในการทำธุรกรรม\n2. การลงประกาศขาย/เช่า ต้องเป็นทรัพย์ที่ได้รับอนุญาตอย่างถูกต้อง\n3. ทางบริษัทขอสงวนสิทธิ์ในการระงับบัญชีที่ละเมิดกฎความเป็นส่วนตัว"
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative font-sans bg-white text-slate-800">
      {/* Left Banner Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden h-screen sticky top-0">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-[10000ms] hover:scale-105" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
        
        <div className="relative z-10 p-12 text-white max-w-xl">
          <Link href="/" className="flex items-center gap-2 mb-8 cursor-pointer hover:opacity-90 transition">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-600/30">S</div>
            <span className="text-3xl font-extrabold tracking-tight">Srichai<span className="text-blue-400">Property</span></span>
          </Link>
          <h1 className="text-5xl font-extrabold mb-6 leading-[1.2]">ยินดีต้อนรับกลับมา<br />สู่พื้นที่แห่งความสุข</h1>
          <p className="text-slate-300 text-lg font-light leading-relaxed">เข้าสู่ระบบเพื่อจัดการอสังหาริมทรัพย์ของคุณ นัดหมายเข้าชมบ้าน หรือพูดคุยกับนายหน้ามืออาชีพของเรา</p>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-sm my-auto py-8">
          
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center cursor-pointer">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">S</div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
          </Link>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">เข้าสู่ระบบ</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">กรุณากรอกอีเมลและรหัสผ่านของคุณเพื่อดำเนินการต่อ</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
              type="button"
              onClick={() => signIn('google', { callbackUrl: '/home' })}
              className="flex items-center justify-center gap-2.5 w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow transition-all duration-300 font-bold text-slate-700 active:scale-[0.98] cursor-pointer text-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button 
              type="button"
              onClick={() => signIn('facebook', { callbackUrl: '/home' })}
              className="flex items-center justify-center gap-2.5 w-full px-3 py-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl shadow-sm hover:shadow hover:shadow-blue-500/10 transition-all duration-300 font-bold active:scale-[0.98] cursor-pointer text-xs"
            >
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-bold uppercase tracking-widest text-[9px]">หรือใช้อีเมลของคุณ</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4.5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                ⚠️ {errorMsg}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">อีเมล (Email)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">รหัสผ่าน (Password)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </span>
                <input 
                  type={passwordVisible ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  required 
                />
                <button 
                  type="button" 
                  onClick={togglePassword} 
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-blue-600 transition cursor-pointer"
                >
                  {passwordVisible ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                <span className="text-xs text-slate-600 font-medium select-none">จำฉันไว้</span>
              </label>
              <a href="#" className="text-xs font-bold text-blue-600 hover:underline">ลืมรหัสผ่าน?</a>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-blue-700/10 active:scale-[0.98] mt-3 text-sm cursor-pointer"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2 animate-pulse">กำลังเข้าสู่ระบบ...</span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-slate-600 font-medium text-xs">
            ยังไม่มีบัญชี? <Link href="/register" className="text-blue-600 font-bold hover:underline ml-1">สมัครสมาชิกฟรี</Link>
          </p>

          {/* กล่องแยกสำหรับนายหน้า (Agent Portal Section) */}
          <div className="mt-8 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
            <span className="text-sm font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
              💼 สำหรับนายหน้า (Agent Portal)
            </span>
            <p className="text-[11px] text-slate-500 mb-3">
              คุณต้องการลงประกาศอสังหาริมทรัพย์และจัดการผู้สนใจซื้อใช่หรือไม่?
            </p>
            <div className="flex gap-2 w-full">
              <Link 
                href="/login/agent" 
                className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm cursor-pointer"
              >
                เข้าสู่ระบบนายหน้า
              </Link>
              <Link 
                href="/register/agent" 
                className="flex-1 text-center bg-white hover:bg-slate-50 text-emerald-700 font-bold py-2 rounded-xl text-xs border border-emerald-200 transition cursor-pointer"
              >
                สมัครเป็นนายหน้า
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <div className="flex justify-center gap-5 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex-wrap">
              <button onClick={() => setPolicyType('privacy')} className="hover:text-blue-600 transition cursor-pointer bg-transparent border-none">Privacy Policy</button>
              <button onClick={() => setPolicyType('terms')} className="hover:text-blue-600 transition cursor-pointer bg-transparent border-none">Terms of Use</button>
              <Link href="/home" className="hover:text-blue-600 transition italic">Home &rarr;</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Cookies Banner */}
      {showCookies && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-[100] transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-slate-700">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="text-sm text-slate-300 flex-1">
              <p className="font-bold text-white mb-1 flex items-center gap-2">
                <span>🍪</span> การตั้งค่าคุกกี้และนโยบายความเป็นส่วนตัว
              </p>
              <p className="leading-relaxed">
                เว็บไซต์ Srichai Property Agents ใช้คุกกี้เพื่อเพิ่มประสิทธิภาพและประสบการณ์ที่ดีในการค้นหาอสังหาริมทรัพย์ของคุณ รวมถึงเก็บรวบรวมข้อมูลส่วนบุคคลตาม{" "}
                <button onClick={() => setPolicyType('privacy')} className="text-blue-400 font-bold hover:text-blue-300 underline bg-transparent border-none cursor-pointer">
                  นโยบายความเป็นส่วนตัว (Privacy Policy)
                </button>{" "}
                ของเรา
              </p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto mt-2 md:mt-0">
              <button onClick={() => setShowCookies(false)} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-md whitespace-nowrap cursor-pointer">
                ยอมรับทั้งหมด
              </button>
              <button onClick={() => setShowCookies(false)} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap cursor-pointer">
                ตั้งค่าคุกกี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {policyType && policies[policyType] && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPolicyType(null)}></div>
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full max-h-[80vh] flex flex-col relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                {policies[policyType].title}
              </h3>
              <button onClick={() => setPolicyType(null)} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto text-slate-600 space-y-6 leading-relaxed text-sm whitespace-pre-line">
              {policies[policyType].content}
            </div>
            <div className="p-6 border-t border-slate-100 text-center">
              <button onClick={() => setPolicyType(null)} className="w-full sm:w-auto bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 cursor-pointer">
                เข้าใจและยอมรับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
