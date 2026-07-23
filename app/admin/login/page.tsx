'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@srichaiproperty.com');
  const [password, setPassword] = useState('1234');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
        return;
      }

      // ตรวจสอบว่าผู้ใช้มีสิทธิ์เป็น admin หรือไม่
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();

      if (session?.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        setErrorMsg('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานระบบผู้ดูแลระบบ (Admin Only)');
        setLoading(false);
      }
    } catch {
      setErrorMsg('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-sm font-sans">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md space-y-6 border border-slate-700/20">
        <div className="text-center space-y-1">
          <span className="text-3xl">🛡️</span>
          <h1 className="text-xl font-black text-slate-900">Admin Portal Login</h1>
          <p className="text-xs text-slate-500">เข้าสู่ระบบผู้ดูแลระบบ SrichaiProperty</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 font-bold text-xs rounded-xl">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">อีเมลผู้ดูแลระบบ</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold" 
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1">รหัสผ่าน</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-bold" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl transition cursor-pointer text-xs disabled:opacity-50"
          >
            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Admin'}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
          บัญชีเริ่มต้น: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">admin@srichaiproperty.com</code> / รหัสผ่าน: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">1234</code>
        </div>
      </div>
    </div>
  );
}
