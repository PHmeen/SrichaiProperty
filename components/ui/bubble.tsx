import React from 'react';
import { cn } from '@/lib/utils';

/**
 * ==============================================================================
 * SHADCN UI CHAT BUBBLE PRIMITIVES (กล่องบอลลูนคำพูดข้อความ)
 * ==============================================================================
 * ทำหน้าที่แสดงผลกรอบกรอกข้อความในดีไซน์มินิมอล มีมิติ สไตล์ shadcn
 */

interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 
   * variant:
   * - 'primary': สีฟ้า (สำหรับข้อความที่เราส่งเอง)
   * - 'secondary': สีเทาอ่อน (สำหรับข้อความที่ได้รับจากอีกฝ่าย)
   * - 'outline': สีขาวขอบเทา (สำหรับข้อความที่ได้รับสไตล์การ์ด)
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

export const Bubble = React.forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, variant = 'secondary', children, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-blue-600 text-white rounded-2xl rounded-tr-xs shadow-xs',
      secondary: 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-xs border border-slate-200/60 shadow-xs',
      outline: 'bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-xs',
      ghost: 'bg-slate-50 text-slate-700 rounded-2xl'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'p-3 text-xs md:text-sm font-medium leading-relaxed break-words transition-all',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Bubble.displayName = 'Bubble';

export const BubbleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('whitespace-pre-wrap', className)} {...props}>
        {children}
      </div>
    );
  }
);
BubbleContent.displayName = 'BubbleContent';

