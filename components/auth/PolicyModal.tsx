'use client';

interface PolicyModalProps {
  policyType: 'privacy' | 'terms' | null;
  onClose: () => void;
}

const policies = {
  privacy: {
    title: "📄 นโยบายความเป็นส่วนตัว",
    content: "การจัดเก็บข้อมูล: เราจะจัดเก็บข้อมูลส่วนบุคคลของคุณ เช่น ชื่อ, อีเมล และเบอร์โทรศัพท์ เพื่อวัตถุประสงค์ในการให้บริการ และการทำนัดหมายชมบ้าน ข้อมูลทั้งหมดจะได้รับการเข้ารหัสและไม่ถูกส่งต่อให้บุคคลภายนอกที่ไม่เกี่ยวข้อง"
  },
  terms: {
    title: "⚖️ เงื่อนไขการใช้งาน",
    content: "ข้อตกลงและเงื่อนไข:\n1. ผู้ใช้ต้องใช้ข้อมูลที่เป็นจริงในการทำธุรกรรม\n2. การลงประกาศขาย/เช่า ต้องเป็นทรัพย์ที่ได้รับอนุญาตอย่างถูกต้อง\n3. ทางบริษัทขอสงวนสิทธิ์ในการระงับบัญชีที่ละเมิดกฎความเป็นส่วนตัว"
  }
};

export default function PolicyModal({ policyType, onClose }: PolicyModalProps) {
  if (!policyType || !policies[policyType]) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-[2.5rem] max-w-xl w-full max-h-[80vh] flex flex-col relative z-10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            {policies[policyType].title}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="p-8 overflow-y-auto text-slate-600 space-y-6 leading-relaxed text-sm whitespace-pre-line">
          {policies[policyType].content}
        </div>
        <div className="p-6 border-t border-slate-100 text-center">
          <button onClick={onClose} className="w-full sm:w-auto bg-slate-900 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 transition active:scale-95 cursor-pointer">
            เข้าใจและยอมรับ
          </button>
        </div>
      </div>
    </div>
  );
}
