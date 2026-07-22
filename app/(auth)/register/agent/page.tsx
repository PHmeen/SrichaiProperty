'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import AgentRegisterBanner from './components/AgentRegisterBanner';
import OtpVerificationModal from './components/OtpVerificationModal';

export default function AgentRegisterPage() {
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  
  // ฟอร์มสเตต
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [lineId, setLineId] = useState('');
  const [experience, setExperience] = useState('');
  const [zone, setZone] = useState('');
  const [propertyType, setPropertyType] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // สเตตข้อมูลภูมิศาสตร์จริงจากฐานข้อมูล
  const [provinces, setProvinces] = useState<{ id: number; name_th: string }[]>([]);
  const [amphures, setAmphures] = useState<{ id: number; name_th: string }[]>([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState('');

  // โหลดรายชื่อจังหวัดทั้งหมดเมื่อเข้าสู่หน้าเว็บครั้งแรก
  useEffect(() => {
    fetch('/api/locations?type=provinces')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProvinces(data);
        }
      })
      .catch(err => console.error("Error fetching provinces:", err));
  }, []);

  // เมื่อเลือกจังหวัด ให้ไปดึงรายชื่ออำเภอ/เขตของจังหวัดนั้นมาแสดงผล
  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvinceId(provinceId);
    setZone(''); // รีเซ็ตอำเภอที่เลือก
    setAmphures([]);

    if (provinceId) {
      fetch(`/api/locations?type=amphures&provinceId=${provinceId}`)

        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAmphures(data);
          }
        })
        .catch(err => console.error("Error fetching amphures:", err));
    }
  };


  const [profileImage, setProfileImage] = useState('');
  const [kycDoc, setKycDoc] = useState('');
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isUploadingKyc, setIsUploadingKyc] = useState(false);

  // ฟังก์ชันอัปโหลดไฟล์จริงไปหลังบ้าน
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'kyc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'profile') {
      setIsUploadingProfile(true);
    } else {
      setIsUploadingKyc(true);
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'profile') {
          setProfileImage(data.url);
        } else {
          setKycDoc(data.url);
        }
      } else {
        alert(data.error || 'อัปโหลดไฟล์ล้มเหลว');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      if (type === 'profile') {
        setIsUploadingProfile(false);
      } else {
        setIsUploadingKyc(false);
      }
    }
  };

  const verifyOtp = async () => {
    const fullName = `${firstName} ${lastName}`.trim();
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, phone, role: 'agent', lineId, experience, zone, propertyType, profileImage, kycDoc }),
      });

      const data = await response.json();


      if (!response.ok) {
        alert(data.error || "การสมัครสมาชิกไม่สำเร็จ");
        setShowOtpModal(false);
        return;
      }

      // เข้าสู่ระบบอัตโนมัติ
      const loginRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (loginRes?.error) {
        alert("สมัครสมาชิกนายหน้าสำเร็จเรียบร้อย! กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ");
        window.location.href = '/login/agent';
      } else {
        alert("สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!");
        window.location.href = '/agent/dashboard';
      }
    } catch {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลังบ้านเพื่อสมัครสมาชิกได้");
    }
    setShowOtpModal(false);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }
    if (!agreed) {
      alert("กรุณากดยอมรับเงื่อนไขการเป็นนายหน้า");
      return;
    }
    setShowOtpModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white text-slate-800 antialiased">
      <AgentRegisterBanner />

      {/* Right Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 md:p-16 min-h-screen bg-white">
        {/* Top bar with back button */}
        <div className="flex justify-between items-center w-full mb-8">
          <Link 
            href="/login/agent" 
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 transition text-slate-600 font-medium text-xs shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[540px] mx-auto my-auto py-8">

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">สมัครเป็นพาร์ทเนอร์</h2>
            <p className="text-slate-500 text-xs font-medium">กรอกข้อมูลด้านล่างเพื่อสร้างบัญชีตัวแทนนายหน้าของคุณ ทีมงานจะทำการตรวจสอบและอนุมัติภายใน 24 ชั่วโมง</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* Step 1: Personal Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">1</span>
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">ข้อมูลส่วนบุคคล</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">ชื่อจริง</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="ชื่อจริงของคุณ" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">นามสกุล</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="นามสกุลของคุณ" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">เบอร์โทรศัพท์</label>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08X-XXX-XXXX" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">LINE ID</label>
                  <input 
                    type="text" 
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    placeholder="ไอดีไลน์สำหรับติดต่อลูกค้า" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Professional Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">2</span>
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">ข้อมูลวิชาชีพนายหน้า</h3>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">ประสบการณ์การเป็นนายหน้า</label>
                <select 
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-500 text-xs cursor-pointer"
                >
                  <option value="">เลือกประสบการณ์ของคุณ</option>
                  <option value="none">ไม่มีประสบการณ์ (พร้อมรับการฝึกอบรม)</option>
                  <option value="1-3">1 - 3 ปี</option>
                  <option value="3-5">3 - 5 ปี</option>
                  <option value="5+">มากกว่า 5 ปี</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">จังหวัดหลักที่เชี่ยวชาญ</label>
                  <select 
                    value={selectedProvinceId}
                    onChange={(e) => handleProvinceChange(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-500 text-xs cursor-pointer"
                  >
                    <option value="">เลือกจังหวัด</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.id}>{p.name_th}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">อำเภอ/เขตหลักที่เชี่ยวชาญ</label>
                  <select 
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-500 text-xs cursor-pointer"
                    disabled={!selectedProvinceId}
                  >
                    <option value="">เลือกอำเภอ/เขต</option>
                    {amphures.map(a => (
                      <option key={a.id} value={a.name_th}>{a.name_th}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">ประเภททรัพย์ที่ถนัด</label>
                <select 
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-500 text-xs cursor-pointer"
                >
                  <option value="">เลือกประเภท</option>
                  <option value="บ้านเดี่ยว">บ้านเดี่ยว / บ้านแฝด</option>
                  <option value="ทาวน์โฮม">ทาวน์โฮม</option>
                  <option value="คอนโดมิเนียม">คอนโดมิเนียม</option>
                </select>
              </div>
            </div>


            {/* Step 3: Account & KYC */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">3</span>
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">บัญชีและเอกสารยืนยัน</h3>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">อีเมล (ใช้สำหรับเข้าสู่ระบบ)</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@email.com" 
                  className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                  required 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">รหัสผ่าน</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-1.5 ml-0.5">ยืนยันรหัสผ่าน</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง" 
                    className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 focus:bg-white outline-none transition-all font-medium text-slate-800 text-xs" 
                    required 
                  />
                </div>
              </div>

              {/* Mockup Upload Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-wider">รูปโปรไฟล์ (Profile Picture)</label>
                  <input 
                    type="file" 
                    id="profile-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'profile')}
                  />
                  <div 
                    onClick={() => document.getElementById('profile-upload')?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
                  >
                    {isUploadingProfile ? (
                      <div className="text-xs text-slate-500 animate-pulse">กำลังอัปโหลด...</div>
                    ) : profileImage ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <Image src={profileImage} alt="Profile Preview" width={48} height={48} className="w-12 h-12 rounded-full object-cover border border-slate-200" unoptimized />
                        <span className="text-[9px] font-semibold text-emerald-600">✓ อัปโหลดสำเร็จ</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl text-slate-400">🖼️</span>
                        <span className="text-[10px] font-bold text-slate-500">คลิกเพื่ออัปโหลดรูปภาพ</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-2 uppercase tracking-wider">สำเนาบัตรประชาชน / นามบัตร</label>
                  <input 
                    type="file" 
                    id="kyc-upload" 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'kyc')}
                  />
                  <div 
                    onClick={() => document.getElementById('kyc-upload')?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center gap-2 min-h-[110px]"
                  >
                    {isUploadingKyc ? (
                      <div className="text-xs text-slate-500 animate-pulse">กำลังอัปโหลด...</div>
                    ) : kycDoc ? (
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-2xl text-emerald-500">📄</span>
                        <span className="text-[9px] font-semibold text-emerald-600 truncate max-w-[150px]">✓ อัปโหลดไฟล์เรียบร้อย</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl text-slate-400">📄</span>
                        <span className="text-[10px] font-bold text-slate-500">คลิกเพื่ออัปโหลดไฟล์ KYC</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>


            {/* Consent Box */}
            <div className="bg-amber-50/70 border border-amber-200/50 p-4 rounded-xl flex items-start gap-3">
              <input 
                type="checkbox" 
                id="agreed-check"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500 accent-amber-500 cursor-pointer"
                required
              />
              <label htmlFor="agreed-check" className="text-[10px] text-amber-800 leading-relaxed font-medium select-none cursor-pointer">
                ข้าพเจ้าขอยืนยันว่าข้อมูลข้างต้นเป็นความจริงทุกประการ และยอมรับ ข้อตกลงและเงื่อนไขการเป็นนายหน้า รวมถึงนโยบายความเป็นส่วนตัว ของ Srichai Property (ข้อมูลและเอกสารบุคคลของท่านจะถูกเก็บด้วยความปลอดภัยสูงสุดตามกฎหมาย PDPA ใช้เพื่อการยืนยันตัวตนเท่านั้น และจะไม่ถูกเปิดเผยต่อสาธารณะ)
              </label>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="w-full bg-[#0d1527] hover:bg-[#16223d] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              ส่งคำขอสมัครตัวแทน
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <OtpVerificationModal 
        show={showOtpModal} 
        onClose={() => setShowOtpModal(false)} 
        otpValues={otpValues} 
        onOtpChange={handleOtpChange} 
        onVerify={verifyOtp} 
      />
    </div>
  );
}

