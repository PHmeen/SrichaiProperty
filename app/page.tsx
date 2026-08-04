'use client';

import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/customer/HeroSection';
import PopularLocations from '@/components/customer/PopularLocations';
import PropertyCard from '@/components/customer/PropertyCard';

export default function Home() {
  const { properties, favorites, toggleFavorite } = useApp();

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      <Navbar />
      <HeroSection />
      <PopularLocations />

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

      <Footer />
    </div>
  );
}
