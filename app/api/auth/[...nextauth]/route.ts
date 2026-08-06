import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

// ไฟล์นี้คือ "ประตูทางเข้า" เดียวของระบบ login ทั้งเว็บ
// ชื่อโฟลเดอร์ [...nextauth] แปลว่า path ไหนก็ตามที่ขึ้นต้นด้วย /api/auth/
// เช่น /api/auth/signin, /api/auth/session, /api/auth/callback/google
// จะถูกส่งมาที่ไฟล์นี้ไฟล์เดียว ไม่ต้องสร้างไฟล์แยกทีละ path

// เอา config ทั้งหมด (มี provider อะไรบ้าง, ต้องเช็คอะไรก่อน login ได้) จาก authOptions.ts
// มาสร้างเป็น "handler" ตัวจัดการ request จริงๆ
const handler = NextAuth(authOptions);

// เว็บเบราว์เซอร์ยิง request มา 2 แบบ: GET (เช่น ขอดู session ปัจจุบัน)
// และ POST (เช่น ตอนกดปุ่ม login ส่ง email/password มา)
// เลยต้องให้ handler ตัวเดียวกันรับทั้งสองแบบ
export { handler as GET, handler as POST };
