import { db } from '@/lib/db';
import { getPusher } from '@/lib/pusher';
import { notificationChannelName } from '@/lib/notificationChannel';

interface NotifyInput {
  userId: string;
  title: string;
  content: string;
  type: string;
  linkUrl?: string | null;
}

// สร้างการแจ้งเตือนลง DB แล้วยิงผ่าน Pusher ให้ผู้ใช้คนนั้นเห็นทันทีแบบ real-time
// ใช้จุดเดียวกันทุกฟีเจอร์ที่ต้องแจ้งเตือนผู้ใช้ (แชท, นัดหมาย, ประกาศ, รีวิว, การชำระเงิน ฯลฯ)
export async function notifyUser({ userId, title, content, type, linkUrl }: NotifyInput) {
  const notification = await db.notifications.create({
    data: { user_id: userId, title, content, type, link_url: linkUrl ?? null, is_read: false }
  });

  // ไม่ให้ Pusher ล่มแล้วทำให้การสร้างการแจ้งเตือนล้มเหลวไปด้วย (บันทึก DB สำเร็จแล้วถือว่าจบงานหลัก)
  await getPusher().trigger(notificationChannelName(userId), 'new-notification', {
    id: notification.id,
    title: notification.title,
    content: notification.content,
    isRead: false,
    type: notification.type,
    linkUrl: notification.link_url,
    createdAt: notification.created_at
  }).catch(err => console.error('Pusher trigger error (notification):', err));

  return notification;
}

// แจ้งเตือนผู้ใช้หลายคนพร้อมกัน (เช่น แอดมินทุกคน) ด้วยเนื้อหาเดียวกัน
// ผู้ใช้แต่ละคนที่แจ้งไม่สำเร็จจะไม่ทำให้คนอื่นล้มเหลวตาม (เหมือน Promise.allSettled เดิมของทุกจุดที่เคยเขียนเอง)
export async function notifyUsers(userIds: string[], data: Omit<NotifyInput, 'userId'>) {
  return Promise.allSettled(userIds.map(userId => notifyUser({ userId, ...data })));
}
