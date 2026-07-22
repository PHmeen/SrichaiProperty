import React from 'react';
import { Contact } from '../page'; // We'll export Contact from page.tsx

interface Props {
  activeContact: Contact | null;
  selectedContactId: string;
  isTypingState: { [key: string]: boolean };
  newMessageText: string;
  setNewMessageText: (val: string) => void;
  handleSendMessage: (text?: string) => void;
  sendQuickAction: (actionType: 'location' | 'document' | 'callback') => void;
}

export default function ChatRoom({
  activeContact,
  selectedContactId,
  isTypingState,
  newMessageText,
  setNewMessageText,
  handleSendMessage,
  sendQuickAction
}: Props) {
  if (!activeContact) {
    return (
      <section className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col overflow-hidden relative justify-center items-center">
        <div className="text-slate-400 font-bold">กรุณาเลือกผู้ติดต่อเพื่อเริ่มแชท</div>
      </section>
    );
  }

  return (
    <section className="flex-1 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
      {/* Chat Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white shrink-0">
        <div className="text-left">
          <h4 className="font-extrabold text-slate-900 text-xs md:text-sm">{activeContact.name}</h4>
          <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> กำลังออนไลน์
          </span>
        </div>
      </div>

      {/* Property Card */}
      <div className="px-4 py-3 bg-[#f8fafc]/80 border-b flex items-center justify-between gap-4 shrink-0 text-left">
        <div>
          <span className="text-[9px] text-slate-400 font-bold block">ทรัพย์ที่สนใจ ({activeContact.propertyCode})</span>
          <h5 className="font-extrabold text-slate-800 text-[11px] truncate">{activeContact.propertyName}</h5>
        </div>
        <div className="text-right shrink-0">
          <strong className="text-blue-600 font-extrabold text-xs block">{activeContact.propertyPrice}</strong>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[250px] flex flex-col justify-end">
        {activeContact.messages.map(m => {
          const isClient = m.sender === 'client';
          return (
            <div key={m.id} className={`flex gap-3 ${isClient ? 'justify-start text-left' : 'justify-end text-right'}`}>
              <div className="max-w-[70%]">
                <div className={`p-3 rounded-2xl text-[11px] font-semibold leading-relaxed shadow-sm ${isClient ? 'bg-slate-100 text-slate-800 rounded-tl-none' : 'bg-blue-600 text-white rounded-tr-none'}`}>
                  {m.content}
                </div>
                <div className="text-[9px] text-slate-400 font-bold mt-1 px-1">{m.time}</div>
              </div>
            </div>
          );
        })}

        {isTypingState[selectedContactId] && (
          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold px-2 shrink-0">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
            </span>
            {activeContact.name} กำลังพิมพ์...
          </div>
        )}
      </div>

      {/* Actions & Inputs */}
      <div className="p-4 border-t bg-white space-y-3 shrink-0">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => sendQuickAction('location')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📍 ส่งพิกัดจุดนัดพบ</button>
          <button onClick={() => sendQuickAction('document')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📄 ส่งไฟล์เอกสารบ้าน</button>
          <button onClick={() => sendQuickAction('callback')} className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-500 rounded-xl text-[10px] font-extrabold border transition">📋 ขอเบอร์ติดต่อกลับ</button>
        </div>

        <div className="relative bg-[#f8fafc] border rounded-2xl p-1.5 flex items-center shadow-inner">
          <input 
            type="text" 
            value={newMessageText}
            onChange={(e) => setNewMessageText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
            placeholder={`ตอบกลับ${activeContact.name.split(' ')[0]}... ข้อมูลบันทึกตามมาตรฐาน PDPA`}
            className="w-full bg-transparent border-none outline-none pl-3 pr-12 text-slate-800 placeholder-slate-400 font-semibold text-xs py-2"
          />
          <button onClick={() => handleSendMessage()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs transition">ส่ง 📤</button>
        </div>
      </div>
    </section>
  );
}
