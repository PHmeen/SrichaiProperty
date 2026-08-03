'use client';
import Link from 'next/link';

export default function AgentPrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">🔒 นโยบายความเป็นส่วนตัวนายหน้า (Agent PDPA)</h1>
          <p className="text-xs text-slate-500 mt-0.5">ข้อกำหนดการคุ้มครองข้อมูลส่วนบุคคลสำหรับนายหน้าและผู้ฝากขาย</p>
        </div>
        <Link href="/agent/profile" className="px-3.5 py-1.5 bg-slate-100 font-bold text-xs rounded-xl text-slate-700 hover:bg-slate-200 transition">
          ← โปรไฟล์นายหน้า
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-5 text-xs text-slate-700 leading-relaxed">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 font-medium">
          🏠 <strong>ขอบเขต:</strong> ศรีชัย พร็อพเพอร์ตี้ คุ้มครองข้อมูลเอกสาร KYC, เบอร์โทรศัพท์, LINE ID และประวัติการชำระเงิน PRO ฿599 ของนายหน้าทุกท่าน
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-slate-900 border-b pb-1 text-sm">1. ข้อมูลส่วนบุคคลที่จัดเก็บ</h3>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>เอกสาร KYC:</strong> ภาพถ่ายบัตรประชาชน/ใบอนุญาต เพื่ออนุมัติสิทธิ์นายหน้า</li>
            <li><strong>ข้อมูลติดต่อสาธารณะ:</strong> เบอร์โทรศัพท์ และ LINE ID สำหรับสร้างปุ่มคุย LINE และปุ่มโทรในหน้าประกาศบ้าน</li>
            <li><strong>ประวัติการเงิน:</strong> สลิปโอนเงิน PromptPay ในระบบสำหรับการอนุมัติสิทธิ์ Verified PRO</li>
          </ul>

          <h3 className="font-black text-slate-900 border-b pb-1 text-sm">2. สิทธิการจัดการข้อมูลและลบบัญชี</h3>
          <p className="text-slate-600">
            นายหน้าสามารถแก้ไขข้อมูลส่วนตัว หรือกดลบบัญชีผู้ใช้ถาวร (Delete Account) ได้เองผ่านหน้าโปรไฟล์ (<Link href="/agent/profile" className="text-amber-600 font-bold">/agent/profile</Link>)
          </p>
        </div>

        <div className="pt-4 border-t flex justify-between items-center text-[11px] text-slate-400">
          <span>Connected to PostgreSQL DB system_configs</span>
          <Link href="/agent/terms" className="text-amber-600 font-bold hover:underline">ข้อกำหนดนายหน้า (Agent Terms) →</Link>
        </div>
      </div>
    </div>
  );
}
