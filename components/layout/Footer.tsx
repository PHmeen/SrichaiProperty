/**
 * ==============================================================================
 * คอมโพเนนต์ Footer ท้ายเว็บไซต์ (Footer Component)
 * /components/layout/Footer.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงโลโก้ คำอธิบายแบรนด์ สรุปวัตถุประสงค์ของโครงงานระบบบริหารจัดการอสังหาริมทรัพย์
 * 2. แสดงลิงก์นำทางด่วน (Quick Links) ไปยังหน้าค้นหาบ้าน, สมัครนายหน้า, เข้าสู่ระบบ
 * 3. แสดงข้อมูลการติดต่อ (ที่อยู่, อีเมล, เบอร์โทรศัพท์)
 * 4. แสดงลิขสิทธิ์ประจำปี (&copy; 2026) และลิงก์นโยบายความเป็นส่วนตัว (PDPA) / ข้อกำหนดการใช้งาน
 * ==============================================================================
 */

"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function Footer() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string | null } | undefined)?.role;

  return (
    // footer ท้ายเว็บ ใช้พื้นหลังสีเข้ม (bg-slate-900) และตัวอักษรสีเทา (text-slate-300)
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* ส่วนที่ 1: ข้อมูลแบรนด์และรายละเอียดโครงงาน (Brand Column) */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Srichai<span className="text-blue-500">Property</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              ระบบบริหารจัดการการซื้อขายอสังหาริมทรัพย์ กรณีศึกษา Srichai Property Agents แพลตฟอร์มที่รวมผู้ซื้อและนายหน้าไว้ในที่เดียว
            </p>
          </div>

          {/* ส่วนที่ 2: เมนูด่วน (Quick Navigation Links) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">เมนูหลัก</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="hover:text-blue-400 transition">
                  ค้นหาบ้าน
                </Link>
              </li>
              {!session && (
                <li>
                  <Link href="/register/agent" className="hover:text-blue-400 transition">
                    สมัครเป็นนายหน้า
                  </Link>
                </li>
              )}
              {!session ? (
                <>
                  <li>
                    <Link href="/login" className="hover:text-blue-400 transition">
                      เข้าสู่ระบบ (ลูกค้า)
                    </Link>
                  </li>
                  <li>
                    <Link href="/login/agent" className="hover:text-blue-400 transition">
                      เข้าสู่ระบบ (นายหน้า)
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    href={role === "agent" ? "/agent" : role === "admin" ? "/admin" : "/profile"}
                    className="hover:text-blue-400 transition"
                  >
                    บัญชีของฉัน
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* ส่วนที่ 3: ช่องทางการติดต่อ (Contact Info) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">ติดต่อเรา</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-start gap-2">
                <svg aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <a
                  href="https://maps.google.com/?q=มหาวิทยาลัยสงขลานครินทร์"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition"
                >
                  มหาวิทยาลัยสงขลานครินทร์
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href="mailto:contact@srichaiproperty.com" className="hover:text-blue-400 transition">
                  contact@srichaiproperty.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" className="w-4 h-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span title="เบอร์ตัวอย่างสำหรับโครงงานสาธิต">074-XXX-XXX (ตัวอย่าง)</span>
              </li>
            </ul>
          </div>

        </div>

        {/* ส่วนที่ 4: แถบข้อความลิขสิทธิ์และนโยบายความเป็นส่วนตัว (Copyright & PDPA Terms) */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Srichai Property Agents. โครงงานระบบบริหารจัดการการซื้อขายอสังหาริมทรัพย์.</p>
          <div className="flex items-center gap-4 font-medium">
            <Link href="/privacy-policy" className="hover:text-blue-400 transition flex items-center gap-1">
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              นโยบายความเป็นส่วนตัว (PDPA)
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-400 transition flex items-center gap-1">
              <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ข้อกำหนดการใช้งาน (Terms)
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
