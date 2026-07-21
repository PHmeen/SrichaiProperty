'use client';

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/home" || path === "/") {
      return pathname === "/home" || pathname === "/";
    }
    return pathname === path;
  };

  const getInitialsAvatar = (name: string) => {
    const initials = name.trim().split(/\s+/).map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#1d4ed8"/><text x="50" y="55" font-family="sans-serif" font-weight="bold" font-size="35" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  };

  const userFullName = session?.user?.name || "ผู้ใช้งาน";
  const userRole = (session?.user as { role?: string })?.role;
  const rawImage = session?.user?.image;
  const hasValidImage = rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && rawImage !== 'null' && rawImage !== 'undefined' && (rawImage.startsWith('http') || rawImage.startsWith('/'));
  const avatarUrl = hasValidImage ? rawImage : getInitialsAvatar(userFullName);

  return (
    <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5 cursor-pointer group">
            <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-700/20 group-hover:scale-105 transition-transform">
              S
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          {/* Desktop Main Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/search") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            <Link
              href="/agents"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/agents") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              นายหน้าของเรา
            </Link>
            <Link
              href="/appointments"
              className={`px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all ${
                isActive("/appointments") ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:text-blue-600 hover:bg-slate-50"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>
          </div>

          {/* Desktop Right User Controls */}
          <div className="hidden lg:flex items-center space-x-3">
            {session ? (
              <div className="flex items-center gap-2.5">
                {userRole === 'admin' && (
                  <Link
                    href="/admin/dashboard"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-2 rounded-xl text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    <span>⚡</span> แดชบอร์ดแอดมิน
                  </Link>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1" />

                <Link href="/profile" className="flex items-center gap-2 py-1 px-2 hover:bg-slate-50 rounded-xl transition cursor-pointer">
                  <Image 
                    src={avatarUrl} 
                    alt="Profile" 
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm" 
                    unoptimized
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">{userFullName}</span>
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider mt-0.5">
                      {userRole === 'admin' ? 'ผู้ดูแลระบบ' : userRole === 'agent' ? 'นายหน้า' : 'สมาชิก'}
                    </span>
                  </div>
                </Link>

                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  title="ออกจากระบบ"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="text-slate-700 hover:text-blue-700 text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-50 transition"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-md shadow-blue-700/10 active:scale-95 whitespace-nowrap"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <div className="flex items-center lg:hidden">
            {session && userRole === 'admin' && (
              <Link
                href="/admin/dashboard"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[10px] shadow-sm mr-2 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                ⚡ แอดมิน
              </Link>
            )}
            
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl focus:outline-none transition cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200/80 absolute w-full shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 pt-3 pb-6 space-y-2">
            
            {session && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Image 
                    src={avatarUrl} 
                    alt="Profile" 
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200" 
                    unoptimized
                  />
                  <div>
                    <div className="font-extrabold text-xs text-slate-900">{userFullName}</div>
                    <div className="text-[10px] text-blue-600 font-extrabold uppercase">
                      {userRole === 'admin' ? 'ผู้ดูแลระบบ (Admin)' : userRole === 'agent' ? 'นายหน้าการขาย' : 'สมาชิกทั่วไป'}
                    </div>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] bg-white border border-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
                >
                  โปรไฟล์
                </Link>
              </div>
            )}

            {userRole === 'admin' && (
              <Link
                href="/admin/dashboard"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 text-amber-950 bg-amber-400 font-black rounded-xl text-xs shadow-sm flex items-center gap-2 mb-2"
              >
                ⚡ หน้าควบคุมแอดมิน (Admin Dashboard)
              </Link>
            )}

            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              🏠 หน้าแรก
            </Link>

            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/search") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              🔍 ค้นหาอสังหาริมทรัพย์
            </Link>

            <Link
              href="/agents"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/agents") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              👔 นายหน้าของเรา
            </Link>

            <Link
              href="/appointments"
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 rounded-xl text-xs font-extrabold transition ${
                isActive("/appointments") ? "text-blue-700 bg-blue-50" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              📅 ประวัติการนัดหมาย
            </Link>

            <div className="border-t border-slate-100 my-2 pt-2"></div>

            {session ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="block w-full text-left px-4 py-3 text-red-600 bg-red-50/50 hover:bg-red-50 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                🚪 ออกจากระบบ
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-slate-700 font-bold text-center border border-slate-200 rounded-xl text-xs"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 bg-blue-700 text-white font-extrabold text-center rounded-xl text-xs shadow-md"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}


