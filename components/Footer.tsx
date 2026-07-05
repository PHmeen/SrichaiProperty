import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Column */}
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

          {/* Quick Menu */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">เมนูหลัก</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="hover:text-blue-400 transition">
                  ค้นหาบ้าน
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-blue-400 transition">
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

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold mb-4 uppercase text-sm">ติดต่อเรา</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>📍 มหาวิทยาลัยสงขลานครินทร์</li>
              <li>📧 contact@srichaiproperty.com</li>
              <li>📞 074-XXX-XXX</li>
            </ul>
          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Srichai Property Agents. โครงงานระบบบริหารจัดการการซื้อขายอสังหาริมทรัพย์.</p>
        </div>
      </div>
    </footer>
  );
}
