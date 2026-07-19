import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding reports/complaints database...");

  // 1. Get or create a reporter (Buyer / Customer)
  let buyer = await prisma.users.findFirst({
    where: { role_id: 'customer' }
  });

  if (!buyer) {
    buyer = await prisma.users.create({
      data: {
        email: 'buyer.test@srichaiproperty.com',
        password_hash: '$2a$10$xyz', // Dummy
        first_name: 'ธนพล',
        last_name: 'รักดี',
        phone: '0812345678',
        role_id: 'customer',
        status: 'approved'
      }
    });
  }

  // 2. Get or create an agent
  let agent = await prisma.users.findFirst({
    where: { role_id: 'agent' }
  });

  if (!agent) {
    agent = await prisma.users.create({
      data: {
        email: 'agent.test@srichaiproperty.com',
        password_hash: '$2a$10$xyz',
        first_name: 'ศิริชัย',
        last_name: 'พารวย',
        phone: '0898765432',
        role_id: 'agent',
        status: 'approved'
      }
    });
  }

  // 3. Get or create a property
  let property = await prisma.properties.findFirst();

  if (!property) {
    // Need a property type
    let propType = await prisma.property_types.findFirst();
    if (!propType) {
      propType = await prisma.property_types.create({
        data: { name: 'บ้านเดี่ยว' }
      });
    }
    property = await prisma.properties.create({
      data: {
        title: 'บ้านเดี่ยว 2 ชั้น โครงการสิริชัย (PRJ-9932)',
        price: 4500000,
        type_id: propType.id,
        location: 'นนทบุรี',
        status: 'approved',
        agent_id: agent.id
      }
    });
  }

  // 4. Create reports
  await prisma.reports.createMany({
    data: [
      {
        reporter_id: buyer.id,
        reported_agent_id: agent.id,
        reported_property_id: property.id,
        reason: 'เข้าข่ายฉ้อโกง (SCAM)',
        details: 'นายหน้าคนนี้พยายามหลอกให้ผมโอนเงินมัดจำ 10,000 บาทเข้าไปที่บัญชีส่วนตัวก่อนที่จะพาไปดูบ้านครับ พอผมขอดูเอกสารบ้านก็บ่ายเบี่ยง รบกวนตรวจสอบด้วยครับ',
        status: 'pending'
      },
      {
        reporter_id: buyer.id,
        reported_agent_id: agent.id,
        reason: 'ถ้อยคำไม่สุภาพ/คุกคาม',
        details: 'ขอยกเลิกนัดดูห้องเพราะติดธุระด่วน แต่นายหน้าพิมพ์ด่าทอด้วยถ้อยคำหยาบคายมากค่ะ รบกวนจัดการด้วย',
        status: 'pending'
      },
      {
        reporter_id: buyer.id,
        reported_agent_id: agent.id,
        reported_property_id: property.id,
        reason: 'ข้อมูลอสังหาฯ ไม่ถูกต้อง',
        details: 'ตำแหน่งปักหมุดในแผนที่และรูปภาพบ้านจริงไม่ตรงกับที่ลงไว้ในรายละเอียดโครงการครับ รบกวนช่วยตรวจสอบหน่อย',
        status: 'resolved'
      }
    ]
  });

  console.log("✅ Reports seeded successfully!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => {
  console.error("Error seeding reports:", err);
  process.exit(1);
});
