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

interface ProvinceJSON {
  id: number;
  name_th: string;
  name_en: string;
}

interface DistrictJSON {
  id: number;
  name_th: string;
  name_en: string;
  province_id: number;
}

interface SubDistrictJSON {
  id: number;
  name_th: string;
  name_en: string;
  zip_code: number;
  district_id: number;
}

async function main() {
  console.log("🌱 เริ่มต้นนำเข้าข้อมูลภูมิศาสตร์ประเทศไทยเข้าสู่ฐานข้อมูล...");

  // โหลด db client หลังจากตั้งค่า env เรียบร้อยแล้ว
  const { db } = await import('../lib/db');

  // 1. นำเข้าจังหวัด (Provinces)
  console.log("กำลังดาวน์โหลดและนำเข้าข้อมูลจังหวัด...");
  const provRes = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json');
  const provinces = await provRes.json() as ProvinceJSON[];
  const provincesData = provinces.map((p: ProvinceJSON) => ({
    id: p.id,
    name_th: p.name_th,
    name_en: p.name_en
  }));

  console.log("ล้างข้อมูลจังหวัดเดิม...");
  await db.provinces.deleteMany({});
  
  console.log(`บันทึก ${provincesData.length} จังหวัดลงฐานข้อมูล...`);
  await db.provinces.createMany({ data: provincesData });
  console.log("จังหวัดนำเข้าสำเร็จ");

  // 2. นำเข้าอำเภอ (Amphures)
  console.log("กำลังดาวน์โหลดและนำเข้าข้อมูลอำเภอ...");
  const ampRes = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/district.json');
  const amphures = await ampRes.json() as DistrictJSON[];
  const amphuresData = amphures.map((a: DistrictJSON) => ({
    id: a.id,
    name_th: a.name_th,
    name_en: a.name_en,
    province_id: a.province_id
  }));

  console.log("ล้างข้อมูลอำเภอเดิม...");
  await db.amphures.deleteMany({});

  console.log(`บันทึก ${amphuresData.length} อำเภอลงฐานข้อมูล...`);
  await db.amphures.createMany({ data: amphuresData });
  console.log("อำเภอนำเข้าสำเร็จ");

  // 3. นำเข้าตำบล (Districts / Sub-districts)
  console.log("กำลังดาวน์โหลดและนำเข้าข้อมูลตำบล...");
  const distRes = await fetch('https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/sub_district.json');
  const districts = await distRes.json() as SubDistrictJSON[];
  const districtsData = districts.map((d: SubDistrictJSON) => ({
    id: d.id,
    name_th: d.name_th,
    name_en: d.name_en,
    zip_code: d.zip_code,
    amphure_id: d.district_id // แมปฟิลด์รหัสอำเภอจาก JSON เข้าคอลัมน์ใน DB
  }));

  console.log("ล้างข้อมูลตำบลเดิม...");
  await db.districts.deleteMany({});

  // ทำการแยกบันทึกข้อมูลตำบลเป็นชุดย่อย (Chunks) ชุดละ 1000 รายการ เพื่อไม่ให้เกินข้อจำกัดของ Query Parameters ใน Postgres
  const chunkSize = 1000;
  console.log(`บันทึก ${districtsData.length} ตำบลลงฐานข้อมูล (แบ่งทำงานชุดละ ${chunkSize} แถว)...`);
  for (let i = 0; i < districtsData.length; i += chunkSize) {
    const chunk = districtsData.slice(i, i + chunkSize);
    await db.districts.createMany({ data: chunk });
    console.log(`บันทึกข้อมูลกลุ่มย่อยที่ ${i / chunkSize + 1} (${i + chunk.length}/${districtsData.length})`);
  }

  console.log("🎉 นำเข้าข้อมูลภูมิศาสตร์ประเทศไทยเสร็จสิ้น สมบูรณ์ 100%!");
  await db.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ การนำเข้าข้อมูลภูมิศาสตร์ไทยล้มเหลว:", e);
    process.exit(1);
  });
