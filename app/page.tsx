'use client';

import { useApp } from '@/context/AppContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/customer/HeroSection';
import PopularLocations from '@/components/customer/PopularLocations';
import PremiumListings from '@/components/customer/PremiumListings';
import RecentListings from '@/components/customer/RecentListings';

export default function Home() {
  const { properties, favorites, toggleFavorite } = useApp();
  const exclusiveProperties = properties.filter(p => p.isPremium);

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm">
      <Navbar />
      <HeroSection />
      <PopularLocations />
      <PremiumListings properties={exclusiveProperties} />
      <RecentListings 
        properties={properties} 
        favorites={favorites} 
        toggleFavorite={toggleFavorite} 
      />
      <Footer />
    </div>
  );
}
