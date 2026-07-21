import { PrismaClient } from "@prisma/client";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  rolesData, typesData, amenitiesData, nearbyData,
  configsData, packagesData, bannerData, promotionData, propertiesRawData
} from './seed_data';

// โหลด Environment Variables
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length > 0) {
      let v = val.join('=').trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[key.trim()] = v;
    }
  });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 เริ่มต้นนำเข้าข้อมูลทุกตารางในระบบ (Seeding Database)...");

  // 4. Properties & Relations
  await prisma.property_amenities.deleteMany({});
  await prisma.property_nearbies.deleteMany({});
  await prisma.property_documents.deleteMany({});
  await prisma.property_images.deleteMany({});
  await prisma.properties.deleteMany({});
  await prisma.property_types.deleteMany({ where: { id: { notIn: [1, 2, 3] } } });
  for (const r of rolesData) await prisma.roles.upsert({ where: { id: r.id }, update: { name: r.name }, create: r });
  for (const t of typesData) await prisma.property_types.upsert({ where: { id: t.id }, update: { name: t.name }, create: t });
  for (const a of amenitiesData) await prisma.amenities.upsert({ where: { id: a.id }, update: { name: a.name }, create: a });
  for (const n of nearbyData) await prisma.nearby_places.upsert({ where: { id: n.id }, update: { name: n.name, type: n.type }, create: n });
  for (const c of configsData) await prisma.system_configs.upsert({ where: { key: c.key }, update: { value: c.value }, create: c });
  for (const p of packagesData) await prisma.listing_packages.upsert({ where: { id: p.id }, update: { name: p.name, price: p.price }, create: p });

  // 2. Users (Admin, Agents, Customers)
  const passAdmin = await bcrypt.hash("1234", 10);
  const passAgent = await bcrypt.hash("agentpassword123", 10);
  const passCust = await bcrypt.hash("customerpassword123", 10);

  const admin = await prisma.users.upsert({
    where: { email: "admin@srichaiproperty.com" },
    update: { role_id: "admin", status: "approved", password_hash: passAdmin },
    create: { email: "admin@srichaiproperty.com", password_hash: passAdmin, first_name: "ผู้ดูแลระบบ", last_name: "ศรีชัย", phone: "0899999999", role_id: "admin", status: "approved", is_verified: true }
  });

  const agent1 = await prisma.users.upsert({
    where: { email: "somchai.agent@srichaiproperty.com" },
    update: { role_id: "agent", status: "approved" },
    create: { email: "somchai.agent@srichaiproperty.com", password_hash: passAgent, first_name: "สมชาย", last_name: "นายหน้าดี", phone: "0812345678", role_id: "agent", status: "approved", is_verified: true, experience: "5 ปี", specialty_zone: "หาดใหญ่ / ปุณณกัณฑ์" }
  });

  const agent2 = await prisma.users.upsert({
    where: { email: "wipha.agent@srichaiproperty.com" },
    update: { role_id: "agent", status: "approved" },
    create: { email: "wipha.agent@srichaiproperty.com", password_hash: passAgent, first_name: "วิภา", last_name: "อสังหาทรัพย์สิน", phone: "0823456789", role_id: "agent", status: "approved", is_verified: true, experience: "8 ปี", specialty_zone: "เมืองสงขลา / ชลาทัศน์" }
  });

  const agent3 = await prisma.users.upsert({
    where: { email: "theeradech.agent@srichaiproperty.com" },
    update: { role_id: "agent" },
    create: { email: "theeradech.agent@srichaiproperty.com", password_hash: passAgent, first_name: "ธีรเดช", last_name: "มั่งคั่ง", phone: "0834567890", role_id: "agent", status: "pending", is_verified: false, kyc_doc: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80" }
  });

  const cust1 = await prisma.users.upsert({
    where: { email: "somsri.customer@gmail.com" },
    update: { role_id: "customer" },
    create: { email: "somsri.customer@gmail.com", password_hash: passCust, first_name: "สมศรี", last_name: "รักบ้านดี", phone: "0845678901", role_id: "customer", status: "approved" }
  });

  const cust2 = await prisma.users.upsert({
    where: { email: "kitti.customer@gmail.com" },
    update: { role_id: "customer" },
    create: { email: "kitti.customer@gmail.com", password_hash: passCust, first_name: "กิตติ", last_name: "ตั้งมั่น", phone: "0856789012", role_id: "customer", status: "approved" }
  });

  const agentMap: Record<string, string> = {
    "somchai.agent@srichaiproperty.com": agent1.id,
    "wipha.agent@srichaiproperty.com": agent2.id,
    "theeradech.agent@srichaiproperty.com": agent3.id,
  };

  // 3. Campaigns & Promotions
  await prisma.banner_campaigns.deleteMany({});
  await prisma.banner_campaigns.createMany({ data: bannerData });
  await prisma.promotions.deleteMany({});
  await prisma.promotions.createMany({ data: promotionData });

  // 4. Properties & Relations
  await prisma.property_amenities.deleteMany({});
  await prisma.property_nearbies.deleteMany({});
  await prisma.property_documents.deleteMany({});
  await prisma.property_images.deleteMany({});
  await prisma.properties.deleteMany({});

  const createdProps = [];
  for (const raw of propertiesRawData) {
    const { images, amenities, nearbies, agentEmail, ...propData } = raw;
    const prop = await prisma.properties.create({
      data: { ...propData, agent_id: agentMap[agentEmail] }
    });
    createdProps.push(prop);

    for (let i = 0; i < images.length; i++) {
      await prisma.property_images.create({ data: { property_id: prop.id, image_url: images[i], order_index: i } });
    }
    for (const amId of amenities) {
      await prisma.property_amenities.create({ data: { property_id: prop.id, amenity_id: amId } });
    }
    for (const nb of nearbies) {
      await prisma.property_nearbies.create({ data: { property_id: prop.id, nearby_place_id: nb.id, distance_meters: nb.distance } });
    }
    await prisma.property_documents.create({ data: { property_id: prop.id, doc_url: `https://example.com/deed/${prop.id}.pdf`, doc_type: "โฉนดที่ดิน (น.ส.4 จ.)", status: "approved" } });
  }

  // 5. Agent Availabilities
  await prisma.agent_availabilities.deleteMany({});
  const tomorrow = new Date(Date.now() + 86400000);
  for (const agId of [agent1.id, agent2.id]) {
    for (const slot of ["morning", "afternoon"]) {
      await prisma.agent_availabilities.create({ data: { agent_id: agId, available_date: tomorrow, time_slot: slot, is_booked: false } });
    }
  }

  // 6. Appointments & Reviews
  await prisma.reviews.deleteMany({});
  await prisma.appointments.deleteMany({});
  const app1 = await prisma.appointments.create({
    data: { customer_id: cust1.id, agent_id: agent1.id, property_id: createdProps[0].id, appointment_date: new Date(), time_slot: "morning", status: "completed", note: "ดูบ้านหลังมุม" }
  });
  await prisma.reviews.create({ data: { appointment_id: app1.id, rating: 5, comment: "บริการดีมากครับ!" } });

  await prisma.appointments.create({
    data: { customer_id: cust2.id, agent_id: agent2.id, property_id: createdProps[1].id, appointment_date: tomorrow, time_slot: "afternoon", status: "approved", note: "ดูสระว่ายน้ำคอนโด" }
  });

  // 7. Orders & Payments
  await prisma.payment_transactions.deleteMany({});
  await prisma.listing_package_orders.deleteMany({});
  const order = await prisma.listing_package_orders.create({
    data: { property_id: createdProps[0].id, package_id: 3, start_date: new Date(), end_date: new Date(Date.now() + 86400000 * 90), status: "active" }
  });
  await prisma.payment_transactions.create({ data: { order_id: order.id, amount: 990, payment_method: "promptpay_qr", slip_url: "https://example.com/slip.png", status: "approved" } });

  // 8. Saved Properties, Chat & Notifications & Reports
  await prisma.saved_properties.deleteMany({});
  await prisma.saved_properties.createMany({ data: [{ user_id: cust1.id, property_id: createdProps[0].id }, { user_id: cust2.id, property_id: createdProps[1].id }] });

  await prisma.messages.deleteMany({});
  await prisma.chat_sessions.deleteMany({});
  const chat = await prisma.chat_sessions.create({ data: { customer_id: cust1.id, agent_id: agent1.id, property_id: createdProps[0].id } });
  await prisma.messages.createMany({
    data: [
      { session_id: chat.id, sender_id: cust1.id, content: "สนใจโครงการศิรินทราครับ" },
      { session_id: chat.id, sender_id: agent1.id, content: "ยินดีครับ พรุ่งนี้สะดวกเข้ามาดูบ้านไหมครับ?" }
    ]
  });

  await prisma.notifications.deleteMany({});
  await prisma.notifications.createMany({
    data: [
      { user_id: cust1.id, title: "ยืนยันการนัดหมาย", content: "การนัดหมายของคุณได้รับการยืนยันแล้ว", is_read: false },
      { user_id: admin.id, title: "มี KYC ใหม่", content: "ธีรเดช ส่งเอกสาร KYC รอการอนุมัติ", is_read: false }
    ]
  });

  await prisma.reports.deleteMany({});
  await prisma.reports.create({ data: { reporter_id: cust2.id, reported_property_id: createdProps[1].id, reported_agent_id: agent2.id, reason: "สอบถามรายละเอียดราคาเพิ่มเติม", status: "pending" } });

  console.log("🎉 นำเข้าข้อมูลทุกตารางสำเร็จ 100%! โค้ดสะอาด กระชับ และเป็นระเบียบเรียบร้อย");
}

main()
  .catch((e) => {
    console.error("❌ เกิดข้อผิดพลาด:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
