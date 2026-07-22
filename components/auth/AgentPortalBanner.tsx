import Link from 'next/link';

export default function AgentPortalBanner() {
  return (
    <div className="mt-8 p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
      <span className="text-sm font-bold text-emerald-800 mb-1 flex items-center gap-1.5">
        💼 สำหรับนายหน้า (Agent Portal)
      </span>
      <p className="text-[11px] text-slate-500 mb-3">
        คุณต้องการลงประกาศอสังหาริมทรัพย์และจัดการผู้สนใจซื้อใช่หรือไม่?
      </p>
      <div className="flex gap-2 w-full">
        <Link 
          href="/login/agent" 
          className="flex-1 text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm cursor-pointer"
        >
          เข้าสู่ระบบนายหน้า
        </Link>
        <Link 
          href="/register/agent" 
          className="flex-1 text-center bg-white hover:bg-slate-50 text-emerald-700 font-bold py-2 rounded-xl text-xs border border-emerald-200 transition cursor-pointer"
        >
          สมัครเป็นนายหน้า
        </Link>
      </div>
    </div>
  );
}
