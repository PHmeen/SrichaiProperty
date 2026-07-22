import React from 'react';
import { AgentContact } from '@/types';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredContacts: AgentContact[];
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
}

export default function ChatList({ 
  searchQuery, 
  setSearchQuery, 
  filteredContacts, 
  selectedContactId, 
  setSelectedContactId 
}: Props) {
  return (
    <section className="w-full md:w-80 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col space-y-4 shrink-0">
      <h3 className="font-extrabold text-slate-900 text-sm md:text-base px-1">รายการติดต่อ</h3>
      <input 
        type="text" 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="ค้นหาชื่อ หรือ รหัสบ้าน..." 
        className="w-full bg-[#f8fafc] border rounded-2xl px-4 py-2 text-xs font-semibold text-slate-800 outline-none"
      />

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {filteredContacts.length === 0 ? (
          <p className="text-slate-400 text-center font-bold py-6">ไม่มีรายชื่อผู้ติดต่อ</p>
        ) : (
          filteredContacts.map(c => {
            const isActive = c.id === selectedContactId;
            return (
              <div 
                key={c.id}
                onClick={() => setSelectedContactId(c.id)}
                className={`flex gap-3 p-3 rounded-2xl cursor-pointer border text-left ${isActive ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold shrink-0">{c.avatarLetter}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs truncate">{c.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{c.lastMessageTime}</span>
                  </div>
                  <p className="text-[10px] truncate mt-0.5 text-slate-500">{c.lastMessageSnippet}</p>
                  <span className="bg-slate-100 text-slate-500 text-[8px] font-extrabold px-1.5 py-0.2 rounded mt-1.5 inline-block">{c.propertyCode}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
