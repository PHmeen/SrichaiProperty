'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminKycAgentCard, { AgentData } from '@/components/admin/AdminKycAgentCard';
import { toast } from '@/components/ui/toast';
import {
  Search,
  Inbox,
  RefreshCw,
  Download,
  X
} from 'lucide-react';

export default function AdminKycPage() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAgents = async (status: string) => {
    try {
      const res = await fetch(`/api/admin/kyc?status=${status}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setAgents(data.users);
      } else {
        setAgents([]);
      }
    } catch (err) {
      console.error(err);
      setAgents([]);
      toast.error('ไม่สามารถโหลดข้อมูล KYC ได้');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
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
        if (!ignore) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    loadData();
    return () => {
      ignore = true;
    };
  }, [activeTab]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAgents(activeTab);
  };

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะ ${newStatus === 'approved' ? 'อนุมัติ' : 'ไม่อนุมัติ'} บัญชีนี้?`)) return;

    setAgents(prev => prev.filter(a => a.id !== userId));

    try {
      const res = await fetch('/api/admin/kyc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('อัปเดตสถานะสำเร็จ');
        fetchAgents(activeTab);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + (data.error || ''));
        fetchAgents(activeTab);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      fetchAgents(activeTab);
    }
  };

  const handleDeleteAgent = async (userId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีนี้ออกจากระบบอย่างถาวร?')) return;

    setAgents(prev => prev.filter(a => a.id !== userId));

    try {
      const res = await fetch(`/api/admin/kyc?userId=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success('ลบบัญชีสำเร็จ');
        fetchAgents(activeTab);
      } else {
        toast.error('เกิดข้อผิดพลาด: ' + (data.error || ''));
        fetchAgents(activeTab);
      }
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการลบบัญชี');
      fetchAgents(activeTab);
    }
  };

  // Search filter
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase().trim();
    return agents.filter(a => {
      const name = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const email = (a.email || '').toLowerCase();
      const phone = (a.phone || '').toLowerCase();
      const id = (a.id || '').toLowerCase();
      const line = (a.line_id || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || id.includes(q) || line.includes(q);
    });
  }, [agents, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredAgents.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['User ID', 'ชื่อ-นามสกุล', 'อีเมล', 'เบอร์โทรศัพท์', 'LINE ID', 'สถานะ KYC', 'มีเอกสารแนบ', 'วันที่ส่งเอกสาร'];
    const rows = filteredAgents.map(a => [
      `"${a.id}"`,
      `"${a.first_name || ''} ${a.last_name || ''}"`,
      `"${a.email || ''}"`,
      `"${a.phone || '-'}"`,
      `"${a.line_id || '-'}"`,
      `"${a.status}"`,
      `"${a.kyc_doc ? 'ใช่' : 'ไม่ใช่'}"`,
      `"${new Date(a.created_at).toLocaleString('th-TH')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `srichai_kyc_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
  };

  return (
    <>
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 relative z-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">ตรวจสอบเอกสารยืนยันตัวตน (KYC Moderation)</h2>
          <p className="text-xs text-slate-500 font-medium">
            ตรวจรับรองเอกสารประจำตัวและอนุมัติสิทธิ์การเปิดบัญชีนายหน้า
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 shadow-sm cursor-pointer"
            title="ส่งออกไฟล์ CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {/* Controls: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto border border-slate-200">
            <button 
              onClick={() => { setActiveTab('pending'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>รอตรวจสอบ</span>
              {activeTab === 'pending' && agents.length > 0 && (
                <span className="bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none">
                  {agents.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setActiveTab('approved'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              อนุมัติแล้ว
            </button>
            <button 
              onClick={() => { setActiveTab('rejected'); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              ไม่อนุมัติ / ตีกลับ
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, อีเมล, LINE ID, เบอร์โทร..." 
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 text-xs shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-500 font-bold text-xs">กำลังโหลดข้อมูลผู้ยื่นคำขอ...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <Inbox className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800 mb-1">
              ไม่พบรายการ{activeTab === 'pending' ? 'รอตรวจสอบ' : ''}
            </h3>
            <p className="text-slate-500 text-xs">
              {searchQuery ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหาของคุณ' : 'ไม่มีข้อมูลนายหน้าในสถานะนี้ในขณะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAgents.map((agent) => (
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
