'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  User,
  Shield,
  Briefcase,
  Phone,
  Mail,
  Calendar,
  Laptop,
  Building2,
  Star,
  ExternalLink,
  MessageSquare,
  Activity
} from 'lucide-react';
import Badge from '@/components/ui/Badge';

interface UserDetailedProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  lineId?: string | null;
  profileImage?: string | null;
  roleId: string;
  roleName: string;
  status: string;
  planType?: string | null;
  isVerified?: boolean | null;
  createdAt: string;
  kycDoc?: string | null;
  experience?: string | null;
  specialtyZone?: string | null;
  specialtyType?: string | null;
  stats: {
    totalListings: number;
    approvedListings: number;
    soldListings: number;
    totalAgentAppointments: number;
    completedAgentAppointments: number;
    customerNoShowCount: number;
    avgRating: string | null;
    reviewCount: number;
  };
  loginHistories: {
    id: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
  }[];
  recentProperties: {
    id: string;
    title: string;
    price: string;
    status: string;
    type: string;
    province: string;
    createdAt: string;
  }[];
  recentAppointments: {
    id: string;
    status: string;
    date: string;
    timeSlot: string;
    propertyTitle: string;
  }[];
  recentReports: {
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }[];
}

interface Props {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ userId, isOpen, onClose }: Props) {
  const [user, setUser] = useState<UserDetailedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'logins' | 'properties' | 'appointments'>('overview');

  useEffect(() => {
    let ignore = false;
    if (!isOpen || !userId) return;

    fetch(`/api/admin/users?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch((err) => console.error('Error fetching user profile modal:', err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-extrabold">โปรไฟล์และประวัติผู้ใช้งานแบบละเอียด</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading || !user ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="font-bold text-xs">กำลังโหลดข้อมูลประวัติผู้ใช้งาน...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Top Identity Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.firstName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                    {user.firstName[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {user.firstName} {user.lastName}
                    </h3>
                    <Badge status={user.status} />
                    {user.planType === 'pro' && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Verified PRO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    UUID: {user.id}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สมาชิกตั้งแต่: {new Date(user.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1 text-xs">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1.5">
                  {user.roleId === 'admin' ? (
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                  ) : user.roleId === 'agent' ? (
                    <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  )}
                  <span>{user.roleName}</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {user.isVerified ? 'ยืนยันตัวตนแล้ว' : 'ยังไม่ยืนยันตัวตน'}
                </span>
              </div>
            </div>

            {/* Contact Details Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate font-medium">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{user.phone || 'ไม่ระบุเบอร์โทร'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MessageSquare className="w-4 h-4 text-green-500 shrink-0" />
                <span className="font-medium">{user.lineId ? `LINE: ${user.lineId}` : 'ไม่ระบุ LINE ID'}</span>
              </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {user.roleId === 'agent' ? (
                <>
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-600 uppercase">ประกาศทั้งหมด</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.stats.totalListings} หลัง</p>
                    <p className="text-[10px] text-slate-500">อนุมัติ {user.stats.approvedListings} หลัง</p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase">ปิดการขายแล้ว</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.stats.soldListings} หลัง</p>
                    <p className="text-[10px] text-slate-500">สำเร็จตามเป้า</p>
                  </div>
                  <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                    <p className="text-[10px] font-bold text-purple-600 uppercase">งานนำชมนัดหมาย</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.stats.totalAgentAppointments} ครั้ง</p>
                    <p className="text-[10px] text-slate-500">สำเร็จ {user.stats.completedAgentAppointments} ครั้ง</p>
                  </div>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-600 uppercase">คะแนนรีวิวเฉลี่ย</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-xl font-black text-slate-900">{user.stats.avgRating || '-'}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">{user.stats.reviewCount} รีวิวจากลูกค้า</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">นัดหมายเข้าชม</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.recentAppointments.length} ครั้ง</p>
                  </div>
                  <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-600 uppercase">ไม่มาตามนัด (No-show)</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.stats.customerNoShowCount} ครั้ง</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">ประวัติการล็อกอิน</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">{user.loginHistories.length} ครั้งล่าสุด</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">สถานะบัญชี</p>
                    <p className="text-base font-black text-slate-900 mt-0.5 capitalize">{user.status}</p>
                  </div>
                </>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>ประวัติการล็อกอิน (Audit Log)</span>
              </button>

              {user.roleId === 'agent' && (
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'properties'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>ประกาศที่ดูแล ({user.recentProperties.length})</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('appointments')}
                className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'appointments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>การนัดหมาย ({user.recentAppointments.length})</span>
              </button>
            </div>

            {/* Tab 1: Login History Audit */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                  <span>ประวัติการเข้าใช้งานล่าสุด (5 รายการล่าสุดจากฐานข้อมูลจริง)</span>
                </h4>

                {user.loginHistories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                    ยังไม่มีบันทึกประวัติการเข้าใช้งานในระบบ
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {user.loginHistories.map((log) => (
                      <div key={log.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/70">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <Laptop className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              IP: <span className="font-mono text-slate-900">{log.ipAddress}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-sm">
                              {log.userAgent}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-semibold text-slate-500">
                          {new Date(log.createdAt).toLocaleString('th-TH')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Property Listings */}
            {activeTab === 'properties' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  รายการประกาศล่าสุดที่ดูแลโดยนายหน้าคนนี้
                </h4>

                {user.recentProperties.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                    นายหน้ายังไม่มีรายการประกาศในระบบ
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {user.recentProperties.map((p) => (
                      <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div className="min-w-0 pr-3">
                          <p className="font-bold text-slate-800 truncate">{p.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {p.type} • {p.province} • ฿ {Number(p.price).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge status={p.status} />
                          <a
                            href={`/property/${p.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="เปิดดูประกาศ"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Appointments */}
            {activeTab === 'appointments' && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                  ประวัติการนัดหมายเข้าชมบ้านล่าสุด
                </h4>

                {user.recentAppointments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">
                    ไม่มีประวัติการนัดหมาย
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    {user.recentAppointments.map((a) => (
                      <div key={a.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{a.propertyTitle}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>วันที่: {new Date(a.date).toLocaleDateString('th-TH')}</span>
                            <span>• รอบ: {a.timeSlot || 'ไม่ระบุรอบ'}</span>
                          </p>
                        </div>
                        <Badge status={a.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
