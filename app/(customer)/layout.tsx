import React from "react";
import Navbar from "@/components/Navbar";
import CookieConsent from "@/components/CookieConsent";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-grow pt-16">
        {children}
      </div>
      <CookieConsent />
    </div>
  );
}
