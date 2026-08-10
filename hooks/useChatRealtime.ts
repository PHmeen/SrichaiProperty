'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPusherClient } from '@/lib/pusher-client';
import { chatChannelName } from '@/lib/chatChannel';

interface UseChatRealtimeOptions {
  /** subscribe เมื่อผู้ใช้ล็อกอินแล้วเท่านั้น (เช่น status === 'authenticated') */
  enabled: boolean;
  sessionId: string | null;
  currentUserId?: string;
  /** เรียกเมื่อมีข้อความใหม่เข้าห้องนี้ */
  onNewMessage: () => void;
  /** เรียกเมื่ออีกฝ่ายอ่านข้อความที่เราส่งไปแล้ว (ไม่บังคับ) */
  onMessagesRead?: () => void;
}

/**
 * Hook กลางสำหรับเชื่อมต่อ Pusher ของห้องแชทที่กำลังเปิดอยู่ ใช้ร่วมกันทั้งหน้าแชทฝั่งนายหน้าและลูกค้า
 * subscribe/unsubscribe channel อัตโนมัติตาม sessionId ที่เปลี่ยน และคืนสถานะ typing/connection error ให้ UI ใช้
 */
export function useChatRealtime({ enabled, sessionId, currentUserId, onNewMessage, onMessagesRead }: UseChatRealtimeOptions) {
  const [isTyping, setIsTyping] = useState(false);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    const pusher = getPusherClient();
    const channelName = chatChannelName(sessionId);
    const channel = pusher.subscribe(channelName);

    channel.bind('new-message', () => onNewMessage());
    channel.bind('messages-read', () => onMessagesRead?.());

    // เมื่ออีกฝ่ายกำลังพิมพ์ข้อความ (ข้ามอีเวนต์ของตัวเอง กันเห็นสถานะพิมพ์ของตัวเองสะท้อนกลับมา)
    channel.bind('client-typing', (data: { isTyping: boolean; userId?: string }) => {
      if (data.userId === currentUserId) return;
      setIsTyping(data.isTyping);
    });

    channel.bind('pusher:subscription_error', () => setConnectionError(true));
    channel.bind('pusher:subscription_succeeded', () => setConnectionError(false));

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      setIsTyping(false);
      setConnectionError(false);
    };
  }, [enabled, sessionId, currentUserId, onNewMessage, onMessagesRead]);

  // แจ้งอีกฝ่ายว่ากำลังพิมพ์อยู่หรือไม่ (ยิงผ่าน API ไป Pusher เท่านั้น ไม่บันทึกลง DB)
  const sendTyping = useCallback((typing: boolean) => {
    if (!sessionId) return;
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, isTyping: typing })
    }).catch(err => console.error('Send typing status failed:', err));
  }, [sessionId]);

  return { isTyping, connectionError, sendTyping };
}
