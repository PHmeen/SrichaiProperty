'use client';

import React, { useState, useEffect } from 'react';
import AdminKycAgentCard, { AgentData } from '@/components/admin/AdminKycAgentCard';

export default function AdminKycPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const fetchAgents = (status: string) => {
    setLoading(true);
    fetch(`/api/admin/kyc?status=${status}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.users)) {
          setAgents(data.users);
        } else {
          setAgents([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setAgents([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/kyc?status=${activeTab}&t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        const data = await res.json();
        if (!ignore) {
          if (data.success && Array.isArray(data.users)) {
            setAgents(data.users);
          } else {
            setAgents([]);
          }
        }
      } catch (err) {
        console.error(err);
        if (!ignore) setAgents([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadData();
    return () => { ignore = true; };
  }, [activeTab]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะ ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} บัญชีนี้?`)) return;

    // อัปเดต UI ทันที 0 วินาทีโดยตัดรายการนั้นออก
    setAgents(prev => prev.filter(a => a.id !== userId));

    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        alert("อัปเดตสถานะสำเร็จ");
        fetchAgents(activeTab); // refresh list
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
        fetchAgents(activeTab);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
      fetchAgents(activeTab);
    }
  };

  const handleDeleteAgent = async (userId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้ออกจากระบบอย่างถาวร?")) return;

    // ตัดออกจาก UI ทันที 0 วินาที
    setAgents(prev => prev.filter(a => a.id !== userId));

    try {
      const res = await fetch(`/api/admin/kyc?userId=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        alert("ลบบัญชีสำเร็จ");
        fetchAgents(activeTab);
      } else {
        alert("เกิดข้อผิดพลาด: " + data.error);
        fetchAgents(activeTab);
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการลบบัญชี");
      fetchAgents(activeTab);
    }
  };

  return (
    <>
      {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 relative z-0">
          <h2 className="text-lg font-extrabold text-slate-800">ตรวจสอบเอกสารยืนยันตัวตน (KYC Moderation)</h2>
          
          <div className="relative w-72">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
            <input 
              type="text" 
              placeholder="ค้นหารหัส ID, ชื่อผู้ใช้..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border border-transparent rounded-full focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700"
            />
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-y-auto">
          
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
            <button 
              onClick={() => { setActiveTab('pending'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              รอตรวจสอบบัญชีนายหน้า 
              {activeTab === 'pending' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px]">ใหม่</span>}
            </button>
            <button 
              onClick={() => { setActiveTab('approved'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'approved' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              ตรวจสอบแล้ว
            </button>
            <button 
              onClick={() => { setActiveTab('rejected'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs ${activeTab === 'rejected' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              ไม่อนุมัติ (ตีกลับ)
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-slate-500 font-bold">กำลังโหลดข้อมูลผู้ใช้...</p>
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <div className="text-4xl mb-4">📭</div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายการ{activeTab === 'pending' ? 'รอตรวจสอบ' : ''}</h3>
              <p className="text-slate-500 font-medium">ไม่มีข้อมูลนายหน้าในสถานะนี้</p>
            </div>
          ) : (
            <div className="space-y-6">
              {agents.map((agent) => (
                <AdminKycAgentCard 
                  key={agent.id} 
                  agent={agent} 
                  activeTab={activeTab} 
                  onUpdateStatus={handleUpdateStatus} 
                  onDeleteAgent={handleDeleteAgent}
                />
              ))}
            </div>
          )}
        </div>
    </>
  );
}
