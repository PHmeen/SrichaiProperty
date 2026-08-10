import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * ==============================================================================
 * SHADCN UI CHAT MESSAGE PRIMITIVES (คอมโพเนนต์พื้นฐานสำหรับข้อความแชท)
 * ==============================================================================
 * ไฟล์นี้ทำหน้าที่สร้างโครงสร้างคอมโพเนนต์ย่อยสำหรับแชทเพื่อใช้ซ้ำได้ง่ายและเป็นระเบียบ
 */

// 1. <Message />: Container หลักสำหรับจัดวางแถวข้อความ (สลับซ้าย/ขวาได้ตามฝั่งผู้ส่ง)
interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** align: 'start' (ข้อความฝั่งซ้าย - ผู้รับ/ลูกค้า) | 'end' (ข้อความฝั่งขวา - ตัวเรา/เอเย่นต์) */
  align?: 'start' | 'end';
}

export const Message = React.forwardRef<HTMLDivElement, MessageProps>(
  ({ className, align = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3 my-2 text-sm',
          align === 'end' ? 'flex-row-reverse text-right' : 'flex-row text-left',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Message.displayName = 'Message';

// 2. <MessageAvatar />: รูปโปรไฟล์ทรงกลม พร้อมอักษรย่อแสดงแทนหากไม่มีรูป
interface MessageAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
}

export const MessageAvatar = React.forwardRef<HTMLDivElement, MessageAvatarProps>(
  ({ className, src, fallback = 'U', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 items-center justify-center font-bold text-slate-600 text-xs shadow-xs',
          className
        )}
        {...props}
      >
        {src ? (
          // unoptimized เสมอ: avatar เล็กมาก (~32px) ไม่คุ้มให้ Next.js Image Optimizer ประมวลผล
          // และบางแหล่ง (เช่น ui-avatars.com) คืนเป็น SVG ที่ Optimizer บล็อกโดย default
          <Image src={src} alt="Avatar" fill unoptimized className="object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  }
);
MessageAvatar.displayName = 'MessageAvatar';

// 3. <MessageContent />: กล่องบรรจุเนื้อหาข้อความ + เวลา (จำกัดความกว้างไม่เกิน 75%)
export const MessageContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col max-w-[75%] space-y-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageContent.displayName = 'MessageContent';

// 4. <MessageFooter />: แสดงเวลาหรือสถานะของข้อความ (เช่น 12:30 น.)
export const MessageFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('text-[10px] text-slate-400 font-medium px-1', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MessageFooter.displayName = 'MessageFooter';

