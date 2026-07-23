'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';

interface ProfileSidebarProps {
  userDisplayName: string;
  email: string;
  avatarUrl: string;
  favoritesCount: number;
  appointmentsCount: number;
}

export default function ProfileSidebar({
  userDisplayName,
  email,
  avatarUrl,
  favoritesCount,
  appointmentsCount,
}: ProfileSidebarProps) {
  return (
    <aside className="w-full lg:w-72 flex-shrink-0">
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-6">
        {/* User Profile Summary */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <Image 
              src={avatarUrl} 
              alt="Profile" 
              width={80} 
              height={80} 
              className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 shadow-sm mx-auto" 
            />
          </div>
          <h2 className="font-bold text-slate-900 text-sm">{userDisplayName}</h2>
          <p className="text-slate-400 text-[11px] font-mono">{email}</p>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1 text-xs">
          <Link 
            href="/profile" 
            className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-700 font-semibold rounded-xl border border-blue-100/60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            ข้อมูลส่วนตัว
          </Link>

          <Link 
            href="/favorites" 
            className="flex items-center justify-between px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              บ้านที่บันทึกไว้
            </div>
            {favoritesCount > 0 && (
              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{favoritesCount}</span>
            )}
          </Link>

          <Link 
            href="/appointments" 
            className="flex items-center justify-between px-3 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              การนัดหมายเข้าชม
            </div>
            {appointmentsCount > 0 && (
              <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{appointmentsCount}</span>
            )}
          </Link>

          <button 
            onClick={() => signOut({ callbackUrl: '/login' })} 
            className="w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition text-left font-medium mt-4 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            ออกจากระบบ
          </button>
        </nav>
      </div>
    </aside>
  );
}
