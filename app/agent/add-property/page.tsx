'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ImageUploader from '@/components/property/ImageUploader';

export default function AgentAddPropertyPage() {
  const router = useRouter();

  // === Form State (สั้น กระชับ เป็นระเบียบ) ===
  const [f, setF] = useState({
    title: '', typeId: '1', listingType: 'ขาย', description: '',
    price: '', commonFee: '', bedrooms: '3', bathrooms: '2', parking: '1', floors: '1',
    landArea: '', usableArea: '', ownership: 'ขายขาด (Freehold)',
    provinceId: '', amphureId: '', address: '',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    doc: ''
  });

  const [provinces, setProvinces] = useState<{ id: number; name_th: string }[]>([]);
  const [amphures, setAmphures] = useState<{ id: number; name_th: string }[]>([]);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [docFileName, setDocFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/locations?type=provinces').then(r => r.json()).then(d => Array.isArray(d) && setProvinces(d));
  }, []);

  const handleProvince = (pId: string) => {
    setF(prev => ({ ...prev, provinceId: pId, amphureId: '' }));
    if (pId) fetch(`/api/locations?type=amphures&provinceId=${pId}`).then(r => r.json()).then(d => Array.isArray(d) && setAmphures(d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title || !f.price || !f.provinceId || !f.amphureId) return alert('กรุณากรอกข้อมูลสำคัญ (*) ให้ครบถ้วน');
    if (!agreed1 || !agreed2) return alert('กรุณากดยินยอมเงื่อนไขการลงประกาศ');

    setLoading(true);
    const prov = provinces.find(p => String(p.id) === String(f.provinceId))?.name_th || '';
    const amp = amphures.find(a => String(a.id) === String(f.amphureId))?.name_th || '';

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: f.title, type_id: parseInt(f.typeId), price: parseFloat(f.price) || 0,
          location: `${f.address ? f.address + ', ' : ''}${amp}, ${prov}`,
          province_id: parseInt(f.provinceId), amphure_id: parseInt(f.amphureId), district_id: parseInt(f.amphureId) * 10 + 1,
          description: f.description, bedrooms: parseInt(f.bedrooms), bathrooms: parseInt(f.bathrooms),
          area_sqm: parseFloat(f.usableArea) || parseFloat(f.landArea) || 120,
          images: uploadedImages.length > 0 ? uploadedImages : [f.image]
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('ส่งคำขอลงประกาศเรียบร้อยแล้ว! รอการอนุมัติจากแอดมิน');
        router.push('/agent/home');
      } else alert(data.error || 'เกิดข้อผิดพลาด');
    } catch { alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'); }
    finally { setLoading(false); }
  };

  return (
    <div className="font-sans text-slate-800 text-xs antialiased flex flex-col">

      {/* Hero Banner Header */}
      <div className="pt-20 bg-[#090D16] text-white py-10 px-4 text-center">
        <h1 className="text-xl sm:text-2xl font-black">ลงประกาศอสังหาริมทรัพย์</h1>
        <p className="text-slate-400 text-[10px] mt-1">เพิ่มข้อมูลอสังหาริมทรัพย์ของคุณเพื่อเปิดรับผู้ซื้อ และลงประกาศในระบบ ตรวจสอบความถูกต้องเพื่อความปลอดภัยของลูกค้าคุณ</p>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6 flex-grow w-full mb-16">
        
        {/* Circle Back Button */}
        <div>
          <Link href="/agent/home" className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 transition">
            ←
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Card 1: ข้อมูลทั่วไป */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">1</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ข้อมูลทั่วไปของประกาศ</h2>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">หัวข้อประกาศ (Listing Title) <span className="text-red-500">*</span></label>
              <input type="text" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="เช่น ขายด่วน! บ้านเดี่ยวหลังมุม โครงการศิรินทรา หาดใหญ่..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white focus:border-blue-500 font-medium text-xs" required />
              <p className="text-[9px] text-slate-400 mt-1">แนะนำ 30-80 ตัวอักษร ชัดเจนและดึงดูดสายตาผู้ซื้อ</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ประเภทอสังหาฯ <span className="text-red-500">*</span></label>
                <select value={f.typeId} onChange={e => setF({ ...f, typeId: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="1">บ้านเดี่ยว</option>
                  <option value="2">ทาวน์โฮม</option>
                  <option value="3">คอนโดมิเนียม</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">ประเภทการลงประกาศ <span className="text-red-500">*</span></label>
                <select value={f.listingType} onChange={e => setF({ ...f, listingType: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="ขาย">ขาย</option>
                  <option value="เช่า">ให้เช่า</option>
                  <option value="ขายดาวน์">ขายดาวน์</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">รายละเอียดแบบเต็ม <span className="text-red-500">*</span></label>
              <textarea rows={4} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="อธิบายสภาพบ้าน การตกแต่ง เครื่องใช้ไฟฟ้า เฟอร์นิเจอร์ หรือสถานที่ใกล้เคียง..." className="w-full p-2.5 bg-slate-50 border rounded-xl outline-none focus:bg-white font-medium text-xs" required />
            </div>
          </div>

          {/* Card 2: ราคา & สเปค */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">2</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ราคาและรายละเอียดเชิงลึก</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ราคา (บาท) <span className="text-red-500">*</span></label>
                <input type="number" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="฿ 0" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">ค่าส่วนกลาง (บาท / เดือน)</label>
                <input type="number" value={f.commonFee} onChange={e => setF({ ...f, commonFee: e.target.value })} placeholder="฿ 0 (ถ้าไม่มีใส่ 0)" className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border text-center">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">🛏️ ห้องนอน</label>
                <input type="number" value={f.bedrooms} onChange={e => setF({ ...f, bedrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">🚿 ห้องน้ำ</label>
                <input type="number" value={f.bathrooms} onChange={e => setF({ ...f, bathrooms: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">🚗 ที่จอดรถ</label>
                <input type="number" value={f.parking} onChange={e => setF({ ...f, parking: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 mb-1">🏢 จำนวนชั้น</label>
                <input type="number" value={f.floors} onChange={e => setF({ ...f, floors: e.target.value })} className="w-full bg-white border rounded-lg p-1.5 text-center font-bold text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">ขนาดที่ดิน (ตร.ว.)</label>
                <input type="number" value={f.landArea} onChange={e => setF({ ...f, landArea: e.target.value })} placeholder="ระบุตัวเลข" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">พื้นที่ใช้สอย (ตร.ม.)</label>
                <input type="number" value={f.usableArea} onChange={e => setF({ ...f, usableArea: e.target.value })} placeholder="ระบุตัวเลข" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" />
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">สิทธิ์การถือครอง <span className="text-red-500">*</span></label>
                <select value={f.ownership} onChange={e => setF({ ...f, ownership: e.target.value })} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs">
                  <option value="ขายขาด (Freehold)">ขายขาด (Freehold)</option>
                  <option value="เช่าระยะยาว (Leasehold)">เช่าระยะยาว (Leasehold)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: ทำเลที่ตั้ง */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">3</span>
              <h2 className="font-extrabold text-slate-900 text-xs">ทำเลที่ตั้ง</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold mb-1 text-slate-700">จังหวัด <span className="text-red-500">*</span></label>
                <select value={f.provinceId} onChange={e => handleProvince(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required>
                  <option value="">เลือกจังหวัด</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1 text-slate-700">อำเภอ / เขต <span className="text-red-500">*</span></label>
                <select value={f.amphureId} onChange={e => setF({ ...f, amphureId: e.target.value })} disabled={!f.provinceId} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold text-xs" required>
                  <option value="">เลือกอำเภอ</option>
                  {amphures.map(a => <option key={a.id} value={a.id}>{a.name_th}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1 text-slate-700">ที่อยู่/รายละเอียด (หมู่บ้าน, ถนน, ซอย) <span className="text-red-500">*</span></label>
              <input type="text" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="เช่น 123/45 ซ.ปุณณกัณฑ์ 10 ถ.ปุณณกัณฑ์" className="w-full p-2.5 bg-slate-50 border rounded-xl font-medium text-xs" required />
            </div>

            {/* Interactive Map Box */}
            <div className="relative bg-slate-100 rounded-2xl h-44 border flex items-center justify-center overflow-hidden">
              <iframe title="Map" src="https://www.openstreetmap.org/export/embed.html?bbox=100.47%2C7.00%2C100.49%2C7.02&layer=mapnik&marker=7.0089%2C100.4812" className="w-full h-full border-0 pointer-events-none" />
              <div className="absolute bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl border shadow flex items-center gap-2">
                <span className="text-blue-600 font-bold">📍</span>
                <span className="font-extrabold text-[10px] text-slate-800">คลิกเพื่อเลือกตำแหน่งบนแผนที่</span>
              </div>
            </div>
          </div>

          {/* Card 4: สื่อประกอบ & เอกสารสิทธิ์ */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center text-[11px]">4</span>
              <h2 className="font-extrabold text-slate-900 text-xs">สื่อประกอบและเอกสารสิทธิ์</h2>
            </div>

            <ImageUploader 
              uploadedImages={uploadedImages} 
              setUploadedImages={setUploadedImages} 
            />

            {/* PDPA Warning Alert */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-amber-800">⚠️ คำเตือนข้อมูลส่วนบุคคล (PDPA)</div>
              <p className="leading-relaxed">เอกสารนี้ใช้สำหรับให้ทีมงานตรวจสอบความถูกต้องเท่านั้น <span className="font-bold underline">จะไม่ถูกแสดงสู่สาธารณะ</span> กรุณาปิดซ่อนเลขบัตรประชาชนในเอกสารก่อนอัปโหลด</p>
              <div className="pt-1 flex items-center gap-2">
                <input 
                  type="file" 
                  id="doc-file-input"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const res = await fetch('/api/upload', { method: 'POST', body: formData });
                      const data = await res.json();
                      if (data.success) setDocFileName(file.name);
                    } catch (err) { console.error(err); }
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => document.getElementById('doc-file-input')?.click()}
                  className="px-2.5 py-1 bg-white border rounded font-bold text-[10px] text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  Choose File
                </button>
                <span className="text-slate-500 text-[9px] font-bold truncate max-w-[200px]">
                  {docFileName ? `✓ ${docFileName}` : 'No file chosen'}
                </span>
              </div>
            </div>
          </div>

          {/* Consents & Action Buttons */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-2 cursor-pointer text-[10px] text-slate-600">
              <input type="checkbox" checked={agreed1} onChange={e => setAgreed1(e.target.checked)} className="mt-0.5" required />
              <span>ข้าพเจ้ายืนยันว่าข้อมูลและรูปภาพที่ใช้ลงประกาศเป็นความจริงทุกประการ และข้าพเจ้ามีสิทธิ์โดยชอบธรรมในการลงประกาศ</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer text-[10px] text-slate-600">
              <input type="checkbox" checked={agreed2} onChange={e => setAgreed2(e.target.checked)} className="mt-0.5" required />
              <span>ข้าพเจ้ายินยอมให้ Srichai Property ประมวลผลข้อมูลอสังหาริมทรัพย์ตาม <Link href="#" className="text-blue-600 underline">Privacy Policy</Link></span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Link href="/agent/home" className="px-5 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-600">ยกเลิก</Link>
              <button type="submit" disabled={loading} className="px-6 py-2.5 bg-blue-600 text-white font-extrabold rounded-xl hover:bg-blue-700 transition shadow-md">
                {loading ? 'กำลังบันทึก...' : 'ส่งคำขอลงประกาศ ➔'}
              </button>
            </div>
          </div>

        </form>
      </main>
    </div>
  );
}
