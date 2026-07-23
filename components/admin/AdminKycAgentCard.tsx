import React from 'react';
import Image from 'next/image';

export interface AgentData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image: string | null;
  kyc_doc: string | null;
  status: string;
  created_at: string;
}

interface Props {
  agent: AgentData;
  activeTab: 'pending' | 'approved' | 'rejected';
  onUpdateStatus: (userId: string, status: string) => void;
}

export default function AdminKycAgentCard({ agent, activeTab, onUpdateStatus }: Props) {
  return (
    <div className="bg-white rounded-2xl border-2 border-amber-500/20 shadow-sm overflow-hidden flex flex-col">
      {/* Card Main Content */}
      <div className="flex flex-col xl:flex-row p-6 gap-6">
        {/* Left: Info */}
        <div className="xl:w-1/3 flex flex-col gap-6 border-r border-slate-100 pr-6">
          
          <div className="flex items-center gap-2">
             <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-1 rounded-md border border-blue-100 tracking-wider">ขออัปเกรดเป็น AGENT (R2)</span>
             <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 uppercase">User ID: {agent.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-4">
            {agent.profile_image ? (
               <Image src={agent.profile_image} alt="Profile" width={64} height={64} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 shadow-sm" unoptimized />
            ) : (
               <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-black border-2 border-white shadow-sm">
                 {agent.first_name?.[0]}{agent.last_name?.[0]}
               </div>
            )}
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{agent.first_name} {agent.last_name}</h3>
              <p className="text-slate-400 font-medium text-xs">@{agent.first_name.toLowerCase()}_agent</p>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 text-xs">
              <span className="text-slate-500 font-bold">อีเมล (Email):</span>
              <span className="text-slate-800 font-semibold">{agent.email}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200/60 text-xs">
              <span className="text-slate-500 font-bold">เบอร์โทร (Phone):</span>
              <span className="text-slate-800 font-semibold">{agent.phone || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold">วันที่ส่งข้อมูล:</span>
              <span className="text-slate-800 font-semibold">{new Date(agent.created_at).toLocaleString('th-TH')}</span>
            </div>
          </div>

          {/* Checklist */}
          {activeTab === 'pending' && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100/50">
              <h4 className="text-[10px] font-black text-amber-600 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                 <span>📋</span> Admin Checklist (ส่วนตรวจสอบ)
              </h4>
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">รูปภาพเอกสารชัดเจน อ่านง่าย</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">ชื่อ-สกุล ตรงกับข้อมูลที่กรอกมา</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 transition-colors">เอกสารยังไม่หมดอายุ</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right: Images */}
        <div className="xl:w-2/3 flex gap-4 overflow-x-auto pb-2">
           {/* KYC Doc Image */}
           <div className="relative min-w-[320px] max-w-[400px] h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group">
             <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-md z-10">ภาพถ่ายบัตรประชาชน</div>
              {agent.kyc_doc ? (
                agent.kyc_doc.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 text-center space-y-2">
                    <span className="text-4xl">📄</span>
                    <span className="text-xs font-bold text-slate-700">ไฟล์เอกสาร PDF</span>
                    <a 
                      href={agent.kyc_doc} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                    >
                      เปิดดูไฟล์ PDF ↗
                    </a>
                  </div>
                ) : (
                  <Image 
                    src={agent.kyc_doc} 
                    alt="KYC Document" 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                    unoptimized
                  />
                )
              ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                 <span className="text-4xl mb-2">📸</span>
                 <span className="text-xs font-bold">ไม่มีไฟล์เอกสาร</span>
               </div>
             )}
           </div>

           {/* Profile Image */}
           <div className="relative min-w-[200px] max-w-[280px] h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group">
             <div className="absolute top-3 left-3 bg-slate-900/70 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-md z-10">ภาพถ่ายหน้าตัวเอง</div>
             {agent.profile_image ? (
               <Image 
                 src={agent.profile_image} 
                 alt="Selfie" 
                 fill
                 className="object-cover object-top group-hover:scale-105 transition-transform duration-500" 
                 unoptimized
               />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                 <span className="text-4xl mb-2">👤</span>
                 <span className="text-xs font-bold">ไม่มีรูปโปรไฟล์</span>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      {activeTab === 'pending' && (
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-bold text-amber-600">รอตรวจสอบเอกสาร (Status: Pending)</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onUpdateStatus(agent.id, 'rejected')}
              className="px-5 py-2.5 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-all text-xs flex items-center gap-2"
            >
              <span>✕</span> ไม่อนุมัติ (ตีกลับ)
            </button>
            <button 
              onClick={() => onUpdateStatus(agent.id, 'approved')}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/30 active:scale-95 text-xs flex items-center gap-2"
            >
              <span>✓</span> อนุมัติบัญชีนายหน้า
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
