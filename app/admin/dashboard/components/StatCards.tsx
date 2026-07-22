import React from 'react';

interface Props {
  pendingCount: number;
  onlineCount: number;
  agentsCount: number;
  proAgentsCount: number;
}

export default function StatCards({ pendingCount, onlineCount, agentsCount, proAgentsCount }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Pending Mod */}
      <div className="bg-white rounded-2xl p-6 border-l-4 border-amber-500 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-md uppercase tracking-wider">Urgent</span>
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Moderation</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{pendingCount}</span>
            <span className="text-sm font-medium text-slate-400 mb-1">items</span>
          </div>
        </div>
      </div>

      {/* Online Users */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md">
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
             <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Live</span>
          </div>
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Now</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{onlineCount}</span>
            <span className="text-sm font-medium text-slate-400 mb-1">users</span>
          </div>
        </div>
      </div>

      {/* Registered Agents */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          </div>
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Agents</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{agentsCount}</span>
            <span className="text-sm font-medium text-slate-400 mb-1">agents</span>
          </div>
        </div>
      </div>

      {/* Verified PRO Agents */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
          </div>
        </div>
        <div>
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Verified PRO Agents</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900">{proAgentsCount}</span>
            <span className="text-sm font-medium text-slate-400 mb-1">R2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
