'use client';

interface CookieBannerProps {
  show: boolean;
  onAccept: () => void;
  onOpenPrivacy: () => void;
}

export default function CookieBanner({ show, onAccept, onOpenPrivacy }: CookieBannerProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-[100] transition-transform duration-500 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-slate-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="text-sm text-slate-300 flex-1">
          <p className="font-bold text-white mb-1 flex items-center gap-2">
            <span>🍪</span> การตั้งค่าคุกกี้และนโยบายความเป็นส่วนตัว
          </p>
          <p className="leading-relaxed">
            เว็บไซต์ Srichai Property Agents ใช้คุกกี้เพื่อเพิ่มประสิทธิภาพและประสบการณ์ที่ดีในการค้นหาอสังหาริมทรัพย์ของคุณ รวมถึงเก็บรวบรวมข้อมูลส่วนบุคคลตาม{" "}
            <button onClick={onOpenPrivacy} className="text-blue-400 font-bold hover:text-blue-300 underline bg-transparent border-none cursor-pointer">
              นโยบายความเป็นส่วนตัว (Privacy Policy)
            </button>{" "}
            ของเรา
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto mt-2 md:mt-0">
          <button onClick={onAccept} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-md whitespace-nowrap cursor-pointer">
            ยอมรับทั้งหมด
          </button>
          <button onClick={onAccept} className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap cursor-pointer">
            ตั้งค่าคุกกี้
          </button>
        </div>
      </div>
    </div>
  );
}
