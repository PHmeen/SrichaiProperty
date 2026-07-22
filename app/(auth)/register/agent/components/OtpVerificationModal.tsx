import React from 'react';

interface Props {
  show: boolean;
  onClose: () => void;
  otpValues: string[];
  onOtpChange: (index: number, value: string) => void;
  onVerify: () => void;
}

export default function OtpVerificationModal({ show, onClose, otpValues, onOtpChange, onVerify }: Props) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative z-10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">💼</div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-1.5">ยืนยันตัวตนตัวแทน</h3>
          <p className="text-slate-500 text-xs">เราได้ส่งรหัส OTP 6 หลักไปยังเบอร์มือถือของท่าน</p>
        </div>
        <div className="flex justify-between gap-1.5 mb-5" id="otp-inputs">
          {otpValues.map((val, idx) => (
            <input 
              key={`otp-${idx}`}
              id={`otp-input-${idx}`}
              type="text" 
              maxLength={1} 
              value={val}
              onChange={(e) => onOtpChange(idx, e.target.value)}
              className="w-10 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-amber-600 bg-slate-50 focus:bg-white transition-colors outline-none text-slate-800" 
            />
          ))}
        </div>
        <button onClick={onVerify} className="w-full bg-[#0d1527] hover:bg-[#16223d] text-white font-bold py-3.5 rounded-xl transition shadow-lg cursor-pointer text-xs">ยืนยันรหัสและเป็นตัวแทน</button>
      </div>
    </div>
  );
}
