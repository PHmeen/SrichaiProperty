import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

// โหลด Environment Variables จากไฟล์ .env ด้วยระบบดั้งเดิมเนื่องจากรันแบบ CLI
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 เริ่มต้นการนำเข้าข้อมูลตัวอย่าง (Seeding Database)...");

  // 1. นำเข้าประเภทบทบาท (Roles)
  console.log("นำเข้าข้อมูลสิทธิ์การใช้งาน (Roles)...");
  const rolesData = [
    { id: "admin", name: "Administrator" },
    { id: "agent", name: "Real Estate Agent" },
    { id: "customer", name: "Customer / General User" }
  ];
  for (const role of rolesData) {
    await prisma.roles.upsert({
      where: { id: role.id },
      update: {},
      create: role,
    });
  }

  // 2. นำเข้าประเภทอสังหาฯ (Property Types)
  console.log("นำเข้าประเภทอสังหาฯ (Property Types)...");
  const typesData = [
    { id: 1, name: "บ้านเดี่ยว" },
    { id: 2, name: "ทาวน์โฮม" },
    { id: 3, name: "คอนโดมิเนียม" }
  ];
  for (const type of typesData) {
    await prisma.property_types.upsert({
      where: { id: type.id },
      update: {},
      create: type,
    });
  }

  // 3. สร้างบัญชีนายหน้าเริ่มต้น (Default Agent)
  console.log("สร้างบัญชีนายหน้าจำลอง...");
  let agent = await prisma.users.findFirst({
    where: { role_id: "agent" },
  });

  if (!agent) {
    agent = await prisma.users.create({
      data: {
        email: "somchai.agent@srichaiproperty.com",
        password_hash: "$2a$10$xyzSomeDummyHashForSecurityButNotUsedForGoogle",
        first_name: "สมชาย",
        last_name: "นายหน้าดี",
        phone: "0812345678",
        profile_image: "https://ui-avatars.com/api/?name=%E0%B8%AA%E0%B8%A1%E0%B8%8A%E0%B8%B2%E0%B8%A2+%E0%B8%99%E0%B8%B2%E0%B8%A2%E0%B8%AB%E0%B8%99%E0%B9%85%E0%B8%B4%E0%B8%94%E0%B8%B5&background=1e40af&color=fff",
        role_id: "agent",
        status: "approved",
        is_verified: true,
      },
    });
  }

  // 4. ล้างข้อมูลรายการอสังหาฯ เก่าออกก่อน
  console.log("ล้างรายการอสังหาฯ เก่าเพื่อป้องกันข้อมูลซ้ำซ้อน...");
  await prisma.property_images.deleteMany({});
  await prisma.properties.deleteMany({});

  // 5. รายการอสังหาฯ แนะนำตัวอย่าง (3 รายการหลัก)
  const sampleProperties = [
    {
      title: "บ้านเดี่ยว 2 ชั้น สไตล์นอร์ดิก (หลังมุม) - โครงการศิรินทรา",
      price: 5900000,
      type_id: 1,
      location: "ถ.ปุณณกัณฑ์, หาดใหญ่, สงขลา",
      province_id: 70,
      amphure_id: 9011,
      district_id: 901104,
      latitude: 7.002345,
      longitude: 100.495678,
      description: "บ้านเดี่ยวหรูสไตล์นอร์ดิกดีไซน์ทันสมัย หลังมุม มีพื้นที่สวนส่วนตัวกว้างขวาง 3 ห้องนอน 3 ห้องน้ำ จอดรถได้ 2 คัน ทำเลใกล้ ม.อ. หาดใหญ่ เพียง 5 นาที ปลอดภัยด้วยกล้อง CCTV และระบบรักษาความปลอดภัย 24 ชม.",
      bedrooms: 3,
      bathrooms: 3,
      area_sqm: 210,
      status: "approved",
      agent_id: agent.id,
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ]
    },
    {
      title: "พลัส คอนโดมิเนียม หาดใหญ่ 2 - ห้องมุม ชั้นสูง วิวเมืองสวยงาม",
      price: 2450000,
      type_id: 3,
      location: "ถ.ราษฎร์อุทิศ (เขต 8), หาดใหญ่, สงขลา",
      province_id: 70,
      amphure_id: 9011,
      district_id: 901101,
      latitude: 7.012543,
      longitude: 100.468234,
      description: "คอนโดหรูใจกลางเมืองหาดใหญ่ ชั้น 18 ห้องมุม วิวเมืองพาโนรามา ตกแต่งเฟอร์นิเจอร์บิวต์อินครบครัน พร้อมเครื่องปรับอากาศและเครื่องใช้ไฟฟ้าครบชุด สระว่ายน้ำลอยฟ้า ฟิตเนสลอยฟ้า และห้องดูหนังส่วนตัว",
      bedrooms: 1,
      bathrooms: 1,
      area_sqm: 35,
      status: "approved",
      agent_id: agent.id,
      images: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ]
    },
    {
      title: "ทาวน์โฮม 3 ชั้น ดีไซน์โมเดิร์นลอฟท์ - ทำเลเมืองสงขลา ใกล้หาดชลาทัศน์",
      price: 3850000,
      type_id: 2,
      location: "ถ.ชลาทัศน์, เมืองสงขลา, สงขลา",
      province_id: 70,
      amphure_id: 9001,
      district_id: 900101,
      latitude: 7.195432,
      longitude: 100.609876,
      description: "ทาวน์โฮม 3 ชั้น สไตล์โมเดิร์นลอฟท์ เพดานสูงโปร่ง อากาศถ่ายเทดีเยี่ยม ใกล้หาดชลาทัศน์ เดินไปทะเลเพียง 300 เมตร เหมาะทั้งการพักอาศัยหรือทำโฮมออฟฟิศ 4 ห้องนอน 3 ห้องน้ำ ปูกระเบื้องแกรนิตโต้อย่างดีทุกชั้น",
      bedrooms: 4,
      bathrooms: 3,
      area_sqm: 180,
      status: "approved",
      agent_id: agent.id,
      images: [
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
      ]
    }
  ];

  for (const item of sampleProperties) {
    const { images, ...propData } = item;
    const createdProp = await prisma.properties.create({
      data: propData
    });

    console.log(`นำเข้าประกาศสำเร็จ: ${createdProp.title}`);

    for (let i = 0; i < images.length; i++) {
      await prisma.property_images.create({
        data: {
          property_id: createdProp.id,
          image_url: images[i],
          order_index: i
        }
      });
    }
  }

  console.log("🎉 ดำเนินการนำเข้าข้อมูลตัวอย่างทั้งหมดลงระบบเสร็จสิ้น!");
}

main()
  .catch((e) => {
    console.error("❌ การนำเข้าข้อมูลล้มเหลว:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
