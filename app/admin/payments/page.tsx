'use client';

import React, { useState, useEffect } from 'react';

interface Payment {
  id: string;
  orderId: string | null;
  amount: number;
  slipUrl: string | null;
  status: string;
  createdAt: string;
  agentId: string | null;
  agentName: string;
  agentEmail: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
};
const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // ใช้ trigger re-fetch

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/payments?status=${filter}`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) {
          setPayments(data.transactions ?? []);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, tick]);

  const changeFilter = (f: Filter) => { setLoading(true); setFilter(f); };

  const handleAction = async (id: string, agentId: string | null, action: 'approve' | 'reject') => {
    if (!confirm(`ยืนยันการ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการนี้?`)) return;
    setProcessingId(id);
    const res = await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: id, action, agentId }),
    });
    const data = await res.json();
    setProcessingId(null);
    if (data.success) { setLoading(true); setTick(t => t + 1); }
    else alert(data.error ?? 'เกิดข้อผิดพลาด');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">💳 จัดการการชำระเงิน PRO</h1>
          <p className="text-xs text-slate-400 mt-0.5">ตรวจสอบสลิปและอนุมัติ Verified PRO ให้นายหน้า</p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              {f === 'pending' ? '⏳ รอ' : f === 'approved' ? '✅ อนุมัติ' : f === 'rejected' ? '❌ ปฏิเสธ' : '📋 ทั้งหมด'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
          <p className="text-3xl mb-2">🧾</p>
          <p className="font-bold text-sm">ไม่พบรายการในหมวดนี้</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase">
              <tr>
                <th className="p-4">นายหน้า</th>
                <th className="p-4">ยอดเงิน</th>
                <th className="p-4">สลิป</th>
                <th className="p-4">วันที่</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="p-4">
                    <p className="font-extrabold text-slate-900">{p.agentName}</p>
                    <p className="text-slate-400">{p.agentEmail}</p>
                  </td>
                  <td className="p-4 font-black text-amber-600">฿{p.amount.toLocaleString()}</td>
                  <td className="p-4">
                    {p.slipUrl ? (
                      <button
                        onClick={() => setSlipUrl(p.slipUrl)}
                        className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition"
                      >
                        🖼️ ดูสลิป
                      </button>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="p-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${STATUS_CLASS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {p.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={processingId === p.id}
                          onClick={() => handleAction(p.id, p.agentId, 'approve')}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg disabled:opacity-40 transition"
                        >
                          อนุมัติ
                        </button>
                        <button
                          disabled={processingId === p.id}
                          onClick={() => handleAction(p.id, p.agentId, 'reject')}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg disabled:opacity-40 transition"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slip Modal */}
      {slipUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSlipUrl(null)}>
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="font-extrabold text-slate-900 text-sm">🧾 สลิปโอนเงิน</p>
              <button onClick={() => setSlipUrl(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slipUrl} alt="slip" className="w-full rounded-xl object-contain max-h-[70vh]" />
          </div>
        </div>
      )}
    </div>
  );
}
