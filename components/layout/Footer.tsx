/**
 * ==============================================================================
 * คอมโพเนนต์ Footer ท้ายเว็บไซต์ (Footer Component)
 * /components/layout/Footer.tsx
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. แสดงโลโก้ คำอธิบายแบรนด์ สรุปวัตถุประสงค์ของโครงงานระบบบริหารจัดการอสังหาริมทรัพย์
 * 2. แสดงลิงก์นำทางด่วน (Quick Links) ไปยังหน้าค้นหาบ้าน, สมัครนายหน้า, เข้าสู่ระบบ
 * 3. แสดงข้อมูลการติดต่อ (ที่อยู่, อีเมล, เบอร์โทรศัพท์)
 * 4. แสดงลิขสิทธิ์ประจำปี (&copy; 2026) และลิงก์นโยบายความเป็นส่วนตัว (PDPA) / ข้อกำหนดการใช้งาน
 * ==============================================================================
 */

import Link from "next/link";

export default function Footer() {
  return (
    // footer ท้ายเว็บ ใช้พื้นหลังสีเข้ม (bg-slate-900) และตัวอักษรสีเทา (text-slate-300)
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* ส่วนที่ 1: ข้อมูลแบรนด์และรายละเอียดโครงงาน (Brand Column) */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                S
              </div>
              <span className="text-2xl font-extrabold text-white tracking-tight">
                Srichai<span className="text-blue-500">Property</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400 max-w-md">
              ระบบบริหารจัดการการซื้อขายอสังหาริมทรัพย์ กรณีศึกษา Srichai Property Agents แพลตฟอร์มที่รวมผู้ซื้อและนายหน้าไว้ในที่เดียว
            </p>
          </div>

          {/* ส่วนที่ 2: เมนูด่วน (Quick Navigation Links) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">เมนูหลัก</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="hover:text-blue-400 transition">
                  ค้นหาบ้าน
                </Link>
              </li>
              <li>
                <Link href="/register/agent" className="hover:text-blue-400 transition">
                  สมัครเป็นนายหน้า
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-blue-400 transition">
                  เข้าสู่ระบบ
                </Link>
              </li>
            </ul>
          </div>

          {/* ส่วนที่ 3: ช่องทางการติดต่อ (Contact Info) */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">ติดต่อเรา</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>📍 มหาวิทยาลัยสงขลานครินทร์</li>
              <li>📧 contact@srichaiproperty.com</li>
              <li>📞 074-XXX-XXX</li>
            </ul>
          </div>

        </div>

        {/* ส่วนที่ 4: แถบข้อความลิขสิทธิ์และนโยบายความเป็นส่วนตัว (Copyright & PDPA Terms) */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Srichai Property Agents. โครงงานระบบบริหารจัดการการซื้อขายอสังหาริมทรัพย์.</p>
          <div className="flex items-center gap-4 font-medium">
            <Link href="/privacy-policy" className="hover:text-blue-400 transition flex items-center gap-1">
              🔒 นโยบายความเป็นส่วนตัว (PDPA)
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-blue-400 transition flex items-center gap-1">
              📜 ข้อกำหนดการใช้งาน (Terms)
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
