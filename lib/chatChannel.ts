// ชื่อ private channel ของห้องแชท (ต้องขึ้นต้นด้วย "private-" ตามข้อกำหนดของ Pusher)
// แยกไฟล์นี้ออกมาต่างหาก (ไม่ import 'pusher' หรือ 'pusher-js') เพื่อให้ทั้งฝั่ง server และ client
// import ใช้ชื่อ channel เดียวกันได้โดยไม่ดึง SDK ฝั่งตรงข้ามเข้ามาโดยไม่จำเป็น
const CHAT_CHANNEL_PREFIX = 'private-chat-';

export function chatChannelName(sessionId: string): string {
  return `${CHAT_CHANNEL_PREFIX}${sessionId}`;
}

// แยก sessionId ออกจากชื่อ channel กลับมา ใช้ตอนตรวจสิทธิ์ที่ /api/pusher/auth
// คืนค่า null ถ้าชื่อ channel ไม่ตรงรูปแบบห้องแชทของเรา
export function parseChatSessionId(channelName: string): string | null {
  if (!channelName.startsWith(CHAT_CHANNEL_PREFIX)) return null;
  return channelName.slice(CHAT_CHANNEL_PREFIX.length);
}
