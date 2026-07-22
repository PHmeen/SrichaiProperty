import React from 'react';

export default function AgentRegisterBanner() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative bg-[#090d16] items-center justify-center p-12 overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#1e293b,transparent)] opacity-40" />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 w-full max-w-md flex flex-col justify-between h-full py-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-xl shadow-lg">
            S
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            Srichai<span className="text-amber-500">Agent</span>
          </span>
        </div>

        {/* Main Copy */}
        <div className="my-auto py-12">
          <h1 className="text-4xl font-extrabold text-white mb-6 leading-[1.3] tracking-tight">
            ยกระดับอาชีพ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-300">นายหน้าอสังหาฯ ของคุณ</span>
          </h1>
          <p className="text-slate-400 text-sm font-light leading-relaxed mb-10">
            ร่วมเป็นส่วนหนึ่งของเครือข่ายตัวแทนจำหน่ายที่เติบโตเร็วที่สุด พร้อมรับสิทธิประโยชน์และเครื่องมือช่วยเหลือการขายเต็มรูปแบบ
          </p>

          {/* Benefits List */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 font-bold text-sm">
                $
              </div>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">รับค่าคอมมิชชันเต็มเม็ดเต็มหน่วย</h4>
                <p className="text-slate-400 text-xs font-light">โครงสร้างผลตอบแทนที่โปร่งใสและเป็นธรรมที่สุด</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 text-sm">
                🏠
              </div>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">เข้าถึงฐานลูกค้ากว่า 5,000+ ราย</h4>
                <p className="text-slate-400 text-xs font-light">ระบบคัดกรองผู้สนใจซื้อ (Lead) ส่งตรงถึงมือคุณทุกวัน</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 text-sm">
                📱
              </div>
              <div>
                <h4 className="text-white font-bold text-sm mb-1">ระบบ Agent Dashboard อัจฉริยะ</h4>
                <p className="text-slate-400 text-xs font-light">จัดการการนัดหมายและพॉर्टโฟลิโอของคุณได้ง่ายๆ ผ่านมือถือ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] text-slate-600 font-medium">
          Srichai Property Agents Platform &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
