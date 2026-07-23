'use client';

import AdminSidebar from '@/components/layout/AdminSidebar';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ถ้าเป็นหน้าล็อกอินแอดมิน ไม่ต้องแสดง Sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-xs antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
