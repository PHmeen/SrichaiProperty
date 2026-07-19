'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image: string | null;
  role_id: string;
  status: string;
  created_at: string;
}

interface StatsData {
  total: number;
  agents: number;
  buyers: number;
  pending: number;
}

export default function AdminUsersPage() {
  const pathname = usePathname();
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, agents: 0, buyers: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users?role=${roleFilter}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
          setStats(data.stats);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [roleFilter]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-xs antialiased">
      {/* 🔮 NAVIGATION SIDEBAR */}
      <aside className="w-56 bg-[#0f172a] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl relative z-10">
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/20">S</div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-tight flex items-center gap-1.5">SrichaiAdmin</h1>
              <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-1 uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>System Online</span>
            </div>
          </div>
          <Link href="/home" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30">🌐 เปิดดูหน้าเว็บไซต์จริง ↗</Link>

          <nav className="space-y-6 pt-3">
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Overview</span>
              <Link href="/admin/dashboard" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-bold transition-all text-left">📊 แดชบอร์ดหลัก</Link>
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Moderation (ตรวจสอบ)</span>
              <Link href="/admin/moderation" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold transition-all text-left">📝 ประกาศอสังหาฯ</Link>
              <Link href="/admin/kyc" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold transition-all text-left">🛡️ เอกสารยืนยันตัวตน (KYC)</Link>
              <Link href="/admin/reports" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold transition-all text-left">⚠️ รายงานปัญหา (Reports)</Link>
            </div>
            <div className="space-y-1.5">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5">Management</span>
              <Link href="/admin/users" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-800 text-white font-bold transition-all text-left shadow-inner">👥 ฐานข้อมูลผู้ใช้</Link>
            </div>
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-black flex items-center justify-center shadow-inner">A</div>
            <div>
              <p className="text-white font-black text-xs">Admin Root</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Super Administrator</p>
            </div>
          </div>
          <button className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">🚪</button>
        </div>
      </aside>

      {/* 💼 WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
          <h2 className="text-lg font-extrabold text-slate-800">จัดการผู้ใช้งาน (Users & Agents)</h2>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
            <span>IP: 192.168.1.1 (Secure)</span>
            <span className="text-slate-400">🔔</span>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto">
          {/* STATS */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl">👥</div>
              <div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">บัญชีทั้งหมด</p><h3 className="text-2xl font-black text-slate-800 mt-1">{stats.total.toLocaleString()}</h3></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">💼</div>
              <div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">บัญชีนายหน้า (AGENT)</p><h3 className="text-2xl font-black text-slate-800 mt-1">{stats.agents.toLocaleString()}</h3></div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">👤</div>
              <div><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">บัญชีลูกค้า/ผู้ซื้อ (BUYER)</p><h3 className="text-2xl font-black text-slate-800 mt-1">{stats.buyers.toLocaleString()}</h3></div>
            </div>
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-5 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl">⚠️</div>
              <div><p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">รอตรวจสอบ (PENDING)</p><h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pending.toLocaleString()} <span className="text-xs font-bold text-amber-500 ml-1">คิว</span></h3></div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="relative w-80">
                <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
                <input type="text" placeholder="ค้นหาชื่อ, รหัส User ID, อีเมล..." className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium text-slate-700" />
              </div>
              <div className="flex items-center gap-3">
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-600 text-xs font-bold py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">บทบาททั้งหมด (All Roles)</option>
                  <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  <option value="agent">นายหน้า (Agent)</option>
                  <option value="customer">ลูกค้า (Buyer)</option>
                </select>
                <button className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 transition">
                  <span>+</span> เพิ่มผู้ใช้
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">ข้อมูลผู้ใช้งาน (USER INFO)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">ข้อมูลติดต่อ (CONTACT)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">บทบาท (ROLE)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-center">สถานะ (STATUS)</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">จัดการ (ACTIONS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-bold">กำลังโหลดข้อมูล...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-500 font-bold">ไม่พบผู้ใช้งาน</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {user.profile_image ? (
                              <img src={user.profile_image} className="w-10 h-10 rounded-full object-cover border border-slate-200" alt="profile" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black border border-blue-200">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{user.first_name} {user.last_name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">ID: {user.id.slice(0, 8)} • User: {user.role_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-slate-600 font-semibold text-xs">{user.email}</p>
                          <p className="text-slate-400 font-medium text-[10px]">📞 {user.phone || '-'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black inline-flex items-center gap-1.5 border ${
                            user.role_id === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                            user.role_id === 'agent' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            <span>{user.role_id === 'admin' ? '🛡️' : user.role_id === 'agent' ? '💼' : '👤'}</span>
                            {user.role_id === 'admin' ? 'Admin (R1)' : user.role_id === 'agent' ? 'Agent (R2)' : 'Buyer (R3)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 border ${
                            user.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            user.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'approved' ? 'bg-emerald-500' : user.status === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
                            {user.status === 'approved' ? 'Approved' : user.status === 'pending' ? 'Pending KYC' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {user.status === 'pending' && user.role_id === 'agent' ? (
                            <Link href="/admin/kyc" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black transition-colors">
                              ตรวจสอบเอกสาร
                            </Link>
                          ) : (
                            <span className="text-slate-300 text-[10px] font-bold italic">Restricted</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Placeholder */}
            <div className="mt-auto border-t border-slate-100 p-4 bg-slate-50/50 flex items-center justify-between text-slate-500 font-medium">
              <span>แสดงข้อมูล <strong className="text-slate-800">1</strong> ถึง <strong className="text-slate-800">{users.length}</strong> จาก <strong className="text-slate-800">{stats.total}</strong> รายการ</span>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-md hover:bg-white bg-slate-100 text-slate-400">&lt;</button>
                <button className="w-8 h-8 flex items-center justify-center border border-blue-500 rounded-md bg-blue-50 text-blue-600 font-bold">1</button>
                <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-md hover:bg-white bg-white font-bold">2</button>
                <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-md hover:bg-white bg-white">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
