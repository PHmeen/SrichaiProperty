'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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
  const [unauthorized, setUnauthorized] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/payments?status=${filter}`)
      .then(async (r) => {
        if (r.status === 401) {
          if (!cancelled) {
            setUnauthorized(true);
            setLoading(false);
          }
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data && !cancelled) {
          setPayments(data.transactions ?? []);
          setUnauthorized(false);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, tick]);

  const changeFilter = (f: Filter) => { 
    setLoading(true); 
    setFilter(f); 
  };

  const handleAction = async (id: string, agentId: string | null, action: 'approve' | 'reject') => {
    if (!confirm(`ยืนยันการ${action === 'approve' ? 'อนุมัติ' : 'ปฏิเสธ'}รายการนี้?`)) return;
    setProcessingId(id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action, agentId }),
      });
      const data = await res.json();
      if (data.success) {
        setLoading(true);
        setTick(t => t + 1);
      } else {
        alert(data.error ?? 'เกิดข้อผิดพลาด');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingId(null);
    }
  };

  if (unauthorized) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
          🔒
        </div>
        <h2 className="text-xl font-black text-slate-900">ต้องใช้สิทธิ์ Admin เข้าสู่ระบบ</h2>
        <p className="text-slate-500 text-xs leading-relaxed">
          กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Admin) เพื่อเข้าถึงหน้ารายละเอียดและการอนุมัติการชำระเงิน
        </p>
        <Link
          href="/admin/login"
          className="inline-block px-6 py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs transition"
        >
          เข้าสู่ระบบ Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            💳 รายการชำระเงิน Verified PRO
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ตรวจสอบสลิปโอนเงินและอนุมัติสิทธิ์ Verified PRO ให้แก่นายหน้า
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                filter === f ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f === 'pending' ? '⏳ รอตรวจสอบ' : f === 'approved' ? '✅ อนุมัติแล้ว' : f === 'rejected' ? '❌ ปฏิเสธ' : '📋 ทั้งหมด'}
            </button>
          ))}
        </div>
      </div>

      {/* Table & List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 space-y-2">
          <p className="text-4xl">🧾</p>
          <p className="font-bold text-sm text-slate-700">ไม่พบรายการโอนเงินในหมวดหมู่นี้</p>
          <p className="text-xs text-slate-400">เมื่อมีนายหน้าอัปเกรดและส่งสลิปโอนเงิน รายการจะแสดงขึ้นที่นี่</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-slate-100 bg-slate-50 text-slate-400 font-bold uppercase">
                <tr>
                  <th className="p-4">นายหน้าผู้โอน</th>
                  <th className="p-4">ยอดเงินชำระ</th>
                  <th className="p-4">หลักฐานสลิป</th>
                  <th className="p-4">วันที่ทำรายการ</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <p className="font-extrabold text-slate-900 text-sm">{p.agentName}</p>
                      <p className="text-slate-400 font-semibold">{p.agentEmail}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-black text-amber-600 text-sm">
                        ฿{p.amount.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-medium">PromptPay</span>
                    </td>
                    <td className="p-4">
                      {p.slipUrl ? (
                        <button
                          onClick={() => setSlipUrl(p.slipUrl)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-extrabold transition flex items-center gap-1.5"
                        >
                          🖼️ ดูรูปสลิป
                        </button>
                      ) : (
                        <span className="text-slate-300 font-semibold">ไม่มีสลิป</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      {new Date(p.createdAt).toLocaleString('th-TH')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase ${STATUS_CLASS[p.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={processingId === p.id}
                            onClick={() => handleAction(p.id, p.agentId, 'approve')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg disabled:opacity-40 transition shadow-sm"
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
                      ) : (
                        <span className="text-slate-300 font-semibold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slip Lightbox Modal */}
      {slipUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" 
          onClick={() => setSlipUrl(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl space-y-3 relative" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-2">
              <p className="font-extrabold text-slate-900 text-sm">🧾 หลักฐานการโอนเงิน (สลิป)</p>
              <button 
                onClick={() => setSlipUrl(null)} 
                className="w-7 h-7 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="bg-slate-50 rounded-2xl p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={slipUrl} 
                alt="สลิปโอนเงิน" 
                className="w-full rounded-xl object-contain max-h-[70vh] shadow" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
