// ฟังก์ชันดึงข้อมูล session ของผู้ใช้ที่ login อยู่ (ฝั่ง server)
import { getServerSession } from 'next-auth/next';
// ใช้สำหรับสั่งเปลี่ยนหน้า (redirect) จากฝั่ง server
import { redirect } from 'next/navigation';
// ค่า config ของ next-auth (กำหนดวิธี login, provider ต่างๆ)
import { authOptions } from '@/lib/authOptions';
// แถบเมนูด้านข้าง (sidebar) ของหน้า admin
import AdminSidebar from '@/components/layout/AdminSidebar';

// Layout นี้จะครอบทุกหน้าที่อยู่ใน route group /admin
// เป็น Server Component (async function) เพราะต้องเช็ค session ก่อน render
export default async function AdminLayout({
  children, // เนื้อหาของแต่ละหน้าย่อยที่อยู่ภายใต้ /admin
}: {
  children: React.ReactNode;
}) {
  // ดึงข้อมูล session ปัจจุบันจากฝั่ง server (ไม่ต้องใช้ useSession ฝั่ง client)
  const session = await getServerSession(authOptions);
  // ดึงข้อมูล role ของ user ออกมาจาก session (บอก type เอง เพราะ next-auth ไม่รู้จัก field นี้)
  const user = session?.user as { role?: string } | undefined;

  // ถ้ายังไม่ได้ login หรือ role ไม่ใช่ admin ให้ redirect ไปหน้า login
  if (!session || user?.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    // โครงหน้าหลัก: จัดเรียงแนวนอน (sidebar ซ้าย, เนื้อหาขวา) สูงอย่างน้อยเต็มจอ
    <div className="flex min-h-screen bg-slate-50 font-sans text-xs antialiased">
      {/* Sidebar Navigation แสดงตลอดทุกหน้า */}
      <AdminSidebar />

      {/* Main Panel Content Area ยืดเต็มพื้นที่ที่เหลือ, ตัดการ scroll แนวนอน */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* เนื้อหาของหน้านั้นๆ (children) */}
        {children}
      </main>
    </div>
  );
}
