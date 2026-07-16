import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// กำหนดอ็อบเจกต์ global สำหรับเก็บอินสแตนซ์ของ Prisma เพื่อแชร์การเชื่อมต่อร่วมกัน
// ป้องกันการสร้างการเชื่อมต่อฐานข้อมูลใหม่ทุกครั้งที่โค้ดทำการ Hot-Reload ในตอนพัฒนา (Development)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// สร้าง Connection Pool สำหรับเชื่อมต่อกับ PostgreSQL โดยดึง Connection String มาจากไฟล์ .env
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// แปลงระบบเชื่อมต่อฐานข้อมูล PostgreSQL (pg) ให้ทำงานร่วมกับ Prisma Client ผ่าน Adapter
const adapter = new PrismaPg(pool);

// ตัวแปร db คือจุดเชื่อมต่อฐานข้อมูลกลางที่จะถูกนำไปเรียกใช้งานทั่วทั้งโปรเจกต์
// โค้ดจะเช็คก่อนว่ามีอินสแตนซ์เดิมรันอยู่ในหน่วยความจำส่วนกลาง (globalForPrisma) หรือไม่
// ถ้ามี: จะนำตัวเดิมมาใช้งานต่อทันที
// ถ้าไม่มี: จะสร้างอินสแตนซ์ตัวใหม่ขึ้นมาผ่าน adapter
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// หากไม่ได้อยู่ในโหมดโปรดักชัน (อยู่ในโหมดพัฒนา) ให้บันทึกอินสแตนซ์ db ไว้ในตัวแปร global
// เพื่อนำกลับมาใช้ใหม่เมื่อ Next.js ทำการ Hot-Reload โค้ด
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;



