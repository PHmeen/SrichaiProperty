import React from 'react';
import { AgentContact } from '@/types';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filteredContacts: AgentContact[];
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
}

/**
 * ==============================================================================
 * CHAT LIST COMPONENT (รายการผู้ติดต่อฝั่ง Agent)
 * ==============================================================================
 */
export default function ChatList({ 
  searchQuery, 
  setSearchQuery, 
  filteredContacts, 
  selectedContactId, 
  setSelectedContactId 
}: Props) {
  return (
    <section className="w-full md:w-80 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col space-y-3 shrink-0 h-full">
      {/* หัวข้อรายการติดต่อ */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="font-extrabold text-slate-900 text-sm">กล่องข้อความเอเย่นต์</h3>
        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
          {filteredContacts.length} ผู้ติดต่อ
        </span>
      </div>

      {/* ช่องค้นหา */}
      <div className="relative">
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อ หรือ รหัสบ้าน..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition placeholder-slate-400"
        />
      </div>

      {/* รายการห้องแชท */}
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {filteredContacts.length === 0 ? (
          <div className="text-slate-400 text-center font-bold text-xs py-8">
            ไม่พบรายชื่อผู้ติดต่อ
          </div>
        ) : (
          filteredContacts.map(c => {
            const isActive = c.id === selectedContactId;
            return (
              <div 
                key={c.id}
                onClick={() => setSelectedContactId(c.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition text-left ${
                  isActive 
                    ? 'bg-blue-50/80 border-blue-200/80 shadow-2xs' 
                    : 'bg-white border-transparent hover:bg-slate-50/80'
                }`}
              >
                {/* อักษรย่อโปรไฟล์ */}
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs shrink-0 shadow-2xs">
                  {c.avatarLetter || c.name.charAt(0)}
                </div>

                {/* รายละเอียด */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-xs truncate">{c.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{c.lastMessageTime}</span>
                  </div>
                  <p className="text-[11px] truncate text-slate-500 mt-0.5 font-normal">{c.lastMessageSnippet}</p>
                  
                  {c.propertyCode && (
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.2 rounded mt-1 inline-block truncate max-w-full">
                      🏠 {c.propertyCode}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

