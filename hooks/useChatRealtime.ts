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
// Custom Hook: useChatRealtime
// ใช้จัดการการเชื่อมต่อ Realtime (ผ่าน Pusher) สำหรับฟีเจอร์แชท
// ทำหน้าที่: ฟังข้อความใหม่, สถานะอ่านแล้ว, สถานะกำลังพิมพ์ และส่งสถานะพิมพ์ของตัวเองออกไป
export function useChatRealtime({ 
  enabled,          // เปิด/ปิดการทำงานของ hook นี้ (เช่น เปิดเฉพาะตอนแชทหน้าต่างเปิดอยู่)
  sessionId,        // รหัสห้องแชท/บทสนทนา ใช้ระบุว่าจะ subscribe channel ไหน
  currentUserId,    // รหัสผู้ใช้ปัจจุบัน ใช้กรองไม่ให้สนใจ event ที่ตัวเองเป็นคนส่ง
  onNewMessage,      // callback เรียกเมื่อมีข้อความใหม่เข้ามา
  onMessagesRead     // callback เรียกเมื่อข้อความถูกอ่านแล้ว (optional)
}: UseChatRealtimeOptions) {

  // ===== State ภายใน Hook =====
  const [isTyping, setIsTyping] = useState(false);           // สถานะว่าอีกฝ่ายกำลังพิมพ์อยู่หรือไม่
  const [connectionError, setConnectionError] = useState(false); // สถานะว่าเชื่อมต่อ realtime มีปัญหาหรือไม่

  // ===== Effect: จัดการ subscribe/unsubscribe channel ของ Pusher =====
  useEffect(() => {
    // ถ้ายังไม่เปิดใช้งาน หรือยังไม่มี sessionId → ไม่ทำอะไร (ยังไม่ connect)
    if (!enabled || !sessionId) return;

    // ดึง Pusher client instance (น่าจะเป็น singleton ใช้ตัวเดียวทั้งแอป)
    const pusher = getPusherClient();

    // สร้างชื่อ channel เฉพาะของห้องแชทนี้ เช่น "private-chat-session-abc123"
    const channelName = chatChannelName(sessionId); // private-chat-session-{sessionId}

    // สมัครสมาชิก (subscribe) เข้า channel นี้ เพื่อเริ่มรับ event
    const channel = pusher.subscribe(channelName);

    // เมื่อมี event "new-message" เข้ามา → เรียก callback onNewMessage
    // (ไม่ได้ส่งข้อมูลข้อความมาด้วย เดี๋ยวให้ผู้เรียกไป fetch ข้อมูลใหม่เอง)
    channel.bind('new-message', () => onNewMessage());

    // เมื่อมี event "messages-read" เข้ามา → เรียก callback onMessagesRead (ถ้ามีการส่งมา)
    channel.bind('messages-read', () => onMessagesRead?.());

    // เมื่อมี event "client-typing" (อีกฝ่ายกำลังพิมพ์/หยุดพิมพ์)
    channel.bind('client-typing', (data: { isTyping: boolean; userId?: string }) => {
      // ถ้า event นี้มาจากตัวเราเอง (userId ตรงกับ currentUserId) → ไม่ต้องทำอะไร
      // (ป้องกันไม่ให้เห็นสถานะ "กำลังพิมพ์" ของตัวเอง)
      if (data.userId === currentUserId) return;

      // อัปเดตสถานะว่าอีกฝ่ายกำลังพิมพ์อยู่หรือไม่
      setIsTyping(data.isTyping);
    });

    // ถ้า subscribe channel ไม่สำเร็จ (เช่น auth ล้มเหลว) → ตั้ง connectionError = true
    channel.bind('pusher:subscription_error', () => setConnectionError(true));

    // ถ้า subscribe channel สำเร็จ → เคลียร์ error (เผื่อเคย error มาก่อนแล้วเชื่อมต่อใหม่ได้)
    channel.bind('pusher:subscription_succeeded', () => setConnectionError(false));

    // ===== Cleanup function: ทำงานตอน component unmount หรือ dependency เปลี่ยน =====
    return () => {
      channel.unbind_all();           // ยกเลิกการฟัง event ทั้งหมดของ channel นี้
      pusher.unsubscribe(channelName); // ออกจาก channel เพื่อไม่ให้รับ event อีก
      setIsTyping(false);              // รีเซ็ตสถานะพิมพ์กลับเป็นค่าเริ่มต้น
    };

    // effect นี้จะทำงานใหม่ (unsubscribe เก่า + subscribe ใหม่) เมื่อค่าพวกนี้เปลี่ยน
    // หมายเหตุ: ไม่ได้ใส่ onNewMessage, onMessagesRead ใน dependency array
    // (อาจตั้งใจไม่ใส่เพื่อป้องกัน re-subscribe บ่อยเกินไปถ้า callback เปลี่ยน reference ทุก render)
  }, [enabled, sessionId, currentUserId, onNewMessage, onMessagesRead]);

  // ===== ฟังก์ชันสำหรับส่งสถานะ "กำลังพิมพ์" ของตัวเองไปยังเซิร์ฟเวอร์ =====
  // ใช้ useCallback เพื่อไม่ให้ function reference เปลี่ยนทุก render (เผื่อ component ที่ใช้เอาไปใส่ dependency array ที่อื่น)
  const sendTyping = useCallback((typing: boolean) => {
    if (!sessionId) return; // ไม่มีห้องแชทให้ส่งสถานะ ก็ไม่ต้องทำอะไร

    // ยิง POST request ไปบอก backend ว่ากำลังพิมพ์อยู่หรือไม่
    // backend น่าจะรับหน้าที่ trigger event 'client-typing' ผ่าน Pusher กระจายไปยังอีกฝ่ายต่อ
    fetch('/api/chat/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, isTyping: typing })
    });
    // หมายเหตุ: ไม่มีการจัดการ error ของ fetch นี้ (ไม่ await, ไม่ catch)
    // ถ้า request ล้มเหลวจะไม่มีการแจ้งเตือนใดๆ (fire-and-forget)
  }, [sessionId]);

  // ===== ค่าที่ hook นี้ return ให้ component นำไปใช้ =====
  return { 
    isTyping,        // อีกฝ่ายกำลังพิมพ์อยู่หรือไม่
    connectionError, // เชื่อมต่อ realtime มีปัญหาหรือไม่ (เอาไปโชว์ banner แจ้งเตือนได้)
    sendTyping       // ฟังก์ชันเรียกเพื่อบอกว่าตัวเองกำลังพิมพ์/หยุดพิมพ์
  };
}