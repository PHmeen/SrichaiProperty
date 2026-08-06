import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/authOptions';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  // ถ้ายังไม่ได้ login หรือ role ไม่ใช่ admin ให้ redirect ไปหน้า login
  if (!session || user?.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-xs antialiased">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
