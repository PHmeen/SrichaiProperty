// บอก Next.js ว่าไฟล์นี้เป็น "Client Component" คือทำงานฝั่งเบราว์เซอร์
// (จำเป็นเพราะไฟล์นี้มีการใช้ useState, onClick, onChange ซึ่งเป็นโค้ดที่ต้องรันบนฝั่งผู้ใช้ ไม่ใช่บนเซิร์ฟเวอร์)
'use client';

import React, { useState } from 'react';
import Link from 'next/link'; // ใช้แทน <a> เพื่อเปลี่ยนหน้าแบบไม่รีเฟรชทั้งหน้า (เร็วกว่า)
import { signIn } from 'next-auth/react'; // ฟังก์ชันจากไลบรารี NextAuth ใช้สำหรับส่งข้อมูลไปตรวจสอบว่า login ผ่านหรือไม่
import SocialLoginButtons from '@/components/auth/SocialLoginButtons'; // ปุ่ม login ผ่าน Google/Facebook ฯลฯ (แยกเป็นคอมโพเนนต์ย่อย)
import AgentPortalBanner from '@/components/auth/AgentPortalBanner'; // แบนเนอร์แนะนำ/ลิงก์สำหรับ "นายหน้า" (agent)
import PolicyModal from '@/components/auth/PolicyModal'; // popup แสดงเนื้อหานโยบายความเป็นส่วนตัว/ข้อตกลงการใช้งาน
import CookieBanner from '@/components/auth/CookieBanner'; // แถบแจ้งเตือนขอความยินยอมใช้คุกกี้ (ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล)

// คอมโพเนนต์หลักของหน้า "เข้าสู่ระบบ" — React จะ render ฟังก์ชันนี้เป็นหน้าเว็บ
export default function LoginPage() {
  // ===== ตัวแปรสถานะ (State) ของหน้านี้ =====
  // useState คืนค่าเป็น [ค่าปัจจุบัน, ฟังก์ชันสำหรับเปลี่ยนค่า] และเมื่อค่าเปลี่ยน React จะ render หน้าใหม่ให้อัตโนมัติ

  const [passwordVisible, setPasswordVisible] = useState(false); // true = แสดงรหัสผ่านเป็นตัวอักษร, false = ซ่อนเป็นจุด (•••)
  const [isLoading, setIsLoading] = useState(false); // true ระหว่างที่กำลังส่งข้อมูลไปตรวจสอบ login (ใช้ปิดปุ่ม/แสดง spinner กันคนกดซ้ำ)
  const [email, setEmail] = useState(''); // เก็บค่าที่ผู้ใช้พิมพ์ในช่องอีเมล
  const [password, setPassword] = useState(''); // เก็บค่าที่ผู้ใช้พิมพ์ในช่องรหัสผ่าน
  const [errorMsg, setErrorMsg] = useState(''); // ข้อความ error ที่จะโชว์เมื่อ login ไม่สำเร็จ (ว่าง = ไม่มี error)
  const [policyType, setPolicyType] = useState<'privacy' | 'terms' | null>(null); // ระบุว่าจะเปิด popup นโยบายแบบไหน (privacy/terms) หรือไม่เปิดเลย (null)
  const [showCookies, setShowCookies] = useState(true); // true = ยังโชว์แถบแจ้งเตือนคุกกี้อยู่ (เริ่มต้นให้โชว์ก่อนเสมอ)

  // [ติวสอบ]: ฟังก์ชันเมื่อกดปุ่ม "เข้าสู่ระบบ"
  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); // ป้องกันหน้าเว็บรีเฟรช
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. เรียกใช้ NextAuth signIn เพื่อตรวจสอบอีเมล/รหัสผ่าน
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      // 2. ถ้าล็อกอินไม่ผ่าน (รหัสผิด, เมลไม่มี) จะได้ error กลับมา
      if (res?.error) {
        setErrorMsg(res.error);
        setIsLoading(false);
      } else {
        // 3. ถ้าล็อกอินผ่าน ดึงข้อมูล Session ปัจจุบันเพื่อดูว่าคนนี้เป็น Role อะไร
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const role = sessionData?.user?.role;

        // 4. สั่งพาผู้ใช้ไปหน้าเว็บที่ถูกต้องตาม Role
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

  // ===== ส่วนแสดงผล (UI) ของหน้า =====
  // โครงสร้างหลักแบ่งเป็น 2 คอลัมน์ (flex-row) บนจอใหญ่ (lg ขึ้นไป):
  //   - ซ้าย: รูปภาพพื้นหลัง + ข้อความต้อนรับ (โชว์เฉพาะจอใหญ่)
  //   - ขวา: ฟอร์มกรอกอีเมล/รหัสผ่านสำหรับ login
  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative font-sans bg-white text-slate-800">
      {/* ===== ฝั่งซ้าย: แบนเนอร์รูปภาพต้อนรับ (ซ่อนบนมือถือ, โชว์เฉพาะจอ lg ขึ้นไป) ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden h-screen sticky top-0">
        {/* รูปพื้นหลัง ปรับให้ค่อยๆ ซูมเข้าเล็กน้อยเวลาชี้เมาส์ (hover:scale-105) */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 transition-transform duration-[10000ms] hover:scale-105"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
        />
        {/* เลเยอร์ไล่สีดำทับรูป เพื่อให้ตัวหนังสือสีขาวด้านบนอ่านง่ายขึ้น */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

        {/* กล่องข้อความ/โลโก้ ลอยอยู่เหนือรูปภาพ (z-10) */}
        <div className="relative z-10 p-12 text-white max-w-xl">
          <Link href="/" className="flex items-center gap-2 mb-8 cursor-pointer hover:opacity-90 transition">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-600/30">S</div>
            <span className="text-3xl font-extrabold tracking-tight">Srichai<span className="text-blue-400">Property</span></span>
          </Link>
          <h1 className="text-5xl font-extrabold mb-6 leading-[1.2]">ยินดีต้อนรับกลับมา<br />สู่พื้นที่แห่งความสุข</h1>
          <p className="text-slate-300 text-lg font-light leading-relaxed">เข้าสู่ระบบเพื่อจัดการอสังหาริมทรัพย์ของคุณ นัดหมายเข้าชมบ้าน หรือพูดคุยกับนายหน้ามืออาชีพของเรา</p>
        </div>
      </div>

      {/* ===== ฝั่งขวา: ฟอร์มเข้าสู่ระบบ (โชว์เสมอทั้งมือถือและจอใหญ่) ===== */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 bg-white min-h-screen overflow-y-auto">
        <div className="w-full max-w-sm my-auto py-8">

          {/* โลโก้ขนาดเล็ก โชว์เฉพาะตอนจอเล็ก (มือถือ) เพราะฝั่งซ้ายที่มีโลโก้ใหญ่ถูกซ่อนไปแล้ว */}
          <Link href="/" className="flex lg:hidden items-center gap-2 mb-8 justify-center cursor-pointer">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">S</div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">Srichai<span className="text-blue-600">Property</span></span>
          </Link>

          {/* หัวข้อ + คำอธิบายสั้นๆ ของฟอร์ม */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">เข้าสู่ระบบ</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">กรุณากรอกอีเมลและรหัสผ่านของคุณเพื่อดำเนินการต่อ</p>
          </div>

          {/* ปุ่ม login ผ่านบริการภายนอก (เช่น Google) — โค้ดจริงอยู่ในคอมโพเนนต์แยกต่างหาก */}
          <SocialLoginButtons />

          {/* เส้นคั่น พร้อมข้อความ "หรือใช้อีเมลของคุณ" ตรงกลาง เพื่อแยกโซน social login กับฟอร์มกรอกเอง */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 font-bold uppercase tracking-widest text-[9px]">หรือใช้อีเมลของคุณ</span>
            </div>
          </div>

          {/* ฟอร์มหลัก: เมื่อกด submit (กดปุ่มหรือกด Enter) จะเรียก handleLogin ด้านบน */}
          <form onSubmit={handleLogin} className="space-y-4.5">
            {/* กล่องแสดง error — โชว์ก็ต่อเมื่อ errorMsg ไม่ใช่ค่าว่าง */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-medium">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* ช่องกรอกอีเมล */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">อีเมล (Email)</label>
              <div className="relative">
                {/* ไอคอนรูปคนเล็กๆ วางลอยทับซ้ายของช่อง input */}
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
                </span>
                <input
                  type="email"
                  value={email} // ค่าปัจจุบันมาจาก state (controlled input) เพื่อให้ React ควบคุมค่าตลอดเวลา
                  onChange={(e) => setEmail(e.target.value)} // ทุกครั้งที่พิมพ์ จะอัปเดต state email ทันที
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs"
                  required // บังคับกรอกก่อน submit ได้ (ตรวจสอบเบื้องต้นโดยเบราว์เซอร์)
                />
              </div>
            </div>

            {/* ช่องกรอกรหัสผ่าน */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 ml-1">รหัสผ่าน (Password)</label>
              <div className="relative">
                {/* ไอคอนกุญแจล็อก วางลอยทับซ้ายของช่อง input */}
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </span>
                <input
                  type={passwordVisible ? "text" : "password"} // สลับชนิด input ตาม state: "text" = เห็นตัวอักษรจริง, "password" = ซ่อนเป็นจุด
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs"
                  required
                />
                {/* ปุ่มไอคอนตา — กดเพื่อสลับโชว์/ซ่อนรหัสผ่าน (ไม่ใช่ปุ่ม submit จึงต้องกำหนด type="button") */}
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-blue-600 transition cursor-pointer"
                >
                  {passwordVisible ? (
                    // ไอคอน "ตาปิด/ขีดฆ่า" แสดงตอนกำลังเผยรหัสผ่านอยู่ (กดอีกทีเพื่อซ่อน)
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                  ) : (
                    // ไอคอน "ตาเปิด" แสดงตอนรหัสผ่านถูกซ่อนอยู่ (กดเพื่อเผยให้เห็น)
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                  )}
                </button>
              </div>
            </div>

            {/* แถว "จำฉันไว้" (checkbox ที่ยังไม่ผูก state/ฟังก์ชันจริง) และลิงก์ "ลืมรหัสผ่าน?" (ยังเป็น href="#" ไม่ได้ลิงก์ไปหน้าจริง) */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <input type="checkbox" className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                <span className="text-xs text-slate-600 font-medium select-none">จำฉันไว้</span>
              </label>
              <a href="#" className="text-xs font-bold text-blue-600 hover:underline">ลืมรหัสผ่าน?</a>
            </div>

            {/* ปุ่มกด submit ฟอร์ม — ปิดการกด (disabled) ระหว่าง isLoading เพื่อกันผู้ใช้กดซ้ำหลายครั้ง */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md shadow-blue-700/10 active:scale-[0.98] mt-3 text-sm cursor-pointer"
            >
              {isLoading ? (
                // ระหว่างรอผลลัพธ์ login จะเปลี่ยนข้อความบนปุ่มพร้อมเอฟเฟกต์กระพริบ (animate-pulse)
                <span className="flex items-center justify-center gap-2 animate-pulse">กำลังเข้าสู่ระบบ...</span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

          {/* ลิงก์ไปหน้าสมัครสมาชิก สำหรับคนที่ยังไม่มีบัญชี */}
          <p className="mt-6 text-center text-slate-600 font-medium text-xs">
            ยังไม่มีบัญชี? <Link href="/register" className="text-blue-600 font-bold hover:underline ml-1">สมัครสมาชิกฟรี</Link>
          </p>

          {/* แบนเนอร์แนะนำระบบ/ช่องทางสำหรับนายหน้าอสังหาริมทรัพย์ */}
          <AgentPortalBanner />

          {/* แถวลิงก์ท้ายฟอร์ม: เปิด popup นโยบายความเป็นส่วนตัว/ข้อตกลงการใช้งาน หรือกลับไปหน้า Home */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
            <div className="flex justify-center gap-5 text-[10px] text-slate-400 font-bold uppercase tracking-widest flex-wrap">
              <button onClick={() => setPolicyType('privacy')} className="hover:text-blue-600 transition cursor-pointer bg-transparent border-none">Privacy Policy</button>
              <button onClick={() => setPolicyType('terms')} className="hover:text-blue-600 transition cursor-pointer bg-transparent border-none">Terms of Use</button>
              <Link href="/home" className="hover:text-blue-600 transition italic">Home &rarr;</Link>
            </div>
          </div>
        </div>
      </div>

      {/* แถบแจ้งเตือนขอความยินยอมใช้คุกกี้ — ควบคุมด้วย state showCookies, กดยอมรับแล้วจะซ่อนไปและไม่โชว์อีก (จนกว่าจะรีเฟรช/กลับมาใหม่) */}
      <CookieBanner
        show={showCookies}
        onAccept={() => setShowCookies(false)}
        onOpenPrivacy={() => setPolicyType('privacy')}
      />

      {/* Popup แสดงเนื้อหานโยบาย — ถูกควบคุมด้วย state policyType (null = ปิดอยู่, 'privacy'/'terms' = เปิดและโชว์เนื้อหาตามประเภท) */}
      <PolicyModal
        policyType={policyType}
        onClose={() => setPolicyType(null)}
      />
    </div>
  );
}
