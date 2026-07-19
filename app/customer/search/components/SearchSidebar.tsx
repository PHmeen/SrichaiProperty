'use client';

import React from 'react';

interface SearchSidebarProps {
  selectedProvince: string;
  setSelectedProvince: (val: string) => void;
  selectedAmphure: string;
  setSelectedAmphure: (val: string) => void;
  selectedDistrict: string;
  setSelectedDistrict: (val: string) => void;
  provincesList: { id: number; name_th: string; name_en: string }[];
  amphuresList: { id: number; name_th: string; name_en: string }[];
  districtsList: { id: number; name_th: string; name_en: string; zip_code: number }[];
  setAmphuresList: React.Dispatch<React.SetStateAction<{ id: number; name_th: string; name_en: string }[]>>;
  setDistrictsList: React.Dispatch<React.SetStateAction<{ id: number; name_th: string; name_en: string; zip_code: number }[]>>;
  priceMin: string;
  setPriceMin: (val: string) => void;
  priceMax: string;
  setPriceMax: (val: string) => void;
  bedrooms: string;
  setBedrooms: (val: string) => void;
  facilities: {
    pool: boolean;
    gym: boolean;
    parking: boolean;
    security: boolean;
  };
  setFacilities: React.Dispatch<React.SetStateAction<{
    pool: boolean;
    gym: boolean;
    parking: boolean;
    security: boolean;
  }>>;
  handleClearFilters: () => void;
}

export default function SearchSidebar({
  selectedProvince,
  setSelectedProvince,
  selectedAmphure,
  setSelectedAmphure,
  selectedDistrict,
  setSelectedDistrict,
  provincesList,
  amphuresList,
  districtsList,
  setAmphuresList,
  setDistrictsList,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  bedrooms,
  setBedrooms,
  facilities,
  setFacilities,
  handleClearFilters
}: SearchSidebarProps) {
  return (
    <aside className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 lg:sticky lg:top-24">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h2 className="font-extrabold text-slate-900 text-sm">ตัวกรองขั้นสูง</h2>
        <button 
          onClick={handleClearFilters}
          className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
        >
          ล้างค่า
        </button>
      </div>

      {/* ทำเลที่ตั้งแบบขั้นบันได */}
      <div className="space-y-3 pb-3 border-b border-slate-100">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ทำเลที่ตั้ง (ระบุตามเขตพื้นที่)</label>
        
        <div className="space-y-2">
          {/* เลือกจังหวัด */}
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold text-slate-500">จังหวัด</span>
            <select 
              value={selectedProvince}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProvince(val);
                setSelectedAmphure('');
                setSelectedDistrict('');
                if (!val) {
                  setAmphuresList([]);
                  setDistrictsList([]);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer"
            >
              <option value="">-- เลือกจังหวัด --</option>
              {provincesList.map(prov => (
                <option key={prov.id} value={prov.id}>{prov.name_th}</option>
              ))}
            </select>
          </div>

          {/* เลือกอำเภอ */}
          <div className="flex flex-col gap-1 text-xs">
            <span className={`font-bold ${selectedProvince ? 'text-slate-500' : 'text-slate-300'}`}>อำเภอ / เขต</span>
            <select 
              value={selectedAmphure}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAmphure(val);
                setSelectedDistrict('');
                if (!val) {
                  setDistrictsList([]);
                }
              }}
              disabled={!selectedProvince}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกอำเภอ --</option>
              {amphuresList.map(amp => (
                <option key={amp.id} value={amp.id}>{amp.name_th}</option>
              ))}
            </select>
          </div>

          {/* เลือกตำบล */}
          <div className="flex flex-col gap-1 text-xs">
            <span className={`font-bold ${selectedAmphure ? 'text-slate-500' : 'text-slate-300'}`}>ตำบล / แขวง</span>
            <select 
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedAmphure}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกตำบล --</option>
              {districtsList.map(dist => (
                <option key={dist.id} value={dist.id}>{dist.name_th}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ช่วงราคา */}
      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ช่วงราคา (บาท)</label>
        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            placeholder="ต่ำสุด" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input 
            type="number" 
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            placeholder="สูงสุด" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
          />
        </div>
      </div>

      {/* ห้องนอน */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">ห้องนอน</label>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: 'any', label: 'ไม่ระบุ' },
            { value: '1', label: '1+' },
            { value: '2', label: '2+' },
            { value: '3', label: '3+' },
            { value: '4+', label: '4+' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setBedrooms(item.value)}
              className={`px-3 py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                bedrooms === item.value 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* สิ่งอำนวยความสะดวก */}
      <div className="space-y-3">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">สิ่งอำนวยความสะดวก</label>
        <div className="space-y-2 text-xs font-bold text-slate-600">
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={facilities.pool}
              onChange={(e) => setFacilities({ ...facilities, pool: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span>🏊 สระว่ายน้ำ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={facilities.gym}
              onChange={(e) => setFacilities({ ...facilities, gym: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span>🏋️ ฟิตเนส / ยิม</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={facilities.parking}
              onChange={(e) => setFacilities({ ...facilities, parking: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span>🚗 ที่จอดรถ</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors">
            <input 
              type="checkbox" 
              checked={facilities.security}
              onChange={(e) => setFacilities({ ...facilities, security: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <span>🛡️ รักษาความปลอดภัย / CCTV</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
