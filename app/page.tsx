'use client';

/**
 * ==============================================================================
 * หน้าแรกสาธารณะของเว็บไซต์ (Public Landing Page) - /app/page.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. เป็น Root Route (`http://localhost:3000/`) สำหรับต้อนรับผู้เยี่ยมชมทั่วไปทุกคนที่เปิดเข้ามา
 * 2. แสดงส่วนสไลด์แบนเนอร์ค้นหา (`HeroSection`) และส่วนทำเลยอดนิยม (`PopularLocations`)
 * 3. ดึงรายการอสังหาริมทรัพย์และรายการโปรดจาก `AppContext` มาแสดงผลผ่าน `PropertyCard`
 * 4. ครอบด้วย `<Navbar />` บนสุด และ `<Footer />` ล่างสุดโดยตรง
 * ==============================================================================
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/customer/HeroSection';
import PopularLocations from '@/components/customer/PopularLocations';
import PropertyCard from '@/components/customer/PropertyCard';

export default function Home() {
  // ดึงรายการอสังหาฯ และรายการโปรดจาก AppContext ที่เชื่อมต่อฐานข้อมูลเรียบร้อยแล้ว
  const { properties, favorites, toggleFavorite } = useApp();

  // ลูกค้าที่ล็อกอินแล้วให้ไปหน้า /home (พอร์ตัลส่วนตัว) แทนหน้าแรกสาธารณะนี้
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (status === 'authenticated' && role !== 'admin' && role !== 'agent') {
      router.replace('/home');
    }
  }, [status, role, router]);

  if (status === 'authenticated' && role !== 'admin' && role !== 'agent') {
    return null;
  }

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      {/* 1. แถบเมนูนำทางหลักบนสุด */}
      <Navbar />

      {/* 2. ส่วน Hero Banner ค้นหาบ้าน */}
      <HeroSection />

      {/* 3. ส่วนแสดงทำเลยอดนิยม */}
      <PopularLocations />

      {/* 4. ส่วนแสดงรายการอสังหาริมทรัพย์แนะนำล่าสุด */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-3">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-1">ประกาศแนะนำล่าสุด</h2>
              <p className="text-slate-500 text-xs font-medium">อสังหาริมทรัพย์คุณภาพคัดสรรโดยนายหน้ามืออาชีพ</p>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center text-slate-700 font-bold hover:text-blue-700 transition bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-xs group"
            >
              ดูทั้งหมด <span className="ml-1 group-hover:translate-x-0.5 transition-transform">&rarr;</span>
            </Link>
          </div>

          {/* รายการการ์ดอสังหาริมทรัพย์ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((prop) => {
              const isFav = favorites.includes(prop.id);
              return (
                <PropertyCard
                  key={prop.id}
                  prop={prop}
                  isFav={isFav}
                  toggleFavorite={toggleFavorite}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. ท้ายเว็บไซต์ */}
      <Footer />
    </div>
  );
}
