// ชื่อ private channel ของการแจ้งเตือนส่วนตัวแต่ละผู้ใช้ (ต้องขึ้นต้นด้วย "private-" ตามข้อกำหนดของ Pusher)
// แยกไฟล์นี้ออกมาต่างหาก (ไม่ import 'pusher' หรือ 'pusher-js') เพื่อให้ทั้งฝั่ง server และ client
// import ใช้ชื่อ channel เดียวกันได้ เช่นเดียวกับแนวทางของ lib/chatChannel.ts
const NOTIFICATION_CHANNEL_PREFIX = 'private-user-';

export function notificationChannelName(userId: string): string {
  return `${NOTIFICATION_CHANNEL_PREFIX}${userId}`;
}

// แยก userId ออกจากชื่อ channel กลับมา ใช้ตอนตรวจสิทธิ์ที่ /api/pusher/auth
// คืนค่า null ถ้าชื่อ channel ไม่ตรงรูปแบบช่องแจ้งเตือนของเรา
export function parseNotificationUserId(channelName: string): string | null {
  if (!channelName.startsWith(NOTIFICATION_CHANNEL_PREFIX)) return null;
  return channelName.slice(NOTIFICATION_CHANNEL_PREFIX.length);
}
