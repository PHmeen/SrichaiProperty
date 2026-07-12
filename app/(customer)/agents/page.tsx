'use client';

// === หน้ารายการรายชื่อตัวแทนนายหน้า (Agents Page) ===
// เหมาะสำหรับมือใหม่: แสดงวิธีการเขียนตัวกรองค้นหารายชื่อนายหน้า (Filter) แบบง่าย ๆ ไม่ซับซ้อน

import React, { useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: number;
  name: string;
  avatar: string;
  role: string;
  propertiesCount: number;
  rating: string;
  location: string;
  phone: string;
  email: string;
  isVerified: boolean;
}

export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // รายการข้อมูลนายหน้าจำลอง
  const agents: Agent[] = [
    {
      id: 1,
      name: "สมชาย นายหน้าดี",
      avatar: "https://ui-avatars.com/api/?name=Somchai+Agent&background=1e40af&color=fff",
      role: "ตัวแทนจำหน่ายบ้านเดี่ยวและพูลวิลล่า",
      propertiesCount: 15,
      rating: "4.9 (120 รีวิว)",
      location: "หาดใหญ่",
      phone: "089-123-4567",
      email: "somchai@srichai.com",
      isVerified: true
    },
    {
      id: 2,
      name: "วิภาดา จิตดี",
      avatar: "https://ui-avatars.com/api/?name=Wipada+Agent&background=0d9488&color=fff",
      role: "ตัวแทนจำหน่ายคอนโดมิเนียมและทาวน์โฮม",
      propertiesCount: 8,
      rating: "4.8 (85 รีวิว)",
      location: "เมืองสงขลา",
      phone: "081-987-6543",
      email: "wipada@srichai.com",
      isVerified: true
    },
    {
      id: 3,
      name: "เอกชัย มั่นคง",
      avatar: "https://ui-avatars.com/api/?name=Ekkachai+Agent&background=d97706&color=fff",
      role: "ตัวแทนจำหน่ายที่ดินและอสังหาฯ เชิงพาณิชย์",
      propertiesCount: 22,
      rating: "5.0 (150 รีวิว)",
      location: "สะเดา",
      phone: "086-555-4433",
      email: "ekkachai@srichai.com",
      isVerified: true
    }
  ];

  // ฟังก์ชันช่วยคัดกรองข้อมูลนายหน้าจากช่องพิมพ์ค้นหาและทำเลที่เลือก
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === '' || agent.location === selectedLocation;
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      {/* แบนเนอร์ด้านบน */}
      <div className="bg-slate-900 py-12 relative overflow-hidden flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 text-center text-white space-y-3 relative z-10">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow">Srichai Property Network</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ทำความรู้จักกับนายหน้ามืออาชีพของเรา</h1>
          <p className="text-slate-300 text-xs max-w-xl mx-auto font-light">ทีมงานคุณภาพที่ผ่านการยืนยันตัวตนแล้ว พร้อมให้คำปรึกษาและช่วยคุณค้นหาบ้านที่ตรงใจที่สุด</p>
        </div>
      </div>

      {/* แผงปุ่มค้นหาและตัวกรอง */}
      <div className="max-w-4xl mx-auto px-4 relative z-20 -mt-6 mb-8 w-full">
        <div className="bg-white p-2.5 rounded-2xl shadow-md flex flex-col md:flex-row gap-2 border border-slate-200">
          <div className="flex-1 flex bg-slate-50 rounded-xl p-2 border border-slate-100 focus-within:border-blue-500 transition-colors">
            <span className="flex items-center pl-2 pr-1.5 text-slate-400">🔍</span>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อนายหน้า..." 
              className="w-full bg-transparent border-none focus:ring-0 text-slate-800 font-medium text-xs outline-none" 
            />
          </div>
          <select 
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="md:w-48 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 text-slate-700 font-medium text-xs cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">ทุกพื้นที่ให้บริการ</option>
            <option value="หาดใหญ่">หาดใหญ่</option>
            <option value="เมืองสงขลา">เมืองสงขลา</option>
            <option value="สะเดา">สะเดา</option>
          </select>
        </div>
      </div>

      {/* รายชื่อการ์ดนายหน้า */}
      <main className="max-w-5xl mx-auto px-4 py-4 mb-16 flex-grow w-full">
        <h2 className="text-base font-extrabold text-slate-900 mb-6 pb-2 border-b border-slate-100">ตัวแทนนายหน้าทั้งหมด ({filteredAgents.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-4 hover:shadow-md transition">
              <div className="relative">
                <img src={agent.avatar} className="w-16 h-16 rounded-full border shadow-sm object-cover" alt={agent.name} />
                {agent.isVerified && <span className="absolute bottom-0 right-0 bg-blue-500 text-white text-[9px] font-bold p-0.5 rounded-full border border-white">✓</span>}
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{agent.name}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{agent.role}</p>
              </div>

              <div className="w-full bg-slate-50 p-2.5 rounded-xl grid grid-cols-2 text-center text-xs font-semibold border border-slate-100">
                <div className="border-r border-slate-200">
                  <p className="text-slate-400 text-[10px]">อสังหาริมทรัพย์</p>
                  <p className="text-slate-850">{agent.propertiesCount} ประกาศ</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">คะแนนรีวิว</p>
                  <p className="text-slate-850">{agent.rating}</p>
                </div>
              </div>

              <div className="w-full text-left space-y-1.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <p>📍 <strong>พื้นที่:</strong> {agent.location}</p>
                <p>📞 <strong>เบอร์โทร:</strong> {agent.phone}</p>
                <p>✉️ <strong>อีเมล:</strong> {agent.email}</p>
              </div>

              <Link 
                href={`/chat?agentId=${agent.id}`}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                💬 ส่งข้อความแชท
              </Link>
            </div>
          ))}
        </div>
      </main>
      {/* ส่วนท้ายเว็บไซต์ */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs">
          <p>&copy; 2026 Srichai Property Agents. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
