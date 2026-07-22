'use client';

import { useApp } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/home/HeroSection';
import PopularLocations from '@/components/home/PopularLocations';
import PremiumListings from '@/components/home/PremiumListings';
import RecentListings from '@/components/home/RecentListings';

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
