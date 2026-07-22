import React from 'react';
import Image from 'next/image';

interface ModerationItem {
  id: string;
  title: string;
  code: string;
  price: string;
  seller: string;
  plan: string;
  isVerified?: boolean;
  sla: string;
  slaUrgent?: boolean;
  image?: string;
}

interface Props {
  items: ModerationItem[];
  onApprove: (id: string, title: string) => void;
  onReject: (id: string, title: string) => void;
}

export default function ModerationList({ items, onApprove, onReject }: Props) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 font-medium text-sm">
        ไม่มีรายการที่รอการตรวจสอบ
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {item.image ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                 <Image src={item.image} alt={item.title} width={64} height={64} className="w-full h-full object-cover" unoptimized />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center text-xl">
                 🏠
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-slate-500 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">{item.code}</span>
                {item.slaUrgent && (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <span>⏱️</span> SLA: {item.sla}
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-slate-800 text-sm leading-tight">{item.title}</h4>
              <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-slate-500">
                <span className="text-amber-600 font-bold">{item.price}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="flex items-center gap-1">
                  👤 {item.seller}
                  {item.isVerified && <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">{item.plan}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => onApprove(item.id, item.title)}
              className="flex-1 sm:flex-none px-4 py-2 bg-[#0d1527] hover:bg-[#16223d] text-white text-xs font-bold rounded-lg transition shadow-sm"
            >
              Approve (เผยแพร่)
            </button>
            <button 
              onClick={() => onReject(item.id, item.title)}
              className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition"
            >
              Reject (ตีกลับ)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
