// ไฟล์นี้คือ "Layout" ของกลุ่มเส้นทาง (customer) ใน Next.js App Router
// ชื่อโฟลเดอร์ที่มีวงเล็บ (customer) คือ "Route Group" ใช้จัดกลุ่มหน้าเว็บฝั่งลูกค้า
// โดยไม่ทำให้ (customer) กลายเป็นส่วนหนึ่งของ URL จริง (เช่น /property ไม่ใช่ /customer/property)
// Layout นี้จะถูกนำมาครอบ (wrap) ทุกหน้าที่อยู่ภายใต้กลุ่ม (customer) โดยอัตโนมัติ
// ทำให้ Navbar และ Footer แสดงซ้ำในทุกหน้าโดยไม่ต้องเขียนโค้ดซ้ำ

import Navbar from "@/components/layout/Navbar";
// นำเข้า component แถบเมนูด้านบน (Navbar) ที่ใช้ร่วมกันทุกหน้าในกลุ่มลูกค้า

// CustomerLayout เป็น Server Component โดยดีฟอลต์ (ไม่มี "use client")
// รับ props ชื่อ children ซึ่งก็คือเนื้อหาของหน้า (page.tsx) ที่ถูก render อยู่ภายในนี้
export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode; // children คือ React node ใดๆ ก็ได้ (เนื้อหาของแต่ละหน้า)
}) {
  return (
    // div ครอบนอกสุด: ใช้ flex column และบังคับให้สูงอย่างน้อยเท่าจอ (min-h-screen)
    // เพื่อดัน footer ให้อยู่ล่างสุดของหน้าจอเสมอ แม้เนื้อหาจะสั้น (sticky footer pattern)
    <div className="flex flex-col min-h-screen">
      {/* แถบเมนูด้านบน แสดงอยู่ทุกหน้าในกลุ่ม (customer) */}
      <Navbar />

      {/* ส่วนเนื้อหาหลักของแต่ละหน้า
          - flex-grow: ขยายเต็มพื้นที่ที่เหลือ เพื่อดัน footer ลงล่างสุด
          - pt-16: เว้นระยะขอบบน (padding-top) เพื่อไม่ให้เนื้อหาโดน Navbar (ที่ลอยแบบ fixed) บัง */}
      <main className="flex-grow pt-16">
        {children}
        {/* ตรงนี้คือจุดที่ Next.js จะแทรกเนื้อหาของหน้าปัจจุบัน เช่น หน้าแรก, หน้ารายละเอียดทรัพย์สิน ฯลฯ */}
      </main>

      {/* Footer ท้ายเว็บไซต์ แสดงอยู่ทุกหน้าเช่นกัน
          - พื้นหลังสีเข้ม (slate-900) ตัวอักษรสีเทาอ่อน (slate-400)
          - มีเส้นขอบบน (border-t) คั่นจากเนื้อหาด้านบน */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center">
          {/* ข้อความลิขสิทธิ์ท้ายเว็บ จัดกึ่งกลางและกำหนดความกว้างสูงสุดไม่ให้กว้างเกินไปบนจอใหญ่ */}
          <p className="text-xs">&copy; 2026 Srichai Property Agents. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
