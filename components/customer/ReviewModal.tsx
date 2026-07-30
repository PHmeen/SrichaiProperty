'use client';

import React, { useState } from 'react';

interface ReviewModalProps {
  isOpen: boolean;
  appointmentId: string;
  agentName: string;
  propertyName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  isOpen,
  appointmentId,
  agentName,
  propertyName,
  onClose,
  onSuccess
}: ReviewModalProps) {
  const [ratingStars, setRatingStars] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  if (!isOpen) return null;

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          rating: ratingStars,
          comment: reviewComment
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('ขอบคุณสำหรับความคิดเห็นและการให้คะแนนบริการ!');
        onClose();
        if (onSuccess) onSuccess();
      } else {
        alert('เกิดข้อผิดพลาด: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('บันทึกรีวิวล้มเหลว');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-left">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-base text-slate-900">⭐ รีวิวและให้คะแนนการบริการ</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          ให้คะแนนการบริการของ <strong className="text-slate-800">{agentName}</strong> สำหรับการพาลูกค้าเข้าชม <strong className="text-slate-800">{propertyName}</strong>
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-extrabold text-slate-700">คะแนนความพึงพอใจ</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRatingStars(star)}
                className="text-3xl transition transform hover:scale-110 cursor-pointer"
              >
                {star <= ratingStars ? '⭐' : '☆'}
              </button>
            ))}
            <span className="text-xs font-black text-amber-600 ml-2">{ratingStars} / 5 ดาว</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-extrabold text-slate-700">ความคิดเห็นเพิ่มเติม</label>
          <textarea
            rows={3}
            value={reviewComment}
            onChange={e => setReviewComment(e.target.value)}
            placeholder="เขียนความประทับใจ การตรงต่อเวลา และการให้บริการของนายหน้า..."
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs">ยกเลิก</button>
          <button
            onClick={handleSubmitReview}
            disabled={submittingReview}
            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
          >
            {submittingReview ? 'กำลังบันทึก...' : 'ส่งรีวิว ➔'}
          </button>
        </div>
      </div>
    </div>
  );
}
