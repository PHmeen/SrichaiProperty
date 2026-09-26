'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Move
} from 'lucide-react';

interface Props {
  imageUrl: string | null;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
}

export default function KycInspectionModal({ imageUrl, isOpen = true, onClose, title }: Props) {
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust state when image changes (React official pattern: state adjustment during render)
  if (prevImageUrl !== imageUrl) {
    setPrevImageUrl(imageUrl);
    setRotation(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setRotation(0);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
      />

      {/* Main Container */}
      <div
        ref={containerRef}
        className={`relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden z-10 flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full rounded-none border-none'
            : 'w-full max-w-4xl h-[85vh]'
        }`}
      >
        {/* Top Control Bar */}
        <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 text-white flex items-center justify-between shrink-0 gap-3">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold truncate text-white">
              เครื่องมือตรวจสอบเอกสาร (Inspection Tools)
            </h2>
            <p className="text-[11px] text-slate-400 truncate">{title}</p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Rotate Button */}
            <button
              onClick={handleRotate}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
              title="หมุนภาพ 90° ตามเข็มนาฬิกา"
            >
              <RotateCw className="w-4 h-4 text-blue-400" />
              <span className="hidden md:inline">หมุน 90° ({rotation}°)</span>
            </button>

            {/* Zoom Out Button */}
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition disabled:opacity-40 cursor-pointer"
              title="ซูมออก (-25%)"
            >
              <ZoomOut className="w-4 h-4 text-slate-300" />
            </button>

            {/* Scale indicator / Reset */}
            <button
              onClick={handleReset}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition cursor-pointer"
              title="คลิกเพื่อรีเซ็ตขนาด"
            >
              {Math.round(scale * 100)}%
            </button>

            {/* Zoom In Button */}
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition disabled:opacity-40 cursor-pointer"
              title="ซูมเข้า (+25%)"
            >
              <ZoomIn className="w-4 h-4 text-blue-400" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              title={isFullscreen ? 'ย่อขนาด' : 'เต็มหน้าจอ'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-amber-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white transition cursor-pointer ml-1"
              title="ปิดหน้าต่าง (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewport Workspace */}
        <div
          className={`flex-1 relative overflow-hidden flex items-center justify-center select-none bg-slate-950 ${
            scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div
            className="transition-transform duration-100 ease-out will-change-transform flex items-center justify-center max-w-full max-h-full"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`
            }}
          >
            <Image
              src={imageUrl}
              alt={title}
              width={900}
              height={600}
              className="max-h-[70vh] w-auto h-auto object-contain rounded-lg shadow-2xl pointer-events-none"
              priority
              unoptimized
            />
          </div>

          {/* Hint Overlay when zoomed */}
          {scale > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-sm text-slate-300 text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-slate-700 pointer-events-none shadow-lg">
              <Move className="w-3.5 h-3.5 text-blue-400" />
              <span>คลิกลากเพื่อเลื่อนดูรายละเอียดตัวเลขและวันหมดอายุ</span>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-t border-slate-800 text-slate-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>หมุน: {rotation}°</span>
            <span>•</span>
            <span>ระดับการขยาย: {Math.round(scale * 100)}%</span>
          </div>

          <button
            onClick={handleReset}
            className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>คืนค่าเริ่มต้น</span>
          </button>
        </div>
      </div>
    </div>
  );
}
