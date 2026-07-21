import React from 'react';
import Link from 'next/link';

export default function AgentFooter() {
  return (
    <footer className="bg-[#090D16] text-white py-8 border-t border-slate-800 text-[10px] text-slate-400 mt-auto w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-amber-500 rounded flex items-center justify-center text-slate-950 font-black">S</div>
          <span className="font-bold text-white">Srichai Property Agents Platform</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div className="flex gap-4 font-bold text-slate-300">
          <Link href="/agent/home" className="hover:text-amber-400 transition">หน้าหลักนายหน้า</Link>
          <Link href="/agent/add-property" className="hover:text-amber-400 transition">ลงประกาศขายบ้าน</Link>
          <Link href="/home" className="hover:text-amber-400 transition">🌐 หน้าเว็บไซต์หลัก</Link>
        </div>
      </div>
    </footer>
  );
}
