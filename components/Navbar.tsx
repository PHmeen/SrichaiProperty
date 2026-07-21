'use client';

import { useState } from "react";
import Link from "next/link";
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
  const rawImage = session?.user?.image;
  const hasValidImage = rawImage && typeof rawImage === 'string' && rawImage.trim() !== '' && rawImage !== 'null' && rawImage !== 'undefined' && (rawImage.startsWith('http') || rawImage.startsWith('/'));
  const avatarUrl = hasValidImage ? rawImage : getInitialsAvatar(userFullName);

  return (
    <nav className="fixed w-full z-50 top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/home" className="flex-shrink-0 flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              S
            </div>
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Srichai<span className="text-blue-600">Property</span>
            </span>
          </Link>

          <div className="hidden md:flex space-x-2 items-center">
            <Link
              href="/home"
              className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive("/") ? "text-blue-700 font-bold" : "text-slate-600 hover:text-blue-600"
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive("/search") ? "text-blue-700 font-bold" : "text-slate-600 hover:text-blue-600"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            <Link
              href="/agents"
              className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive("/agents") ? "text-blue-700 font-bold" : "text-slate-600 hover:text-blue-600"
              }`}
            >
              นายหน้าของเรา
            </Link>
            <Link
              href="/appointments"
              className={`px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive("/appointments") ? "text-blue-700 font-bold" : "text-slate-600 hover:text-blue-600"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-4">
              {session ? (
                <div className="flex items-center gap-3">
                  <Link href="/profile" className="flex items-center space-x-2 py-1 hover:opacity-85 transition cursor-pointer">
                    <img src={avatarUrl} alt="Profile" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = getInitialsAvatar(userFullName); }} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex flex-col text-left">
                      <span className="text-xs font-bold text-slate-800 leading-none">{userFullName}</span>
                      <span className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">โปรไฟล์</span>
                    </div>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="text-slate-500 hover:text-red-600 text-xs font-semibold transition cursor-pointer"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-slate-600 text-sm font-medium hover:text-blue-700 transition flex items-center gap-2"
                  >
                    เข้าสู่ระบบ
                  </Link>
                  <Link
                    href="/register"
                    className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                  >
                    สมัครสมาชิก
                  </Link>
                </>
              )}
            </div>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-slate-600 hover:text-blue-600 focus:outline-none"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link
              href="/home"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              หน้าแรก
            </Link>
            <Link
              href="/search"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/search") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              ค้นหาอสังหาฯ
            </Link>
            <Link
              href="/agents"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/agents") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              นายหน้าของเรา
            </Link>
            <Link
              href="/appointments"
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-3 rounded-xl ${
                isActive("/appointments") ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium hover:bg-slate-50"
              }`}
            >
              ประวัติการนัดหมาย
            </Link>
            <div className="border-t border-slate-100 my-2 pt-2"></div>
            {session ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 text-slate-700 font-medium hover:bg-slate-50 rounded-xl"
                >
                  👤 ตั้งค่าโปรไฟล์
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: '/login' });
                  }}
                  className="block w-full text-left px-3 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl cursor-pointer"
                >
                  🚪 ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 text-slate-600 font-medium text-center border border-slate-200 rounded-xl mb-2"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-3 bg-blue-700 text-white font-bold text-center rounded-xl shadow-md"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

