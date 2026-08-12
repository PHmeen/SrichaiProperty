// ฟังก์ชันดึงข้อมูล session ของผู้ใช้ที่ login อยู่ (ฝั่ง server)
import { getServerSession } from 'next-auth/next';
// ใช้สำหรับสั่งเปลี่ยนหน้า (redirect) จากฝั่ง server
import { redirect } from 'next/navigation';
// ค่า config ของ next-auth (กำหนดวิธี login, provider ต่างๆ)
import { authOptions } from '@/lib/authOptions';
// แถบเมนูด้านบนของหน้า agent
import AgentNavbar from '@/components/layout/AgentNavbar';
// ส่วนท้ายหน้า (footer) ของหน้า agent
import AgentFooter from '@/components/layout/AgentFooter';
// หน้าจอที่แสดงเมื่อ agent ยังไม่ได้รับการอนุมัติ (สถานะ pending)
import PendingAgentGate from '@/components/agent/PendingAgentGate';

// Layout นี้จะครอบทุกหน้าที่อยู่ใน route group /agent
// เป็น Server Component (async function) เพราะต้องเช็ค session ก่อน render
export default async function AgentLayout({
  children, // เนื้อหาของแต่ละหน้าย่อยที่อยู่ภายใต้ /agent
}: {
  children: React.ReactNode;
}) {
  // ดึงข้อมูล session ปัจจุบันจากฝั่ง server (ไม่ต้องใช้ useSession ฝั่ง client)
  const session = await getServerSession(authOptions);
  // ดึงข้อมูล role และ status ของ user ออกมาจาก session (บอก type เอง เพราะ next-auth ไม่รู้จัก field พวกนี้)
  const user = session?.user as { role?: string; status?: string | null } | undefined;

  // ถ้ายังไม่ login หรือ role ไม่ใช่ 'agent' -> เตะกลับไปหน้า login สำหรับ agent ทันที
  if (!session || user?.role !== 'agent') {
    redirect('/login/agent');
  }

  // เช็คสถานะของ agent ว่ายัง 'pending' (รออนุมัติ) อยู่หรือไม่
  // ถ้าไม่มีค่า status มาเลย ให้ถือว่าเป็น 'pending' ไว้ก่อน (ปลอดภัยไว้ก่อน)
  const isPending = (user?.status || 'pending') === 'pending';

  return (
    // โครงหน้าหลัก: สูงอย่างน้อยเต็มจอ, จัดเรียงแนวตั้ง (navbar บน, เนื้อหากลาง, footer ล่างสุดของหน้า)
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">

      {/* แถบเมนูด้านบน แสดงตลอดทุกหน้า */}
      <AgentNavbar />

      {/* ส่วนเนื้อหาหลัก ยืดเต็มพื้นที่ที่เหลือ */}
      <main className="flex-1">
        {/* ถ้า agent ยังรออนุมัติ -> โชว์หน้า PendingAgentGate แทนเนื้อหาจริง
            ถ้าอนุมัติแล้ว -> โชว์เนื้อหาของหน้านั้นๆ ตามปกติ (children) */}
        {isPending ? <PendingAgentGate /> : children}
      </main>

      {/* ส่วนท้ายหน้า อยู่ท้ายสุดของเนื้อหาเสมอ */}
      <AgentFooter />

    </div>
  );
}
