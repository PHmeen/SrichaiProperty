import Pusher from 'pusher';

// Pusher server instance ใช้ยิง event จาก API routes เท่านั้น (ห้าม import เข้า client component)
// สร้างแบบ lazy (ตอนเรียกใช้จริงครั้งแรก) เพื่อไม่ให้ `next build` ล้มเหลวตอน collect page data
// ในเครื่อง/CI ที่ยังไม่ได้ตั้งค่า env จริง
let instance: Pusher | null = null;

export function getPusher(): Pusher {
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return instance;
}

// ชื่อ private channel ของห้องแชท (ต้องขึ้นต้นด้วย "private-" ตามข้อกำหนดของ Pusher)
export function chatChannelName(sessionId: string): string {
  return `private-chat-${sessionId}`;
}
