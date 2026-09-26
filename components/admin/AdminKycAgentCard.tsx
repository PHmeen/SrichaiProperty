'use client';

/**
 * ==============================================================================
 * คอมโพเนนต์การ์ดตรวจสอบอนุมัติเอกสาร KYC นายหน้า (Admin KYC Agent Card)
 * /components/admin/AdminKycAgentCard.tsx
 * ==============================================================================
 */

import React from 'react';
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
  FileCheck
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
  onUpdateStatus: (userId: string, status: string) => void;
  onDeleteAgent?: (userId: string) => void;
}

export default function AdminKycAgentCard({ agent, activeTab, onUpdateStatus, onDeleteAgent }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-slate-300 transition">
      {/* Card Main Content */}
      <div className="flex flex-col xl:flex-row p-4 sm:p-6 gap-6">
        {/* Left: Info */}
        <div className="xl:w-1/3 flex flex-col gap-5 border-b xl:border-b-0 xl:border-r border-slate-100 pb-5 xl:pb-0 xl:pr-6">
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
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-100 shadow-sm shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-black border-2 border-white shadow-sm shrink-0">
                {agent.first_name?.[0] || 'A'}{agent.last_name?.[0] || ''}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {agent.first_name} {agent.last_name}
              </h3>
              <p className="text-slate-400 font-medium text-xs mt-0.5 truncate flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-500 shrink-0" />
                <span>ผู้ยื่นขอรับการตรวจสอบ</span>
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
              <h4 className="text-[10px] font-black text-amber-800 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>เกณฑ์การตรวจสอบ (Verification Criteria)</span>
              </h4>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span>ภาพเอกสารชัดเจน ไม่เบลอ ไม่มัว</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span>ชื่อ-นามสกุล ตรงกับข้อมูลที่กรอก</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer" />
                  <span>เอกสารบัตรประชาชนยังไม่หมดอายุ</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right: Images */}
        <div className="xl:w-2/3 flex flex-col sm:flex-row gap-4 overflow-x-auto pb-2">
          {/* KYC Doc Image */}
          <div className="relative w-full sm:min-w-[280px] sm:max-w-[360px] h-[220px] sm:h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shrink-0">
            <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
              ภาพถ่ายบัตรประชาชน
            </div>
            {agent.kyc_doc ? (
              agent.kyc_doc.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 text-center space-y-2">
                  <FileText className="w-10 h-10 text-red-500" />
                  <span className="text-xs font-bold text-slate-700">ไฟล์เอกสาร PDF</span>
                  <a
                    href={agent.kyc_doc}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1"
                  >
                    <span>เปิดดูไฟล์ PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <Image
                  src={agent.kyc_doc}
                  alt="KYC Document"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                  unoptimized
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <FileText className="w-8 h-8 mb-1.5 text-slate-300" />
                <span className="text-xs font-medium text-slate-400">ไม่มีไฟล์เอกสารแนบ</span>
              </div>
            )}
          </div>

          {/* Profile Image */}
          <div className="relative w-full sm:min-w-[180px] sm:max-w-[240px] h-[220px] sm:h-[240px] rounded-xl border border-slate-200 bg-slate-50 overflow-hidden group shrink-0">
            <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md z-10">
              ภาพถ่ายหน้าตรง
            </div>
            {agent.profile_image ? (
              <Image
                src={agent.profile_image}
                alt="Profile Selfie"
                fill
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
            <span className="text-xs font-bold text-amber-700">รอการตรวจสอบเอกสารเพื่ออนุมัติสิทธิ์นายหน้า</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onDeleteAgent && (
              <button
                onClick={() => onDeleteAgent(agent.id)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบบัญชี</span>
              </button>
            )}
            <button
              onClick={() => onUpdateStatus(agent.id, 'rejected')}
              className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition text-xs flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>ปฏิเสธ</span>
            </button>
            <button
              onClick={() => onUpdateStatus(agent.id, 'approved')}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 text-white" />
              <span>อนุมัติเป็นนายหน้า</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
