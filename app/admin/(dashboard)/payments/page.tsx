'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/toast';
import {
  CreditCard,
  Lock,
  Receipt,
  Eye,
  X,
  Clock,
  Check,
  ListFilter,
  AlertCircle,
  RefreshCw,
  Download,
  Search,
  StickyNote,
  AlertTriangle,
  User
} from 'lucide-react';

interface InternalNote {
  text: string;
  author: string;
  updatedAt: string;
}

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
  internalNote?: InternalNote | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
};

const PAYMENT_REJECT_PRESETS = [
  'ยอดเงินในสลิปไม่ตรงกับราคาแพ็กเกจ (599.00 บาท)',
  'สลิปซ้ำ หรือเคยใช้ยืนยันการชำระเงินในระบบแล้ว',
  'ภาพสลิปมีร่องรอยการตัดต่อ หรือรายละเอียดไม่ชัดเจน',
  'ไม่พบยอดเงินโอนเข้าในสเตทเมนต์บัญชีธนาคารปลายทาง',
  'วันและเวลาในสลิปไม่ตรงกับช่วงเวลาที่มีการทำรายการ',
  'อื่นๆ (ระบุคำแนะนำเพิ่มเติมด้านล่าง)'
];

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipUrl, setSlipUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);

  // Rejection Modal State
  const [rejectingPayment, setRejectingPayment] = useState<Payment | null>(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState(PAYMENT_REJECT_PRESETS[0]);
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Internal Note Modal State
  const [noteModalPayment, setNoteModalPayment] = useState<Payment | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/payments?status=${filter}&t=${Date.now()}`)
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
          setIsRefreshing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      });
    return () => { cancelled = true; };
  }, [filter, tick]);

  const changeFilter = (f: Filter) => { 
    setLoading(true); 
    setFilter(f); 
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTick(t => t + 1);
  };

  const handleApprove = async (p: Payment) => {
    if (!confirm(`ยืนยันการอนุมัติสิทธิ์ Verified PRO ให้แก่ "${p.agentName}" ใช่หรือไม่?`)) return;
    setProcessingId(p.id);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: p.id, action: 'approve', agentId: p.agentId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`อนุมัติสลิปและปรับสิทธิ์เป็น Verified PRO เรียบร้อยแล้ว`);
        setTick(t => t + 1);
      } else {
        toast.error(data.error ?? 'เกิดข้อผิดพลาด');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (p: Payment) => {
    setRejectingPayment(p);
    setSelectedRejectReason(PAYMENT_REJECT_PRESETS[0]);
    setCustomRejectNote('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingPayment) return;
    setSubmittingReject(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: rejectingPayment.id,
          action: 'reject',
          agentId: rejectingPayment.agentId,
          reason: selectedRejectReason,
          note: customRejectNote.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('ปฏิเสธสลิปและส่งการแจ้งเตือนไปยังนายหน้าเรียบร้อยแล้ว');
        setRejectingPayment(null);
        setTick(t => t + 1);
      } else {
        toast.error(data.error ?? 'เกิดข้อผิดพลาด');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleOpenNoteModal = (p: Payment) => {
    setNoteModalPayment(p);
    setNoteText(p.internalNote?.text || '');
  };

  const handleSaveNote = async () => {
    if (!noteModalPayment) return;
    setSavingNote(true);
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: noteModalPayment.id,
          action: 'save_note',
          note: noteText.trim()
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('บันทึกโน้ตภายในเรียบร้อยแล้ว');
        // Update locally
        setPayments(prev => prev.map(item => {
          if (item.id === noteModalPayment.id) {
            return { ...item, internalNote: data.note };
          }
          return item;
        }));
        setNoteModalPayment(null);
      } else {
        toast.error(data.error ?? 'ไม่สามารถบันทึกโน้ตได้');
      }
    } catch {
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSavingNote(false);
    }
  };

  // Search filter
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase().trim();
    return payments.filter(p => {
      const name = (p.agentName || '').toLowerCase();
      const email = (p.agentEmail || '').toLowerCase();
      const id = (p.id || '').toLowerCase();
      const order = (p.orderId || '').toLowerCase();
      const note = (p.internalNote?.text || '').toLowerCase();
      return name.includes(q) || email.includes(q) || id.includes(q) || order.includes(q) || note.includes(q);
    });
  }, [payments, searchQuery]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['รหัสธุรกรรม', 'นายหน้าผู้ชำระ', 'อีเมล', 'ยอดเงิน (บาท)', 'สถานะ', 'โน้ตภายใน', 'วันที่ทำรายการ'];
    const rows = filteredPayments.map(p => [
      `"${p.id}"`,
      `"${p.agentName}"`,
      `"${p.agentEmail}"`,
      `"${p.amount}"`,
      `"${STATUS_LABEL[p.status] || p.status}"`,
      `"${(p.internalNote?.text || '').replace(/"/g, '""')}"`,
      `"${new Date(p.createdAt).toLocaleString('th-TH')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `srichai_payments_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดไฟล์ CSV รายการชำระเงินเรียบร้อยแล้ว');
  };

  if (unauthorized) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4 my-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900">ต้องใช้สิทธิ์ Admin เข้าสู่ระบบ</h2>
        <p className="text-slate-500 text-xs leading-relaxed">
          กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ (Admin) เพื่อเข้าถึงหน้ารายละเอียดและการอนุมัติการชำระเงิน
        </p>
        <Link
          href="/admin/login"
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition"
        >
          เข้าสู่ระบบ Admin
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 relative z-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <span>รายการชำระเงิน (Verified PRO Payments)</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            ตรวจสอบสลิปโอนเงิน บันทึกโน้ตตรวจสอบภายในทีม และอนุมัติสิทธิ์แพ็กเกจสมาชิก
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
            {(['pending', 'approved', 'rejected', 'all'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => changeFilter(f)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  filter === f
                    ? 'bg-white shadow-sm border border-slate-200/60 text-slate-900 font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                {f === 'approved' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                {f === 'rejected' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                {f === 'all' && <ListFilter className="w-3.5 h-3.5 text-slate-500" />}
                <span>
                  {f === 'pending' ? 'รอตรวจสอบ' : f === 'approved' ? 'อนุมัติแล้ว' : f === 'rejected' ? 'ปฏิเสธ' : 'ทั้งหมด'}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อนายหน้า, อีเมล, โน้ต..." 
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 text-xs shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table & List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-slate-500 font-bold text-xs">กำลังโหลดรายการชำระเงิน...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2 shadow-sm">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-sm text-slate-800">ไม่พบรายการโอนเงินในหมวดหมู่นี้</p>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'ไม่พบรายการที่ตรงกับคำค้นหาของคุณ' : 'เมื่อมีนายหน้าอัปเกรดและส่งสลิปโอนเงิน รายการจะแสดงขึ้นที่นี่'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[760px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">นายหน้าผู้โอน</th>
                    <th className="px-5 py-3.5">ยอดเงินชำระ</th>
                    <th className="px-5 py-3.5">หลักฐานสลิป</th>
                    <th className="px-5 py-3.5">โน้ตตรวจสอบภายใน</th>
                    <th className="px-5 py-3.5">วันที่ทำรายการ</th>
                    <th className="px-5 py-3.5 text-center">สถานะ</th>
                    <th className="px-5 py-3.5 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-slate-900 text-sm">{p.agentName}</p>
                        <p className="text-slate-400 text-xs font-mono">{p.agentEmail}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-black text-amber-600 text-sm">
                          ฿{p.amount.toLocaleString()}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-medium">PromptPay Slip</span>
                      </td>
                      <td className="px-5 py-4">
                        {p.slipUrl ? (
                          <button
                            onClick={() => setSlipUrl(p.slipUrl)}
                            className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition flex items-center gap-1.5 border border-blue-200 cursor-pointer text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>ดูรูปสลิป</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 font-medium">ไม่มีสลิป</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {p.internalNote?.text ? (
                          <div
                            onClick={() => handleOpenNoteModal(p)}
                            className="bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200/80 p-2 rounded-xl cursor-pointer max-w-[220px] transition"
                            title="คลิกเพื่อแก้ไขโน้ต"
                          >
                            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-800 mb-0.5">
                              <StickyNote className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{p.internalNote.author}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 font-medium line-clamp-2">
                              {p.internalNote.text}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenNoteModal(p)}
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg transition border border-dashed border-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <StickyNote className="w-3 h-3" />
                            <span>+ บันทึกโน้ต</span>
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {new Date(p.createdAt).toLocaleString('th-TH')}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] border ${STATUS_CLASS[p.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {p.status === 'pending' ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={processingId === p.id}
                              onClick={() => handleApprove(p)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-40 transition shadow-sm text-xs cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              disabled={processingId === p.id}
                              onClick={() => handleOpenRejectModal(p)}
                              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-700 font-bold rounded-lg disabled:opacity-40 transition text-xs cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5 text-slate-500" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">ดำเนินการแล้ว</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------
         * SLIP LIGHTBOX MODAL
         * ------------------------------------------------------------------------------ */}
        {slipUrl && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" 
            onClick={() => setSlipUrl(null)}
          >
            <div 
              className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-3 relative animate-in zoom-in-95 duration-150" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span>หลักฐานการโอนเงิน (สลิป PromptPay)</span>
                </p>
                <button 
                  onClick={() => setSlipUrl(null)} 
                  className="w-7 h-7 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-slate-50 rounded-xl p-2 flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={slipUrl} 
                  alt="สลิปโอนเงิน" 
                  className="w-full rounded-lg object-contain max-h-[70vh] shadow" 
                />
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------
         * PAYMENT REJECTION REASON MODAL
         * ------------------------------------------------------------------------------ */}
        {rejectingPayment && (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-red-600 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>ระบุเหตุผลการปฏิเสธสลิปการชำระเงิน</span>
                </h3>
                <button
                  onClick={() => setRejectingPayment(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <p className="font-bold text-slate-400 uppercase">นายหน้าผู้ชำระเงิน:</p>
                <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                  {rejectingPayment.agentName} ({rejectingPayment.agentEmail})
                </p>
                <p className="text-amber-700 font-bold mt-1">ยอดเงิน: ฿{rejectingPayment.amount.toLocaleString()} บาท</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-700">
                  เลือกเหตุผลในการปฏิเสธ (ระบบจะส่งแจ้งเตือนให้นายหน้าทราบ):
                </label>

                {PAYMENT_REJECT_PRESETS.map((preset, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer text-xs font-semibold ${
                      selectedRejectReason === preset
                        ? 'bg-red-50 text-red-800 border-red-200 font-bold'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentRejectReason"
                      value={preset}
                      checked={selectedRejectReason === preset}
                      onChange={(e) => setSelectedRejectReason(e.target.value)}
                      className="accent-red-600 cursor-pointer"
                    />
                    <span>{preset}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  คำแนะนำเพิ่มเติมให้นายหน้า (ถ้ามี):
                </label>
                <textarea
                  rows={2}
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  placeholder="เช่น กรุณาโอนเงินผ่าน QR Code สดในหน้าชำระเงิน หรือแนบสลิปฉบับจริงที่ดาวน์โหลดจากแอพธนาคาร..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setRejectingPayment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={submittingReject}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-red-600/20 transition disabled:opacity-50"
                >
                  {submittingReject ? 'กำลังส่งข้อมูล...' : 'ยืนยันปฏิเสธและแจ้งเตือน'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------------------
         * INTERNAL ADMIN NOTE MODAL
         * ------------------------------------------------------------------------------ */}
        {noteModalPayment && (
          <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-amber-500" />
                  <span>บันทึกโน้ตภายใน (Internal Admin Note)</span>
                </h3>
                <button
                  onClick={() => setNoteModalPayment(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs">
                <p className="font-bold text-amber-900">
                  ธุรกรรม: {noteModalPayment.agentName} (฿{noteModalPayment.amount.toLocaleString()})
                </p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  โน้ตนี้จะมองเห็นเฉพาะทีมแอดมิน เพื่อส่งต่อข้อมูลและบันทึกผลการตรวจสอบยอดเงิน
                </p>
              </div>

              {noteModalPayment.internalNote && (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>แก้ไขล่าสุดโดย: {noteModalPayment.internalNote.author}</span>
                  </span>
                  <span>{new Date(noteModalPayment.internalNote.updatedAt).toLocaleString('th-TH')}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1">
                  ข้อความบันทึกตรวจสอบ:
                </label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="เช่น ตรวจสอบยอดเงินกับ SCB Easy App แล้ว ยอดเข้าเวลา 14:20 น. ตรงตามสลิป สามารถอนุมัติได้..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setNoteModalPayment(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
                >
                  ปิด
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                >
                  {savingNote ? 'กำลังบันทึก...' : 'บันทึกโน้ต'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

