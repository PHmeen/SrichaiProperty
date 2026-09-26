'use client';

/**
 * ==============================================================================
 * หน้าจัดการตรวจสอบอนุมัติประกาศอสังหาริมทรัพย์สำหรับแอดมิน (Admin Moderation Page)
 * /app/admin/(dashboard)/moderation/page.tsx
 * ==============================================================================
 * ยกระดับสู่มาตรฐานระดับสากล (PropTech Enterprise Standard):
 * 1. Advanced Filters: กรองตามประเภทอสังหาฯ, ช่วงราคา, สถานะนายหน้า (PRO/ทั่วไป), จังหวัด/ทำเล
 * 2. Quick Preview Drawer: แถบข้างสไลด์โชว์รูปภาพทุกรูป, แผนที่ปักหมุด, โฉนด/เอกสาร, สิ่งอำนวยความสะดวก
 * 3. Batch Actions: ติ๊กเลือกหลายประกาศเพื่อ "อนุมัติทั้งหมดในคลิกเดียว" พร้อม Floating Action Bar
 * 4. Reject Reason Presets: ชิปเทมเพลตเหตุผลตีกลับสำเร็จรูปที่แก้ไขข้อความได้อิสระ
 * 5. ส่งออกไฟล์รายงาน CSV และระบบ SLA ติดตามผลการทำงานจริง
 * ==============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { toast } from '@/components/ui/toast';
import QuickPreviewDrawer, { QuickPreviewProperty } from '@/components/admin/QuickPreviewDrawer';
import {
  Search,
  Home,
  Camera,
  MapPin,
  Square,
  Bed,
  Bath,
  Eye,
  X,
  Check,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

export type PropertyData = QuickPreviewProperty;

interface SlaSummary {
  reviewedCount: number;
  averageLabel: string;
  withinSlaCount: number;
  withinSlaPercent: number;
}

// ชุดเทมเพลตเหตุผลตีกลับมาตรฐานสากล
const REJECT_PRESETS = [
  'รูปถ่ายไม่ชัดเจน มีลายน้ำจากเว็บไซต์อื่น หรือมีเบอร์โทรบดบังภาพหลัก',
  'ราคาไม่สมเหตุสมผล หรือระบุหลักตัวเลขผิดพลาด (เช่น ใส่หลักพันแทนหลักล้าน)',
  'ตำแหน่งพิกัดแผนที่ไม่ตรงกับที่ตั้งจริงของอสังหาริมทรัพย์',
  'เอกสารสิทธิ์หรือโฉนดไม่ตรงกับชื่อผู้ลงประกาศ หรือข้อมูลไม่ครบถ้วน',
  'คำบรรยายมีข้อความสแปม โฆษณาซ้ำซ้อน หรือละเมิดข้อกำหนดการใช้งาน',
  'ข้อมูลรายละเอียดทรัพย์ เช่น ขนาดพื้นที่/ห้องนอน/ห้องน้ำ ไม่ตรงกับความเป็นจริง',
];

export default function AdminModerationPage() {
  // ------------------------------------------------------------------------------
  // 1. STATE MANAGEMENT
  // ------------------------------------------------------------------------------
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [slaSummary, setSlaSummary] = useState<SlaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tabs & Primary Filters
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [listingTypeFilter, setListingTypeFilter] = useState<'all' | 'sale' | 'rent'>('all');
  const [sortBySla, setSortBySla] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<'all' | 'under_3m' | '3m_10m' | 'over_10m'>('all');
  const [agentTierFilter, setAgentTierFilter] = useState<'all' | 'pro' | 'basic'>('all');
  const [provinceFilter, setProvinceFilter] = useState('all');

  // Quick Preview Drawer State
  const [previewProperty, setPreviewProperty] = useState<PropertyData | null>(null);

  // Batch Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchApproving, setIsBatchApproving] = useState(false);

  // Reject Modal State
  const [rejectingProperty, setRejectingProperty] = useState<PropertyData | null>(null);
  const [rejectReason, setRejectReason] = useState(REJECT_PRESETS[0]);
  const [submittingReject, setSubmittingReject] = useState(false);

  // ------------------------------------------------------------------------------
  // 2. DATA FETCHING
  // ------------------------------------------------------------------------------
  const fetchProperties = (status: string, listingType: string) => {
    const query = listingType === 'all' ? '' : `&listingType=${listingType}`;
    fetch(`/api/admin/moderation?status=${status}${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProperties(data.properties || []);
          setSlaSummary(data.slaSummary ?? null);
        }
      })
      .catch(err => {
        console.error("เกิดข้อผิดพลาดในการโหลดคิวประกาศ:", err);
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    fetchProperties(activeTab, listingTypeFilter);
  }, [activeTab, listingTypeFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProperties(activeTab, listingTypeFilter);
  };

  // Distinct Lists for Dynamic Filter Dropdowns
  const distinctPropertyTypes = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.type) set.add(p.type);
    });
    return Array.from(set);
  }, [properties]);

  const distinctProvinces = useMemo(() => {
    const set = new Set<string>();
    properties.forEach(p => {
      if (p.province) set.add(p.province);
    });
    return Array.from(set);
  }, [properties]);

  // Filtered Properties Pipeline
  const displayedProperties = useMemo(() => {
    let list = properties;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.agentName || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    }

    // Property Type Filter
    if (propertyTypeFilter !== 'all') {
      list = list.filter(p => p.type === propertyTypeFilter);
    }

    // Price Range Filter
    if (priceRangeFilter !== 'all') {
      list = list.filter(p => {
        const price = Number(p.price) || 0;
        if (priceRangeFilter === 'under_3m') return price < 3000000;
        if (priceRangeFilter === '3m_10m') return price >= 3000000 && price <= 10000000;
        if (priceRangeFilter === 'over_10m') return price > 10000000;
        return true;
      });
    }

    // Agent Tier Filter
    if (agentTierFilter !== 'all') {
      list = list.filter(p => {
        if (agentTierFilter === 'pro') return p.agentPlan === 'pro';
        if (agentTierFilter === 'basic') return p.agentPlan !== 'pro';
        return true;
      });
    }

    // Province Filter
    if (provinceFilter !== 'all') {
      list = list.filter(p => p.province === provinceFilter);
    }

    // Sort by SLA
    return sortBySla
      ? [...list].sort((a, b) => a.slaMinutesLeft - b.slaMinutesLeft)
      : list;
  }, [
    properties,
    searchQuery,
    propertyTypeFilter,
    priceRangeFilter,
    agentTierFilter,
    provinceFilter,
    sortBySla
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setPropertyTypeFilter('all');
    setPriceRangeFilter('all');
    setAgentTierFilter('all');
    setProvinceFilter('all');
    setListingTypeFilter('all');
    setSortBySla(false);
  };

  const hasActiveAdvancedFilters =
    propertyTypeFilter !== 'all' ||
    priceRangeFilter !== 'all' ||
    agentTierFilter !== 'all' ||
    provinceFilter !== 'all';

  // ------------------------------------------------------------------------------
  // 3. ACTION HANDLERS
  // ------------------------------------------------------------------------------
  const updateStatus = async (id: string, newStatus: string, reason?: string) => {
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus, ...(reason ? { reason } : {}) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("อัปเดตสถานะประกาศเรียบร้อยแล้ว");
        fetchProperties(activeTab, listingTypeFilter);
        if (previewProperty?.id === id) setPreviewProperty(null);
      } else {
        toast.error("เกิดข้อผิดพลาด: " + data.error);
      }
    } catch (err) {
      console.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ:", err);
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('ยืนยันการอนุมัติประกาศนี้เพื่อเปิดแสดงผลบนเว็บไซต์?')) return;
    await updateStatus(id, 'approved');
  };

  // Batch Selection Logic
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedProperties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedProperties.map(p => p.id)));
    }
  };

  const handleBatchApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`ยืนยันการอนุมัติประกาศทั้งหมด ${ids.length} รายการที่เลือกไว้พร้อมกัน?`)) return;

    setIsBatchApproving(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'approved' })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`อนุมัติสำเร็จ ${data.count || ids.length} รายการเรียบร้อยแล้ว`);
        setSelectedIds(new Set());
        fetchProperties(activeTab, listingTypeFilter);
      } else {
        toast.error("เกิดข้อผิดพลาด: " + (data.error || "ไม่สามารถอนุมัติได้"));
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsBatchApproving(false);
    }
  };

  // Reject Modal Handlers
  const openRejectModal = (property: PropertyData) => {
    setRejectingProperty(property);
    setRejectReason(REJECT_PRESETS[0]);
  };

  const closeRejectModal = () => {
    setRejectingProperty(null);
  };

  const confirmReject = async () => {
    if (!rejectingProperty) return;
    if (!rejectReason.trim()) {
      toast.warning('กรุณาระบุเหตุผลการปฏิเสธประกาศ');
      return;
    }

    setSubmittingReject(true);
    await updateStatus(rejectingProperty.id, 'rejected', rejectReason.trim());
    setSubmittingReject(false);
    closeRejectModal();
  };

  // CSV Export
  const handleExportCSV = () => {
    if (displayedProperties.length === 0) {
      toast.error('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const headers = ['รหัสประกาศ', 'หัวข้อ', 'ราคา', 'ประเภทธุรกรรม', 'ประเภทอสังหาฯ', 'จังหวัด', 'อำเภอ', 'ทำเล', 'นายหน้า', 'แพ็กเกจ', 'เวลาที่ลงประกาศ'];
    const rows = displayedProperties.map(p => [
      `"${p.id}"`,
      `"${p.title.replace(/"/g, '""')}"`,
      p.price,
      p.listingType === 'rent' ? 'เช่า' : 'ขาย',
      `"${p.type}"`,
      `"${p.province || ''}"`,
      `"${p.amphure || ''}"`,
      `"${p.location.replace(/"/g, '""')}"`,
      `"${p.agentName}"`,
      p.agentPlan === 'pro' ? 'Verified PRO' : 'Basic',
      `"${new Date(p.createdAt).toLocaleString('th-TH')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `srichai_moderation_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
  };

  const slaBadgeClass = (level: PropertyData['slaLevel']) => {
    if (level === 'urgent' || level === 'overdue') return 'bg-red-50 text-red-600 border-red-100';
    if (level === 'warning') return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  };

  // ------------------------------------------------------------------------------
  // 4. JSX RENDERING
  // ------------------------------------------------------------------------------
  return (
    <>
      {/* Top Header */}
      <header className="min-h-16 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 shrink-0 relative z-0">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">คิวตรวจสอบประกาศ (Listing Moderation)</h1>
          <p className="text-xs text-slate-500 font-medium">
            ระบบตรวจสอบความถูกต้อง รูปถ่าย และเอกสารสิทธิ์อสังหาริมทรัพย์ระดับพรีเมียม
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อประกาศ, ทำเล, นายหน้า..."
              className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-slate-700 text-xs shadow-xs"
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

          {/* Toggle Advanced Filters Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition border cursor-pointer shrink-0 ${
              showAdvancedFilters || hasActiveAdvancedFilters
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200'
            }`}
            title="ตัวกรองขั้นสูง"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ตัวกรอง</span>
            {hasActiveAdvancedFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200 cursor-pointer shrink-0 disabled:opacity-50"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">รีเฟรช</span>
          </button>

          {/* CSV Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition border border-slate-200 shadow-xs cursor-pointer shrink-0"
            title="ส่งออกไฟล์ CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto">
        {/* Status Tabs and Quick Sorters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl max-w-full overflow-x-auto no-scrollbar w-fit border border-slate-200">
            <button
              onClick={() => { setActiveTab('pending'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <span>รอตรวจสอบ</span>
              {activeTab === 'pending' && properties.length > 0 && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md text-[10px] font-black">
                  {properties.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('approved'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'approved'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              อนุมัติแล้ว
            </button>
            <button
              onClick={() => { setActiveTab('rejected'); setLoading(true); }}
              className={`px-5 py-2 rounded-lg font-bold transition-all text-xs whitespace-nowrap cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              ถูกระงับ/ปฏิเสธ
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <select
              value={listingTypeFilter}
              onChange={(e) => { setListingTypeFilter(e.target.value as 'all' | 'sale' | 'rent'); setLoading(true); }}
              className="bg-white border border-slate-200 text-slate-600 font-bold py-2 px-3 sm:px-4 rounded-lg text-xs hover:bg-slate-50 transition shadow-xs cursor-pointer outline-none"
            >
              <option value="all">ขาย/เช่าทั้งหมด</option>
              <option value="sale">เฉพาะขาย</option>
              <option value="rent">เฉพาะเช่า</option>
            </select>

            <button
              onClick={() => setSortBySla((prev) => !prev)}
              className={`border font-bold py-2 px-3 sm:px-4 rounded-lg text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 ${
                sortBySla
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>เรียงตาม SLA (ด่วนสุด)</span>
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------------------
         * ADVANCED FILTERS PANEL
         * ------------------------------------------------------------------------------ */}
        {showAdvancedFilters && (
          <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>ตัวกรองละเอียด (Advanced Filters)</span>
              </span>
              {hasActiveAdvancedFilters && (
                <button
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>ล้างตัวกรองทั้งหมด</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Property Type */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">ประเภทอสังหาฯ</label>
                <select
                  value={propertyTypeFilter}
                  onChange={(e) => setPropertyTypeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">ทุกประเภท</option>
                  {distinctPropertyTypes.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 2. Price Range */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">ช่วงราคา</label>
                <select
                  value={priceRangeFilter}
                  onChange={(e) => setPriceRangeFilter(e.target.value as 'all' | 'under_3m' | '3m_10m' | 'over_10m')}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">ทุกช่วงราคา</option>
                  <option value="under_3m">ต่ำกว่า 3,000,000 บาท</option>
                  <option value="3m_10m">3,000,000 – 10,000,000 บาท</option>
                  <option value="over_10m">มากกว่า 10,000,000 บาท</option>
                </select>
              </div>

              {/* 3. Agent Tier */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">สถานะนายหน้า</label>
                <select
                  value={agentTierFilter}
                  onChange={(e) => setAgentTierFilter(e.target.value as 'all' | 'pro' | 'basic')}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">นายหน้าทั้งหมด</option>
                  <option value="pro">เฉพาะ Verified PRO</option>
                  <option value="basic">นายหน้าทั่วไป (Basic)</option>
                </select>
              </div>

              {/* 4. Province */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">จังหวัด / ทำเล</label>
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all">ทุกจังหวัด</option>
                  {distinctProvinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* SLA Summary Performance Card */}
        {activeTab !== 'pending' && slaSummary && slaSummary.reviewedCount > 0 && (
          <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ตรวจแล้วในชุดนี้</p>
              <p className="text-xl font-black text-slate-900">{slaSummary.reviewedCount} ประกาศ</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เวลาเฉลี่ยที่ใช้ตรวจ</p>
              <p className="text-xl font-black text-blue-600">{slaSummary.averageLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ตรวจทันกำหนด</p>
              <p className={`text-xl font-black ${slaSummary.withinSlaPercent >= 90 ? 'text-emerald-600' : slaSummary.withinSlaPercent >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                {slaSummary.withinSlaPercent}%
                <span className="text-xs font-bold text-slate-400 ml-1.5">({slaSummary.withinSlaCount}/{slaSummary.reviewedCount})</span>
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-400 ml-auto max-w-xs leading-relaxed">
              คำนวณจากบันทึกเวลาจริงของประกาศที่ผ่านการตรวจสอบแล้ว
            </p>
          </div>
        )}

        {/* Batch Select All Toolbar for Pending tab */}
        {activeTab === 'pending' && displayedProperties.length > 0 && (
          <div className="mb-4 px-3 py-2 bg-slate-100/70 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && selectedIds.size === displayedProperties.length}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
              <span>เลือกทั้งหมด ({displayedProperties.length} รายการ)</span>
            </label>

            {selectedIds.size > 0 && (
              <span className="font-extrabold text-blue-600">
                เลือกแล้ว {selectedIds.size} รายการ
              </span>
            )}
          </div>
        )}

        {/* Content Listing */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-500 font-bold">กำลังโหลดคิวประกาศ...</p>
          </div>
        ) : displayedProperties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <Home className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h2 className="text-lg font-bold text-slate-700 mb-1">ไม่พบรายการประกาศ</h2>
            <p className="text-slate-500 font-medium text-xs">ไม่มีประกาศที่ตรงกับตัวกรองที่คุณเลือกในขณะนี้</p>
            {hasActiveAdvancedFilters && (
              <button
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 font-bold text-xs rounded-xl hover:bg-blue-100 transition cursor-pointer"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedProperties.map((property) => {
              const isSelected = selectedIds.has(property.id);

              return (
                <div
                  key={property.id}
                  className={`bg-white rounded-2xl border shadow-xs overflow-hidden flex flex-col hover:shadow-md transition-all ${
                    isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex">
                    {/* Left Accent Bar */}
                    <div
                      className={`w-1.5 shrink-0 ${
                        activeTab === 'pending'
                          ? property.slaUrgent
                            ? 'bg-red-500'
                            : 'bg-amber-500'
                          : activeTab === 'approved'
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />

                    <div className="flex-1 p-5 flex flex-col xl:flex-row gap-5">
                      {/* Left: Checkbox + Photo Preview */}
                      <div className="xl:w-[260px] shrink-0 space-y-2">
                        <div className="relative h-44 rounded-xl overflow-hidden bg-slate-100 group border border-slate-200 flex items-center justify-center">
                          {/* Checkbox (in pending tab) */}
                          {activeTab === 'pending' && (
                            <div className="absolute top-2.5 left-2.5 z-20">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(property.id)}
                                className="w-5 h-5 rounded-md text-blue-600 bg-white/90 border-slate-300 accent-blue-600 cursor-pointer shadow-md"
                              />
                            </div>
                          )}

                          {property.image ? (
                            <Image
                              src={property.image}
                              alt={property.title}
                              width={260}
                              height={176}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                              onClick={() => setPreviewProperty(property)}
                            />
                          ) : (
                            <div
                              onClick={() => setPreviewProperty(property)}
                              className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100 font-bold text-xs gap-1 cursor-pointer"
                            >
                              <Camera className="w-8 h-8 text-slate-300 mb-1" />
                              <span>ไม่มีรูปภาพแนบ</span>
                            </div>
                          )}

                          {property.imageCount > 0 && (
                            <button
                              onClick={() => setPreviewProperty(property)}
                              className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-md z-10 flex items-center gap-1 hover:bg-blue-600 transition"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{property.imageCount} รูป</span>
                            </button>
                          )}
                        </div>

                        {/* Sub thumbnails preview */}
                        {property.images && property.images.length > 1 && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {property.images.slice(1, 3).map((subImg, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewProperty(property)}
                                className="h-14 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer relative"
                              >
                                <Image
                                  src={subImg}
                                  alt={`thumb-${idx}`}
                                  fill
                                  sizes="80px"
                                  className="object-cover opacity-80 hover:opacity-100 transition"
                                />
                              </div>
                            ))}
                            {property.imageCount > 3 && (
                              <button
                                onClick={() => setPreviewProperty(property)}
                                className="h-14 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-200 transition cursor-pointer"
                              >
                                +{property.imageCount - 3} รูป
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Property Details & Actions */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          {/* Badges Bar */}
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-blue-100">
                                {property.type || 'HOUSE'}
                              </span>
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border ${
                                  property.listingType === 'rent'
                                    ? 'bg-violet-50 text-violet-700 border-violet-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                }`}
                              >
                                {property.listingType === 'rent' ? 'ให้เช่า (Rent)' : 'ขาย (Sale)'}
                              </span>
                              {property.documents && property.documents.length > 0 && (
                                <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>มีโฉนด/เอกสาร</span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">
                                ID: {property.id.slice(0, 8)}
                              </span>

                              {/* SLA Badge in pending */}
                              {activeTab === 'pending' && (
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${slaBadgeClass(
                                    property.slaLevel
                                  )}`}
                                >
                                  <Clock className="w-3 h-3" />
                                  SLA: {property.slaLabel}
                                </span>
                              )}

                              {/* Review Audit in approved/rejected */}
                              {activeTab !== 'pending' && property.reviewerName && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  ตรวจโดย {property.reviewerName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title & Price */}
                          <h2
                            onClick={() => setPreviewProperty(property)}
                            className="text-base font-extrabold text-slate-900 leading-snug mb-1 hover:text-blue-600 transition cursor-pointer"
                          >
                            {property.title}
                          </h2>

                          <p className="text-xl font-black text-blue-600 mb-3">
                            ฿ {Number(property.price).toLocaleString()}
                            {property.listingType === 'rent' && (
                              <span className="text-xs text-slate-400 font-semibold ml-1">/ เดือน</span>
                            )}
                          </p>

                          {/* Specs */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-500 mb-4">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-rose-500" />
                              <span className="truncate max-w-xs">{property.location}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Square className="w-3.5 h-3.5 text-slate-400" />
                              <span>{property.area} ตร.ม.</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-slate-400" />
                              <span>{property.bedrooms} นอน</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="w-3.5 h-3.5 text-slate-400" />
                              <span>{property.bathrooms} น้ำ</span>
                            </span>
                          </div>
                        </div>

                        {/* Footer: Agent profile and Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3 mt-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs border border-blue-200 shrink-0">
                              {property.agentName ? property.agentName.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-slate-800 text-xs">{property.agentName}</p>
                                {property.agentPlan === 'pro' && (
                                  <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                    PRO
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">
                                ส่งเมื่อ {new Date(property.createdAt).toLocaleDateString('th-TH')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Quick Preview Drawer Trigger */}
                            <button
                              onClick={() => setPreviewProperty(property)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูพรีวิวแบบละเอียด</span>
                            </button>

                            {/* Pending Tab Actions */}
                            {activeTab === 'pending' && (
                              <>
                                <button
                                  onClick={() => openRejectModal(property)}
                                  className="px-3.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ตีกลับ</span>
                                </button>
                                <button
                                  onClick={() => handleApprove(property.id)}
                                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>อนุมัติ</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------------------
       * FLOATING BATCH ACTION BAR (ลอยขึ้นมาเมื่อมีการติ๊กเลือก ≥ 1 ประกาศ)
       * ------------------------------------------------------------------------------ */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200">
              เลือกอยู่ <strong className="text-white text-sm">{selectedIds.size}</strong> รายการ
            </span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <button
            onClick={handleBatchApprove}
            disabled={isBatchApproving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isBatchApproving ? 'กำลังอนุมัติ...' : `อนุมัติทั้งหมด (${selectedIds.size})`}</span>
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition font-medium cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------------------------
       * QUICK PREVIEW DRAWER (สไลด์จากขวา)
       * ------------------------------------------------------------------------------ */}
      <QuickPreviewDrawer
        property={previewProperty}
        isOpen={Boolean(previewProperty)}
        onClose={() => setPreviewProperty(null)}
        onApprove={activeTab === 'pending' ? handleApprove : undefined}
        onReject={activeTab === 'pending' ? openRejectModal : undefined}
      />

      {/* ------------------------------------------------------------------------------
       * REJECT REASON POP-UP MODAL (พร้อมชิปเทมเพลตเหตุผลมาตรฐาน)
       * ------------------------------------------------------------------------------ */}
      {rejectingProperty && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-red-600 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span>ระบุเหตุผลการตีกลับ / ส่งแก้ไข</span>
              </h3>
              <button
                onClick={closeRejectModal}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Property */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[11px] font-bold text-slate-400 uppercase">ประกาศที่ต้องการส่งกลับ:</p>
              <p className="text-sm font-extrabold text-slate-800 line-clamp-1">{rejectingProperty.title}</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">นายหน้า: {rejectingProperty.agentName}</p>
            </div>

            {/* Presets Chips */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-2">
                เลือกเทมเพลตเหตุผลด่วน (Reject Presets):
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {REJECT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`text-left text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
                      rejectReason === preset
                        ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea for Customized Reason */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1">
                ข้อความแจ้งเตือนนายหน้า (สามารถแก้ไขเพิ่มเติมได้):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุข้อความแนะนำสิ่งที่นายหน้าต้องแก้ไข..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-slate-800"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={closeRejectModal}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={submittingReject}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-red-600/20 transition disabled:opacity-50"
              >
                {submittingReject ? 'กำลังส่งข้อมูล...' : 'ยืนยันการส่งกลับแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
