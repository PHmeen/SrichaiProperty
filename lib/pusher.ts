import Pusher from 'pusher';

// Pusher server instance ใช้ยิง event จาก API routes (ฝั่ง server เท่านั้น ห้าม import เข้า client component)
// ต้องตั้งค่า PUSHER_APP_ID / NEXT_PUBLIC_PUSHER_KEY / PUSHER_SECRET / NEXT_PUBLIC_PUSHER_CLUSTER ใน .env
// สร้างแบบ lazy (สร้างตอนเรียกใช้จริงครั้งแรก ไม่ใช่ตอน import) เพื่อไม่ให้ `next build` ล้มเหลว
// ตอน collect page data ในเครื่องที่ยังไม่ได้ตั้งค่า env จริง (เช่น CI ที่ build แต่ไม่รัน request จริง)
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}. กรุณาตั้งค่าใน .env.local จากบัญชี Pusher ของคุณ`);
  }
  return value;
}

let instance: Pusher | null = null;

function getPusherServer(): Pusher {
  if (!instance) {
    instance = new Pusher({
      appId: requireEnv('PUSHER_APP_ID'),
      key: requireEnv('NEXT_PUBLIC_PUSHER_KEY'),
      secret: requireEnv('PUSHER_SECRET'),
      cluster: requireEnv('NEXT_PUBLIC_PUSHER_CLUSTER'),
      useTLS: true,
    });
  }
  return instance;
}

// Proxy เพื่อให้ import { pusherServer } from '@/lib/pusher' แล้วเรียกใช้เหมือน Pusher instance ปกติได้เลย
// แต่ค่า env จะถูกอ่าน/ตรวจสอบตอนเรียก method ครั้งแรกจริงๆ เท่านั้น
export const pusherServer: Pusher = new Proxy({} as Pusher, {
  get(_target, prop, receiver) {
    const real = getPusherServer();
    return Reflect.get(real, prop, receiver);
  }
});

// ชื่อ private channel ของห้องแชท (ต้องขึ้นต้นด้วย "private-" ตามข้อกำหนดของ Pusher)
export function chatChannelName(sessionId: string): string {
  return `private-chat-${sessionId}`;
}
