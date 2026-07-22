import React from 'react';
import Image from 'next/image';

interface Props {
  uploadedImages: string[];
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function ImageUploader({ uploadedImages, setUploadedImages }: Props) {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append('file', files[i]);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) newUrls.push(data.url);
      } catch (err) { console.error(err); }
    }
    if (newUrls.length > 0) {
      setUploadedImages(prev => [...prev, ...newUrls]);
    }
  };

  return (
    <div>
      <label className="block font-bold mb-1 text-slate-700">รูปภาพประกาศ (ภาพบ้าน/คอนโด) <span className="text-red-500">*</span></label>
      <input 
        type="file" 
        id="photo-file-input"
        multiple 
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      <div 
        onClick={() => document.getElementById('photo-file-input')?.click()}
        className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/20 rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-1.5 transition"
      >
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold">⬆️</div>
        <p className="font-extrabold text-blue-700 text-xs">ลากไฟล์รูปภาพมาวางที่นี่</p>
        <p className="text-[9px] text-slate-400">หรือ <span className="underline font-bold text-blue-600">คลิกเพื่อเลือกไฟล์</span> (เลือกได้หลายรูป)</p>
      </div>

      {/* Uploaded Images Preview */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-3">
          {uploadedImages.map((url, idx) => (
            <div key={`${url}-${idx}`} className="relative aspect-[4/3] rounded-lg overflow-hidden border shadow-sm group">
              <Image src={url} alt={`Upload ${idx+1}`} fill className="object-cover" unoptimized />
              <button 
                type="button" 
                onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-slate-900/80 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px]"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
