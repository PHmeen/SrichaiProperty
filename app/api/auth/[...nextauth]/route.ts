import NextAuth from "next-auth";
import { authOptions } from "@/lib/authOptions";

//  ไฟล์นี้คือ "ทางเข้า" ของระบบ NextAuth ทั้งหมด
// ชื่อไฟล์ [...nextauth] เป็น Dynamic Catch-all Route ของ Next.js
// แปลว่าทุก request ที่ยิงมาที่ /api/auth/* (เช่น /api/auth/signin, /api/auth/session, ฯลฯ) จะถูกจับมาที่ไฟล์นี้ไฟล์เดียว
// แล้วส่งต่อให้ NextAuth ไปจัดการเองทั้งหมด ตามกฎที่กำหนดไว้ใน authOptions.ts

// สร้าง handler โดยป้อน config (providers, callbacks, session ฯลฯ) จาก authOptions
const handler = NextAuth(authOptions);

// NextAuth ต้องรองรับทั้ง GET (เช่น ขอ session, หน้า signin) และ POST (เช่น ส่ง credentials ตอน login)
// จึงต้อง export handler ตัวเดียวกันให้ทำงานทั้งสอง method นี้ ตามรูปแบบ Next.js App Router
export { handler as GET, handler as POST };
