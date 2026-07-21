// ข้อมูลตัวอย่างสมบูรณ์สำหรับนำเข้าฐานข้อมูล (Master & Mock Seed Data)

export const rolesData = [
  { id: "admin", name: "Administrator" },
  { id: "agent", name: "Real Estate Agent" },
  { id: "customer", name: "Customer / General User" }
];

export const typesData = [
  { id: 1, name: "บ้านเดี่ยว" },
  { id: 2, name: "ทาวน์โฮม" },
  { id: 3, name: "คอนโดมิเนียม" }
];

export const amenitiesData = [
  { id: 1, name: "สระว่ายน้ำ" },
  { id: 2, name: "ฟิตเนส" },
  { id: 3, name: "ที่จอดรถ" },
  { id: 4, name: "ระบบรักษาความปลอดภัย 24 ชม." },
  { id: 5, name: "กล้องวงจรปิด (CCTV)" },
  { id: 6, name: "สวนสาธารณะ / สวนส่วนตัว" },
  { id: 7, name: "สนามเด็กเล่น" },
  { id: 8, name: "คลับเฮ้าส์" },
  { id: 9, name: "ลิฟต์โดยสาร" },
  { id: 10, name: "สัตว์เลี้ยงเข้าได้ (Pet Friendly)" }
];

export const nearbyData = [
  { id: 1, name: "มหาวิทยาลัยสงขลานครินทร์ (ม.อ.)", type: "education" },
  { id: 2, name: "โรงพยาบาลสงขลานครินทร์", type: "hospital" },
  { id: 3, name: "เซ็นทรัลเฟสติวัล หาดใหญ่", type: "shopping" },
  { id: 4, name: "สนามบินนานาชาติหาดใหญ่", type: "transport" },
  { id: 5, name: "หาดชลาทัศน์ สงขลา", type: "attraction" },
  { id: 6, name: "ตลาดกิมหยง หาดใหญ่", type: "shopping" }
];

export const configsData = [
  { key: "site_name", value: "Srichai Property", description: "ชื่อแพลตฟอร์มอสังหาริมทรัพย์" },
  { key: "contact_phone", value: "074-123-4567", description: "เบอร์โทรศัพท์ติดต่อส่วนกลาง" },
  { key: "contact_email", value: "support@srichaiproperty.com", description: "อีเมลฝ่ายบริการลูกค้า" },
  { key: "line_oa", value: "@srichaiproperty", description: "Line Official Account" }
];

export const packagesData = [
  { id: 1, name: "Basic Starter", price: 0, max_duration_days: 30 },
  { id: 2, name: "Pro Silver", price: 490, max_duration_days: 60 },
  { id: 3, name: "Premium Gold", price: 990, max_duration_days: 90 },
  { id: 4, name: "VIP Diamond", price: 1990, max_duration_days: 180 }
];

export const bannerData = [
  {
    title: "บ้านเดี่ยวหรูต้อนรับปี 2026 - รับส่วนลดสูงสุด 500,000 บาท",
    image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    link_url: "/search?type=1",
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31"),
    status: "active"
  },
  {
    title: "พลัส คอนโดมิเนียม หาดใหญ่ - ผ่อนสบายเริ่มเพียง 8,500 บาท/เดือน",
    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    link_url: "/search?type=3",
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31"),
    status: "active"
  },
  {
    title: "ร่วมทีมกับเรา - สมัครเป็นนายหน้าอสังหาฯ ค่าคอมมิชชันสูงสุด 5%",
    image_url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
    link_url: "/register?role=agent",
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31"),
    status: "active"
  }
];

export const promotionData = [
  {
    name: "ส่วนลดค่าธรรมเนียมลงประกาศ 10%",
    code: "SRICHAI2026",
    discount_rate: 0.10,
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31")
  },
  {
    name: "ต้อนรับนายหน้าใหม่ ลด 50%",
    code: "NEWAGENT50",
    discount_rate: 0.50,
    start_date: new Date("2026-01-01"),
    end_date: new Date("2026-12-31")
  }
];

export const propertiesRawData = [
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
    description: "บ้านเดี่ยวหรูสไตล์นอร์ดิกดีไซน์ทันสมัย หลังมุม มีพื้นที่สวนส่วนตัวกว้างขวาง 3 ห้องนอน 3 ห้องน้ำ จอดรถได้ 2 คัน ทำเลใกล้ ม.อ. หาดใหญ่ เพียง 5 นาที",
    bedrooms: 3,
    bathrooms: 3,
    area_sqm: 210,
    status: "approved",
    agentEmail: "somchai.agent@srichaiproperty.com",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [1, 3, 4, 5, 6, 8],
    nearbies: [{ id: 1, distance: 1200 }, { id: 2, distance: 1500 }, { id: 3, distance: 3500 }]
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
    description: "คอนโดหรูใจกลางเมืองหาดใหญ่ ชั้น 18 ห้องมุม วิวเมืองพาโนรามา ตกแต่งเฟอร์นิเจอร์บิวต์อินครบครัน",
    bedrooms: 1,
    bathrooms: 1,
    area_sqm: 35,
    status: "approved",
    agentEmail: "wipha.agent@srichaiproperty.com",
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [1, 2, 3, 4, 5, 9],
    nearbies: [{ id: 3, distance: 2000 }, { id: 6, distance: 1800 }]
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
    description: "ทาวน์โฮม 3 ชั้น สไตล์โมเดิร์นลอฟท์ เพดานสูงโปร่ง ใกล้หาดชลาทัศน์ เดินไปทะเลเพียง 300 เมตร",
    bedrooms: 4,
    bathrooms: 3,
    area_sqm: 180,
    status: "approved",
    agentEmail: "wipha.agent@srichaiproperty.com",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [3, 4, 5, 6],
    nearbies: [{ id: 5, distance: 300 }]
  },
  {
    title: "ทาวน์โฮม 2 ชั้น สไตล์โมเดิร์น ติดถนนสายหลัก หาดใหญ่",
    price: 3900000,
    type_id: 2,
    location: "ถ.กาญจนวนิช, หาดใหญ่, สงขลา",
    province_id: 70,
    amphure_id: 9011,
    district_id: 901101,
    latitude: 7.008912,
    longitude: 100.481234,
    description: "ทาวน์โฮม 2 ชั้น สภาพใหม่กริ๊บ ทำเลดีติดถนนใหญ่ เดินทางสะดวก ใกล้ห้างสรรพสินค้า",
    bedrooms: 3,
    bathrooms: 2,
    area_sqm: 140,
    status: "approved",
    agentEmail: "somchai.agent@srichaiproperty.com",
    images: [
      "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [3, 5],
    nearbies: [{ id: 1, distance: 800 }, { id: 3, distance: 1000 }]
  },
  {
    title: "บ้านเดี่ยวหรู 2 ชั้น โครงการใหม่ - รอการอนุมัติโฆษณา",
    price: 6200000,
    type_id: 1,
    location: "ถ.ลพบุรีราเมศวร์, หาดใหญ่, สงขลา",
    province_id: 70,
    amphure_id: 9011,
    district_id: 901102,
    latitude: 7.031122,
    longitude: 100.458877,
    description: "บ้านเดี่ยวสร้างใหม่สไตล์โมเดิร์น 4 ห้องนอน 4 ห้องน้ำ จอดรถได้ 3 คัน ยื่นขออนุมัติขึ้นระบบ",
    bedrooms: 4,
    bathrooms: 4,
    area_sqm: 240,
    status: "pending",
    agentEmail: "theeradech.agent@srichaiproperty.com",
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"
    ],
    amenities: [1, 2, 3, 4, 5, 6, 7, 8],
    nearbies: [{ id: 4, distance: 10000 }]
  }
];
