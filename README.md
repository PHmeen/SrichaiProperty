# 🏢 Srichai Property (Next.js + Prisma + PostgreSQL)

โปรเจกต์เว็บแอปพลิเคชันระบบจัดการอสังหาริมทรัพย์ Srichai Property พัฒนาด้วย Next.js (App Router), Prisma ORM และ PostgreSQL

---

## 🛠️ วิธีการติดตั้งโปรเจกต์สำหรับนักพัฒนาคนใหม่ (Setup Guide)

หากต้องการนำโปรเจกต์นี้ไปติดตั้งและรันบนเครื่องคอมพิวเตอร์เครื่องอื่น ให้ทำตามขั้นตอนดังต่อไปนี้:

### 1. ติดตั้งซอฟต์แวร์พื้นฐาน
- **Node.js**: เวอร์ชัน 18 ขึ้นไป (แนะนำเวอร์ชัน 20 LTS)
- **PostgreSQL**: ติดตั้งและสร้าง Database สำหรับโปรเจกต์ (เช่นชื่อ `srichai_db`)

### 2. ดาวน์โหลดโปรเจกต์และติดตั้ง Dependencies
เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วรันคำสั่ง:
```bash
npm install --legacy-peer-deps
```
*(หมายเหตุ: ต้องใช้ `--legacy-peer-deps` เนื่องจากโปรเจกต์ใช้ Next.js เวอร์ชัน Canary เพื่อเข้ากันได้กับฟีเจอร์ล่าสุด)*

### 3. ตั้งค่าไฟล์ Environment Variables
1. คัดลอกไฟล์คัดลอกไฟล์เทมเพลตจาก `.env.example` ไปเป็น `.env`:
   - ระบบ Windows (PowerShell): `cp .env.example .env`
   - ระบบ macOS/Linux: `cp .env.example .env`
2. เปิดไฟล์ `.env` แล้วแก้ไขค่าการเชื่อมต่อฐานข้อมูลในบรรทัด `DATABASE_URL` ให้ตรงกับ PostgreSQL ในเครื่องคุณ:
   ```env
   DATABASE_URL="postgresql://postgres:รหัสผ่านฐานข้อมูล@localhost:5432/srichai_db?schema=public"
   ```

### 4. ซิงค์โครงสร้างฐานข้อมูล (Prisma Migration)
รันคำสั่งเพื่อให้ Prisma สร้างตารางทั้งหมดลงในฐานข้อมูล PostgreSQL ของคุณอัตโนมัติ:
```bash
npx prisma db push
```

หากต้องการรันตัว Seed ข้อมูลตัวอย่างสำหรับทดสอบระบบ (ถ้ามี):
```bash
npm run seed
```

### 5. เริ่มรันระบบสำหรับพัฒนา (Development Server)
```bash
npm run dev
```
ระบบจะเปิดใช้งานที่ [http://localhost:3000](http://localhost:3000)
