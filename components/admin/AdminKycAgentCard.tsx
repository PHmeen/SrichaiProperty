'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์การ์ดตรวจสอบอนุมัติเอกสาร KYC นายหน้า (Admin KYC Agent Card)
 * /components/admin/AdminKycAgentCard.tsx
 * ==============================================================================
 * ยกระดับสู่มาตรฐานระดับสากล:
 * 1. Rejection Reason with Note: ป๊อบอัปเลือกเหตุผลตีกลับมาตรฐานพร้อมช่องคำแนะนำเพิ่มเติม
 * 2. Inspection Tools Integration: ปุ่มเปิดโหมดตรวจเอกสารระดับสูง (หมุน 90° ซูม 100-300% แพนเลื่อน)
 * 3. แจ้งเตือน In-app Notification ไปหานายหน้าอัตโนมัติ
 * ==============================================================================
 */

import React, { useState } from 'react';
import Image from 'next/image';
import {
  FileText,
  UserCheck,
  Trash2,
  ExternalLink,
  Shield,
  Phone,
  Mail,
  Calendar,
  Check,
  X,
  FileCheck,
  ZoomIn,
  AlertTriangle
} from 'lucide-react';

export interface AgentData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  profile_image: string | null;
  kyc_doc: string | null;
  status: string;
  created_at: string;
  line_id?: string | null;
}

interface Props {
  agent: AgentData;
  activeTab: 'pending' | 'approved' | 'rejected';
  onUpdateStatus: (userId: string, status: string, reason?: string, note?: string) => void;
  onDeleteAgent?: (userId: string) => void;
  onInspectDoc?: (imageUrl: string, title: string) => void;
}

const KYC_REJECT_PRESETS = [
  'ภาพถ่ายบัตรประชาชนไม่ชัดเจน / เบลอ / มีแสงสะท้อนทับตัวเลข',
  'เอกสารบัตรประชาชนหมดอายุแล้ว',
  'ชื่อ-นามสกุล บนบัตรไม่ตรงกับชื่อบัญชีที่ลงทะเบียน',
  'ภาพเอกสารถูกครอบตัดจนเห็นขอบบัตรไม่ครบถ้วน',
  'ภาพมีเงาบดบังข้อมูลสำคัญ หรือมีร่องรอยการตัดต่อตกแต่งภาพ',
  'อื่นๆ (ระบุคำแนะนำเพิ่มเติมด้านล่าง)'
];

export default function AdminKycAgentCard({
  agent,
  activeTab,
  onUpdateStatus,
  onDeleteAgent,
  onInspectDoc
}: Props) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(KYC_REJECT_PRESETS[0]);
  const [customNote, setCustomNote] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const handleConfirmReject = async () => {
    setSubmittingReject(true);
    await onUpdateStatus(agent.id, 'rejected', selectedReason, customNote.trim());
    setSubmittingReject(false);
    setIsRejectModalOpen(false);
  };

  const isPdf = agent.kyc_doc?.toLowerCase().endsWith('.pdf');

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition">
        {/* Card Main Content */}
        <div className="flex flex-col xl:flex-row p-4 sm:p-6 gap-6">
          {/* Left: Info */}
          <div className="xl:w-1/3 flex flex-col gap-4 border-b xl:border-b-0 xl:border-r border-slate-100 pb-5 xl:pb-0 xl:pr-6">
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-1 rounded-md border border-blue-100 tracking-wider">
                ยื่นขอเป็นนายหน้า (Agent Application)
              </span>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                ID: {agent.id.slice(0, 8)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {agent.profile_image ? (
                <Image
                  src={agent.profile_image}
                  alt="Profile"
                  width={56}
                  height={56}
                  className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-xs shrink-0"
                  unoptimized
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-black border-2 border-white shadow-xs shrink-0">
                  {agent.first_name?.[0] || 'A'}{agent.last_name?.[0] || ''}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  {agent.first_name} {agent.last_name}
                </h3>
                <p className="text-slate-400 font-medium text-xs mt-0.5 truncate flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>ผู้ยื่นขอรับการตรวจสอบ KYC</span>
                </p>
              </div>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>อีเมล:</span>
                </span>
                <span className="text-slate-800 font-semibold truncate ml-2">{agent.email}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>เบอร์โทร:</span>
                </span>
                <span className="text-slate-800 font-semibold">{agent.phone || '-'}</span>
              </div>
              {agent.line_id && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">LINE ID:</span>
                  <span className="text-slate-800 font-semibold">{agent.line_id}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-bold flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>วันที่ยื่นเอกสาร:</span>
                </span>
                <span className="text-slate-700 font-medium">
                  {new Date(agent.created_at).toLocaleString('th-TH')}
                </span>
              </div>
            </div>

            {/* Checklist */}
            {activeTab === 'pending' && (
              <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60">
                <h4 className="text-[10px] font-black text-amber-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>เกณฑ์การตรวจสอบ (Verification Criteria)</span>
                </h4>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                    <span>ภาพเอกสารชัดเจน อ่านเลข 13 หลักได้</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                    <span>ชื่อ-นามสกุล ตรงกับข้อมูลที่ลงทะเบียน</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                    <span>เอกสารบัตรประชาชนยังไม่หมดอายุ</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right: Images and Inspection triggers */}
          <div className="xl:w-2/3 flex flex-col sm:flex-row gap-4 overflow-x-auto pb-2">
            {/* KYC Doc Image */}
            <div className="relative w-full sm:min-w-[300px] sm:max-w-[380px] h-[230px] sm:h-[260px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shrink-0 flex flex-col">
              <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
                ภาพถ่ายบัตรประชาชน
              </div>

              {agent.kyc_doc ? (
                isPdf ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 text-center space-y-2">
                    <FileText className="w-12 h-12 text-rose-500" />
                    <span className="text-xs font-bold text-slate-700">ไฟล์เอกสาร PDF</span>
                    <a
                      href={agent.kyc_doc}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                    >
                      <span>เปิดดูเอกสารฉบับเต็ม</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <>
                    <Image
                      src={agent.kyc_doc}
                      alt="KYC Document"
                      fill
                      sizes="(max-width: 640px) 100vw, 380px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      onClick={() =>
                        onInspectDoc?.(
                          agent.kyc_doc || '',
                          `บัตรประชาชน: ${agent.first_name} ${agent.last_name}`
                        )
                      }
                      unoptimized
                    />

                    {/* Inspection Overlay Button */}
                    <button
                      type="button"
                      onClick={() =>
                        onInspectDoc?.(
                          agent.kyc_doc || '',
                          `บัตรประชาชน: ${agent.first_name} ${agent.last_name}`
                        )
                      }
                      className="absolute bottom-2.5 right-2.5 bg-slate-900/80 hover:bg-blue-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg z-10 flex items-center gap-1.5 shadow-md transition cursor-pointer"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>เครื่องมือตรวจภาพ (ซูม/หมุน)</span>
                    </button>
                  </>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <FileText className="w-8 h-8 mb-1.5 text-slate-300" />
                  <span className="text-xs font-medium text-slate-400">ไม่มีไฟล์เอกสารแนบ</span>
                </div>
              )}
            </div>

            {/* Profile Image (Selfie) */}
            <div className="relative w-full sm:min-w-[180px] sm:max-w-[240px] h-[230px] sm:h-[260px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shrink-0">
              <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
                ภาพถ่ายหน้าตรง
              </div>
              {agent.profile_image ? (
                <Image
                  src={agent.profile_image}
                  alt="Profile Selfie"
                  fill
                  sizes="240px"
                  className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                  <UserCheck className="w-8 h-8 mb-1.5 text-slate-300" />
                  <span className="text-xs font-medium text-slate-400">ไม่มีภาพหน้าตรง</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer Actions */}
        {activeTab === 'pending' && (
          <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-bold text-amber-800">
                รอการตรวจสอบเอกสารเพื่ออนุมัติสิทธิ์นายหน้า
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onDeleteAgent && (
                <button
                  onClick={() => onDeleteAgent(agent.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ลบบัญชี</span>
                </button>
              )}

              {/* Reject Button (Opens Modal) */}
              <button
                onClick={() => setIsRejectModalOpen(true)}
                className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-700 hover:text-rose-700 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>ปฏิเสธเอกสาร</span>
              </button>

              {/* Approve Button */}
              <button
                onClick={() => onUpdateStatus(agent.id, 'approved')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-white" />
                <span>อนุมัติเป็นนายหน้า</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------------
       * KYC REJECTION MODAL WITH REASON & NOTES
       * ------------------------------------------------------------------------------ */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-red-600 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>ระบุเหตุผลการปฏิเสธเอกสาร KYC</span>
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Agent Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <p className="font-bold text-slate-400 uppercase">นายหน้าที่ถูกปฏิเสธ:</p>
              <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                {agent.first_name} {agent.last_name} ({agent.email})
              </p>
            </div>

            {/* Presets List */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">
                เลือกเหตุผลในการปฏิเสธ (ระบบจะส่งแจ้งเตือนให้นายหน้าทราบ):
              </label>

              {KYC_REJECT_PRESETS.map((preset, idx) => (
                <label
                  key={idx}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition cursor-pointer text-xs font-semibold ${
                    selectedReason === preset
                      ? 'bg-red-50 text-red-800 border-red-200 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name={`kycRejectReason-${agent.id}`}
                    value={preset}
                    checked={selectedReason === preset}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="accent-red-600"
                  />
                  <span>{preset}</span>
                </label>
              ))}
            </div>

            {/* Additional Custom Note */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                คำแนะนำเพิ่มเติมให้นายหน้า (ถ้ามี):
              </label>
              <textarea
                rows={2}
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="เช่น กรุณาถ่ายบัตรบนพื้นหลังสีขาว หรือเปิดแฟลชเพื่อให้อ่านเลขบัตรได้ชัดเจน..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
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
    </>
  );
}
