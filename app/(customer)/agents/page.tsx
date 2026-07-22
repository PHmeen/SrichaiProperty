'use client';

import React, { useState } from 'react';
import AgentCard, { Agent } from '@/components/agents/AgentCard';

export default function AgentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetch('/api/agents')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.agents)) {
          setAgents(data.agents);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = selectedLocation === '' || agent.location.includes(selectedLocation);
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="font-sans bg-slate-50 min-h-screen text-slate-800 antialiased overflow-x-hidden text-sm flex flex-col">
      <div className="bg-slate-900 py-12 relative overflow-hidden flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 text-center text-white space-y-3 relative z-10">
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow">Srichai Property Network</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ทำความรู้จักกับนายหน้ามืออาชีพของเรา</h1>
          <p className="text-slate-300 text-xs max-w-xl mx-auto font-light">ทีมงานคุณภาพที่ผ่านการยืนยันตัวตนแล้ว พร้อมให้คำปรึกษาและช่วยคุณค้นหาบ้านที่ตรงใจที่สุด</p>
        </div>
      </div>

      {/* Search Bar */}
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

      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-4 mb-16 flex-grow w-full">
        <h2 className="text-base font-extrabold text-slate-900 mb-6 pb-2 border-b border-slate-100">ตัวแทนนายหน้าทั้งหมด ({filteredAgents.length})</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </main>
    </div>
  );
}

