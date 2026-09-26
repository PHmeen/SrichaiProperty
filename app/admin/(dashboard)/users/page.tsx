'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Badge from '@/components/ui/Badge';
import { NO_SHOW_LIMIT } from '@/lib/constants';
import { toast } from '@/components/ui/toast';
import {
  Users,
  Briefcase,
  User,
  AlertTriangle,
  Search,
  Phone,
  Shield,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Mail,
  Eye
} from 'lucide-react';
import UserProfileModal from '@/components/admin/UserProfileModal';

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
  noShowCount: number; // จำนวนครั้งที่เคยเบี้ยวนัด (no_show) สะสม
}

interface StatsData {
  total: number;
  agents: number;
  buyers: number;
  pending: number;
}

const ITEMS_PER_PAGE = 10;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, agents: 0, buyers: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`/api/admin/users?role=${roleFilter}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setStats(data.stats || { total: 0, agents: 0, buyers: 0, pending: 0 });
      }
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadUsers() {
      try {
        const res = await fetch(`/api/admin/users?role=${roleFilter}`);
        const data = await res.json();
        if (!ignore && data.success) {
          setUsers(data.users || []);
          setStats(data.stats || { total: 0, agents: 0, buyers: 0, pending: 0 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    }
    loadUsers();
    return () => {
      ignore = true;
    };
  }, [roleFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchUsers();
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!confirm(`ยืนยันการ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} บัญชีนี้ในฐานข้อมูล?`)) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - (newStatus === 'approved' ? 1 : 0))
        }));
        toast.success(`อัปเดตสถานะเป็น ${newStatus} เรียบร้อยแล้ว`);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + (data.error || ''));
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    }
  };

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const id = (u.id || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q);
    });
  }, [users, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Export to CSV function
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['User ID', 'ชื่อ-นามสกุล', 'อีเมล', 'เบอร์โทรศัพท์', 'บทบาท', 'สถานะ', 'ประวัติไม่มาตามนัด (ครั้ง)', 'วันที่สมัคร'];
    const rows = filteredUsers.map(u => [
      `"${u.id}"`,
      `"${u.first_name || ''} ${u.last_name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.phone || '-'}"`,
      `"${u.role_id}"`,
      `"${u.status}"`,
      `"${u.noShowCount || 0}"`,
      `"${new Date(u.created_at).toLocaleString('th-TH')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `srichai_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
  };

  return (
    <>
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 relative z-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">จัดการผู้ใช้งาน (Users & Agents)</h2>
          <p className="text-xs text-slate-500 font-medium">
            จัดการบัญชีผู้ซื้อ นายหน้า และสิทธิ์การเข้าใช้งานระบบ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 shadow-sm cursor-pointer"
            title="ส่งออกไฟล์ CSV สำหรับ Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">บัญชีทั้งหมด</p>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{stats.total.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">นายหน้า (Agent)</p>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{stats.agents.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ลูกค้า (Customer)</p>
              <h3 className="text-2xl font-black text-slate-800 mt-0.5">{stats.buyers.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">รอตรวจสอบ</p>
              <h3 className="text-2xl font-black text-amber-700 mt-0.5">
                {stats.pending.toLocaleString()}{' '}
                <span className="text-xs font-bold text-amber-600 ml-1">บัญชี</span>
              </h3>
            </div>
          </div>
        </div>

        {/* TABLE CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร, ID..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setLoading(true);
                }}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              >
                <option value="all">บทบาททั้งหมด (All Roles)</option>
                <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                <option value="agent">นายหน้า (Agent)</option>
                <option value="customer">ลูกค้า (Customer)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left min-w-[760px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">ผู้ใช้งาน</th>
                  <th className="px-6 py-3.5">ช่องทางติดต่อ</th>
                  <th className="px-6 py-3.5">บทบาท</th>
                  <th className="px-6 py-3.5 text-center">สถานะ</th>
                  <th className="px-6 py-3.5 text-center">ไม่มาตามนัด (No-show)</th>
                  <th className="px-6 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 font-bold">
                      <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      กำลังโหลดข้อมูลผู้ใช้...
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500 font-medium">
                      ไม่พบข้อมูลผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profile_image ? (
                            <Image
                              src={user.profile_image}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                              alt="profile"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black border border-blue-200 shrink-0 text-sm">
                              {user.first_name?.[0] || 'U'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-sm truncate">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {user.id.slice(0, 8)} • สมัครเมื่อ {new Date(user.created_at).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-slate-700 font-medium text-xs flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </p>
                          <p className="text-slate-500 text-[11px] flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{user.phone || '-'}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black inline-flex items-center gap-1.5 border ${
                            user.role_id === 'admin'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : user.role_id === 'agent'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {user.role_id === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : user.role_id === 'agent' ? (
                            <Briefcase className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          <span className="capitalize">{user.role_id}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge status={user.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        {user.role_id === 'customer' ? (
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black inline-block ${
                              user.noShowCount >= NO_SHOW_LIMIT
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : user.noShowCount > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'text-slate-400'
                            }`}
                          >
                            {user.noShowCount} ครั้ง{user.noShowCount >= NO_SHOW_LIMIT ? ' (จำกัดสิทธิ์)' : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedProfileUserId(user.id)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="ดูโปรไฟล์และประวัติการใช้งานแบบละเอียด"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>โปรไฟล์</span>
                          </button>
                          {user.status !== 'approved' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
                            </button>
                          )}
                          {user.status !== 'rejected' && user.role_id !== 'admin' && (
                            <button
                              onClick={() => handleStatusChange(user.id, 'rejected')}
                              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ระงับ</span>
                            </button>
                          )}
                          {user.role_id === 'agent' && (
                            <Link
                              href="/admin/kyc"
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition border border-slate-200"
                            >
                              ตรวจ KYC
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Real Dynamic Pagination */}
          <div className="mt-auto border-t border-slate-100 p-4 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              แสดง <strong className="text-slate-800">{filteredUsers.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> ถึง{' '}
              <strong className="text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)}</strong> จากทั้งหมด{' '}
              <strong className="text-slate-800">{filteredUsers.length}</strong> รายการ
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 font-semibold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ก่อนหน้า</span>
              </button>
              <div className="px-3 py-1 font-bold text-slate-700 text-xs">
                หน้า {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition flex items-center gap-1 font-semibold"
              >
                <span>ถัดไป</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <UserProfileModal
        key={selectedProfileUserId || 'none'}
        userId={selectedProfileUserId}
        isOpen={Boolean(selectedProfileUserId)}
        onClose={() => setSelectedProfileUserId(null)}
      />
    </>
  );
}
