/**
 * ==============================================================================
 * landmarkService.ts - บริการค้นหาทำเล แลนด์มาร์ก และคำนวณระยะทางรอบสถานที่สำคัญ
 * ==============================================================================
 * วัตถุประสงค์:
 * 1. ตรวจจับคำค้นหาภาษาไทยเชิงทำเล (เช่น "บ้านแถวเซ็นทรัล", "คอนโดใกล้สนามบิน")
 * 2. แปลงชื่อแลนด์มาร์กเป็นพิกัด (Lat, Lng) ผ่านพจนานุกรมความเร็วสูง (0ms) และ OSM
 * 3. คำนวณระยะห่างทางภูมิศาสตร์ด้วยสูตร Haversine Formula แม่นยำระดับเมตร
 * 4. กรองและจัดเรียงอสังหาริมทรัพย์ตามความใกล้เคียง (ใกล้ที่สุดขึ้นก่อน)
 * ==============================================================================
 */

import { Property } from '@/types/property';

export interface LandmarkTarget {
  id: string;
  name: string;
  category: 'shopping' | 'transport' | 'education' | 'hospital' | 'attraction' | 'other';
  lat: number;
  lng: number;
  aliases: string[];
  province?: string;
  description?: string;
}

export interface ParsedSearchIntent {
  originalQuery: string;
  cleanQuery: string;
  spatialIntent: boolean;
  propertyType?: 'house' | 'condo' | 'townhome' | 'land';
  listingType?: 'sale' | 'rent';
  detectedLandmark: LandmarkTarget | null;
  landmarkCandidate: string;
}

/**
 * คลังข้อมูลแลนด์มาร์กและสถานที่สำคัญยอดนิยม (Curated Local Landmarks)
 * จัดเตรียมพิกัดจริงเพื่อการค้นหาที่รวดเร็วระดับ 0ms ไม่ต้องรอ Network
 */
export const CURATED_LANDMARKS: LandmarkTarget[] = [
  // --- หาดใหญ่ / สงขลา (พื้นที่ศูนย์กลาง Srichai Property) ---
  {
    id: 'hatyai-central',
    name: 'เซ็นทรัลเฟสติวัล หาดใหญ่',
    category: 'shopping',
    lat: 7.00392,
    lng: 100.49982,
    aliases: ['เซ็นทรัล', 'เซนทรัล', 'เซ้นทรัล', 'central', 'เซ็นทรัลหาดใหญ่', 'เซ็นทรัลเฟสติวัล', 'เซ็นทรัล เฟสติวัล', 'central festival', 'central hatyai', 'ห้างเซ็นทรัล'],
    province: 'สงขลา',
    description: 'ศูนย์การค้าขนาดใหญ่ใจกลางเมืองหาดใหญ่'
  },
  {
    id: 'hatyai-airport',
    name: 'สนามบินนานาชาติหาดใหญ่',
    category: 'transport',
    lat: 6.93892,
    lng: 100.39270,
    aliases: ['สนามบิน', 'สนามบินหาดใหญ่', 'ท่าอากาศยานหาดใหญ่', 'airport', 'hat yai airport', 'hdv', 'ท่าอากาศยานนานาชาติหาดใหญ่', 'สนามบินนานาชาติ'],
    province: 'สงขลา',
    description: 'ท่าอากาศยานนานาชาติหาดใหญ่ ศูนย์กลางการบินภาคใต้'
  },
  {
    id: 'psu-hatyai',
    name: 'มหาวิทยาลัยสงขลานครินทร์ (ม.อ.)',
    category: 'education',
    lat: 7.00862,
    lng: 100.49841,
    aliases: ['มอ', 'ม.อ.', 'มอ.', 'psu', 'มหาวิทยาลัยสงขลานครินทร์', 'สงขลานครินทร์', 'ม.สงขลานครินทร์', 'มหาวิทยาลัย มอ', 'มหาลัย มอ', 'ปุณณกัณฑ์'],
    province: 'สงขลา',
    description: 'มหาวิทยาลัยหลักและศูนย์กลางการศึกษาภาคใต้'
  },
  {
    id: 'psu-hospital',
    name: 'โรงพยาบาลสงขลานครินทร์ (รพ.มอ.)',
    category: 'hospital',
    lat: 7.00941,
    lng: 100.49750,
    aliases: ['รพ.มอ', 'รพ. ม.อ.', 'รพ มอ', 'โรงพยาบาลมอ', 'โรงพยาบาล ม.อ.', 'โรงพยาบาลสงขลานครินทร์', 'รพ.สงขลานครินทร์'],
    province: 'สงขลา',
    description: 'โรงพยาบาลศูนย์การแพทย์ระดับตติยภูมิ'
  },
  {
    id: 'kimyong-market',
    name: 'ตลาดกิมหยง หาดใหญ่',
    category: 'shopping',
    lat: 7.00624,
    lng: 100.47055,
    aliases: ['กิมหยง', 'ตลาดกิมหยง', 'kim yong', 'kimyong'],
    province: 'สงขลา',
    description: 'ตลาดยอดนิยมใจกลางเมืองหาดใหญ่'
  },
  {
    id: 'chalatat-beach',
    name: 'หาดชลาทัศน์ สงขลา',
    category: 'attraction',
    lat: 7.18950,
    lng: 100.61520,
    aliases: ['ชลาทัศน์', 'หาดชลาทัศน์', 'สมิหลา', 'หาดสมิหลา', 'แหลมสมิหลา', 'ทะเลสงขลา'],
    province: 'สงขลา',
    description: 'ชายหาดแลนด์มาร์กเมืองสงขลา'
  },
  {
    id: 'hatyai-train-station',
    name: 'สถานีรถไฟชุมทางหาดใหญ่',
    category: 'transport',
    lat: 7.00388,
    lng: 100.46788,
    aliases: ['สถานีรถไฟหาดใหญ่', 'สถานีรถไฟ', 'รถไฟหาดใหญ่', 'ชุมทางหาดใหญ่', 'รถไฟ'],
    province: 'สงขลา',
    description: 'ชุมทางรถไฟหลักสายใต้'
  },
  {
    id: 'hatyai-bus-terminal',
    name: 'สถานีขนส่งผู้โดยสารหาดใหญ่ (บขส.)',
    category: 'transport',
    lat: 6.99580,
    lng: 100.48290,
    aliases: ['บขส', 'บขส.', 'บขส หาดใหญ่', 'ขนส่งหาดใหญ่', 'สถานีขนส่งหาดใหญ่', 'สถานีขนส่ง'],
    province: 'สงขลา',
    description: 'สถานีขนส่งผู้โดยสารหลัก อ.หาดใหญ่'
  },
  {
    id: 'hatyai-park',
    name: 'สวนสาธารณะเทศบาลนครหาดใหญ่ (คอหงส์)',
    category: 'attraction',
    lat: 7.04250,
    lng: 100.50980,
    aliases: ['สวนสาธารณะหาดใหญ่', 'สวนสาธารณะ', 'คอหงส์', 'เขาคอหงส์', 'กระเช้าลอยฟ้าหาดใหญ่'],
    province: 'สงขลา',
    description: 'สวนสาธารณะและจุดชมวิวเขาคอหงส์'
  },
  {
    id: 'klonghae-market',
    name: 'ตลาดน้ำคลองแห หาดใหญ่',
    category: 'attraction',
    lat: 7.04780,
    lng: 100.47350,
    aliases: ['คลองแห', 'ตลาดน้ำคลองแห', 'ตลาดคลองแห'],
    province: 'สงขลา',
    description: 'ตลาดน้ำวัฒนธรรมชื่อดัง'
  },
  {
    id: 'diana-complex',
    name: 'ไดอาน่า คอมเพล็กซ์ หาดใหญ่',
    category: 'shopping',
    lat: 7.00010,
    lng: 100.48150,
    aliases: ['ไดอาน่า', 'ห้างไดอาน่า', 'diana'],
    province: 'สงขลา',
    description: 'ห้างสรรพสินค้าชั้นนำ ถ.ศรีภูวนารถ'
  },
  {
    id: 'lotus-psu',
    name: 'โลตัส หาดใหญ่ (สาขา ม.อ.)',
    category: 'shopping',
    lat: 7.00750,
    lng: 100.49200,
    aliases: ['โลตัส มอ', 'โลตัส ม.อ.', 'โลตัส หาดใหญ่', 'lotus มอ'],
    province: 'สงขลา',
    description: 'โลตัส สาขาหน้ามหาวิทยาลัยสงขลานครินทร์'
  },
  {
    id: 'bigc-extra-hatyai',
    name: 'บิ๊กซี เอ็กซ์ตร้า หาดใหญ่',
    category: 'shopping',
    lat: 7.01750,
    lng: 100.48700,
    aliases: ['บิ๊กซี หาดใหญ่', 'บิ๊กซีเอ็กซ์ตร้า', 'big c หาดใหญ่', 'big c extra'],
    province: 'สงขลา',
    description: 'บิ๊กซี เอ็กซ์ตร้า ถ.เพชรเกษม'
  },

  // --- กรุงเทพฯ & ปริมณฑล (รองรับผู้ใช้ทั่วประเทศ) ---
  {
    id: 'bkk-suvarnabhumi',
    name: 'ท่าอากาศยานสุวรรณภูมิ',
    category: 'transport',
    lat: 13.6900,
    lng: 100.7501,
    aliases: ['สุวรรณภูมิ', 'สนามบินสุวรรณภูมิ', 'suvarnabhumi', 'bkk'],
    province: 'สมุทรปราการ',
    description: 'ท่าอากาศยานนานาชาติหลักของประเทศไทย'
  },
  {
    id: 'bkk-donmueang',
    name: 'ท่าอากาศยานดอนเมือง',
    category: 'transport',
    lat: 13.9126,
    lng: 100.6067,
    aliases: ['ดอนเมือง', 'สนามบินดอนเมือง', 'don mueang', 'dmk'],
    province: 'กรุงเทพมหานคร',
    description: 'ท่าอากาศยานดอนเมือง'
  },
  {
    id: 'bkk-central-world',
    name: 'เซ็นทรัลเวิลด์ (CentralWorld)',
    category: 'shopping',
    lat: 13.7466,
    lng: 100.5393,
    aliases: ['เซ็นทรัลเวิลด์', 'central world', 'centralworld', 'ctw'],
    province: 'กรุงเทพมหานคร',
    description: 'ศูนย์การค้าไลฟ์สไตล์ใจกลางราชประสงค์'
  },
  {
    id: 'bkk-central-ladprao',
    name: 'เซ็นทรัล ลาดพร้าว',
    category: 'shopping',
    lat: 13.8163,
    lng: 100.5606,
    aliases: ['เซ็นทรัลลาดพร้าว', 'เซ็นทรัล ลาดพร้าว', 'central ladprao'],
    province: 'กรุงเทพมหานคร',
    description: 'ศูนย์การค้ายอดนิยมย่านลาดพร้าว'
  },
  {
    id: 'bkk-siam-paragon',
    name: 'สยามพารากอน',
    category: 'shopping',
    lat: 13.7460,
    lng: 100.5349,
    aliases: ['สยามพารากอน', 'พารากอน', 'siam paragon', 'สยาม'],
    province: 'กรุงเทพมหานคร',
    description: 'ศูนย์การค้าระดับโลกใจกลางสยาม'
  },
  {
    id: 'bkk-chula',
    name: 'จุฬาลงกรณ์มหาวิทยาลัย',
    category: 'education',
    lat: 13.7380,
    lng: 100.5320,
    aliases: ['จุฬา', 'จุฬาฯ', 'chula', 'จุฬาลงกรณ์'],
    province: 'กรุงเทพมหานคร',
    description: 'สถาบันอุดมศึกษาใจกลางกรุงเทพมหานคร'
  },

  // --- เชียงใหม่ ---
  {
    id: 'cnx-airport',
    name: 'ท่าอากาศยานเชียงใหม่',
    category: 'transport',
    lat: 18.7668,
    lng: 98.9626,
    aliases: ['สนามบินเชียงใหม่', 'ท่าอากาศยานเชียงใหม่', 'cnx airport'],
    province: 'เชียงใหม่',
    description: 'สนามบินนานาชาติเชียงใหม่'
  },
  {
    id: 'cnx-central-festival',
    name: 'เซ็นทรัล เชียงใหม่ (เฟสติวัล)',
    category: 'shopping',
    lat: 18.8025,
    lng: 99.0178,
    aliases: ['เซ็นทรัลเชียงใหม่', 'เซ็นทรัล เชียงใหม่', 'เซ็นทรัลเฟสเชียงใหม่'],
    province: 'เชียงใหม่',
    description: 'ศูนย์การค้าใหญ่ที่สุดในภาคเหนือ'
  },
  {
    id: 'cnx-cmu',
    name: 'มหาวิทยาลัยเชียงใหม่ (มช.)',
    category: 'education',
    lat: 18.8029,
    lng: 98.9507,
    aliases: ['มช', 'ม.ช.', 'มช.', 'มหาวิทยาลัยเชียงใหม่', 'ม.เชียงใหม่', 'cmu'],
    province: 'เชียงใหม่',
    description: 'มหาวิทยาลัยชื่อดังเชิงดอยสุเทพ'
  },

  // --- ภูเก็ต ---
  {
    id: 'hkt-airport',
    name: 'ท่าอากาศยานภูเก็ต',
    category: 'transport',
    lat: 8.1132,
    lng: 98.3168,
    aliases: ['สนามบินภูเก็ต', 'ท่าอากาศยานภูเก็ต', 'phuket airport'],
    province: 'ภูเก็ต',
    description: 'สนามบินนานาชาติภูเก็ต'
  },
  {
    id: 'hkt-central',
    name: 'เซ็นทรัล ภูเก็ต (ฟลอเรสต้า / เฟสติวัล)',
    category: 'shopping',
    lat: 7.8920,
    lng: 98.3670,
    aliases: ['เซ็นทรัลภูเก็ต', 'เซ็นทรัล ภูเก็ต', 'central phuket'],
    province: 'ภูเก็ต',
    description: 'ศูนย์การค้าระดับลักชัวรีใจกลางเกาะภูเก็ต'
  }
];

// คำเชื่อมบอกตำแหน่งในภาษาไทย (Spatial Prepositions)
const SPATIAL_KEYWORDS = [
  'แถวๆ', 'แถว',
  'ใกล้ๆ', 'ใกล้',
  'รอบๆ', 'รอบ',
  'ติดกับ', 'ติด',
  'โซน', 'ย่าน',
  'บริเวณ', 'ทางไป',
  'ตรงข้าม', 'หน้า',
  'หลัง', 'ข้าง'
];

/**
 * แก้ไขคำสะกดผิดทั่วไปที่พบบ่อย (Typos Normalization)
 */
function normalizeThaiText(text: string): string {
  return text
    .replace(/เซ้นทรัล|เซนทรัล|เซ็นทรัลล/g, 'เซ็นทรัล')
    .replace(/สนามบินน/g, 'สนามบิน')
    .replace(/มอ\./g, 'ม.อ.')
    .replace(/รพ\.มอ\./g, 'รพ.มอ')
    .trim();
}

/**
 * 1. วิเคราะห์เจตนาของคำค้นหา (NLP & Intent Parser)
 * แปลง "บ้านแถวเซ้นทรัล" -> { type: 'house', spatialIntent: true, landmark: CentralFestival }
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const normalized = normalizeThaiText(rawQuery);
  const lower = normalized.toLowerCase();

  let spatialIntent = false;
  let propertyType: ParsedSearchIntent['propertyType'] = undefined;
  let listingType: ParsedSearchIntent['listingType'] = undefined;

  // 1.1 ตรวจจับประเภทอสังหาริมทรัพย์
  if (/บ้านเดี่ยว|บ้านสองชั้น|บ้านพัก|บ้าน/i.test(lower)) {
    propertyType = 'house';
  } else if (/คอนโดมิเนียม|คอนโด/i.test(lower)) {
    propertyType = 'condo';
  } else if (/ทาวน์โฮม|ทาวน์เฮ้าส์|ทาวน์เฮาส์/i.test(lower)) {
    propertyType = 'townhome';
  } else if (/ที่ดิน|แปลงที่ดิน/i.test(lower)) {
    propertyType = 'land';
  }

  // 1.2 ตรวจจับประเภทสัญญา ซื้อ / ขาย / เช่า
  if (/เช่า|ให้เช่า|ค่าเช่า/i.test(lower)) {
    listingType = 'rent';
  } else if (/ซื้อ|ขาย/i.test(lower)) {
    listingType = 'sale';
  }

  // 1.3 ตัดคำบอกประเภททรัพย์และคำซื้อขายออกเพื่อหาคำบอกตำแหน่ง
  let workingText = lower
    .replace(/บ้านเดี่ยว|บ้าน|คอนโดมิเนียม|คอนโด|ทาวน์โฮม|ทาวน์เฮ้าส์|ที่ดิน/g, ' ')
    .replace(/ขาย|เช่า|ให้เช่า|ซื้อ/g, ' ')
    .trim();

  // 1.4 ตรวจสอบว่ามีคำบอกตำแหน่งหรือไม่ (เช่น "แถว", "ใกล้")
  for (const spatialWord of SPATIAL_KEYWORDS) {
    if (workingText.includes(spatialWord)) {
      spatialIntent = true;
      workingText = workingText.replace(new RegExp(spatialWord, 'g'), ' ');
    }
  }

  const landmarkCandidate = workingText.trim().replace(/\s+/g, ' ');

  // 1.5 ค้นหาใน Curated Landmarks
  let detectedLandmark = findCuratedLandmark(landmarkCandidate);

  // ถ้ายังไม่เจอ ลองค้นหาด้วย rawQuery หรือคำที่ normalize แล้ว
  if (!detectedLandmark) {
    detectedLandmark = findCuratedLandmark(normalized);
  }

  // ถ้าเจอ Landmark แม้ผู้ใช้ไม่ได้พิมพ์คำว่า "แถว" หรือ "ใกล้" ตรงๆ (เช่น พิมพ์แค่ "เซ็นทรัล" หรือ "สนามบิน")
  // ให้ถือว่าเป็น Spatial Intent อัตโนมัติ เพื่อนำเสนอบ้านรอบๆ ทันที!
  if (detectedLandmark) {
    spatialIntent = true;
  }

  return {
    originalQuery: rawQuery,
    cleanQuery: landmarkCandidate || rawQuery,
    spatialIntent,
    propertyType,
    listingType,
    detectedLandmark,
    landmarkCandidate
  };
}

/**
 * 2. ค้นหา Landmark ใน Curated Master List
 */
export function findCuratedLandmark(queryText: string): LandmarkTarget | null {
  if (!queryText || queryText.trim().length === 0) return null;
  const q = normalizeThaiText(queryText).toLowerCase().trim();

  // 2.1 ตรวจสอบความตรงกันแบบ 100% หรือตรงกับ Alias ก่อน (ความแม่นยำสูงสุด)
  for (const item of CURATED_LANDMARKS) {
    if (item.name.toLowerCase() === q) return item;
    if (item.aliases.some((alias) => alias.toLowerCase() === q)) return item;
  }

  // 2.2 ตรวจสอบแบบ Substring Match
  // ลำดับความสำคัญ: ถ้าค้นหา "เซ็นทรัล" ให้เลือกเซ็นทรัลหาดใหญ่ก่อนในบริบทหาดใหญ่
  for (const item of CURATED_LANDMARKS) {
    if (item.aliases.some((alias) => q.includes(alias.toLowerCase()) || alias.toLowerCase().includes(q))) {
      return item;
    }
  }

  return null;
}

/**
 * 3. สูตรคำนวณระยะทาง Haversine Formula (ระยะทางโค้งจริงบนผิวโลก)
 * ให้ผลลัพธ์เป็นกิโลเมตร (km) แม่นยำระดับเมตร
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  
  const R = 6371; // รัศมีโลกเฉลี่ย (กิโลเมตร)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}

/**
 * 4. จัดรูปแบบระยะทางให้อ่านเข้าใจง่าย
 * ตัวอย่าง: 0.85 -> "850 ม.", 2.4 -> "2.4 กม."
 */
export function formatDistanceText(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} ม.`;
  }
  return `${distanceKm.toFixed(1)} กม.`;
}

/**
 * 5. กรองและจัดเรียงอสังหาริมทรัพย์ตามระยะทางจาก Landmark
 * - คำนวณระยะทางของทรัพย์ทุกหลัง
 * - กรองเฉพาะหลังที่อยู่ในรัศมี (maxDistanceKm เช่น 10 กม.)
 * - จัดเรียงจากใกล้ที่สุดไปไกลที่สุด (Ascending Order)
 */
export function filterAndSortByProximity(
  properties: Property[],
  landmark: LandmarkTarget,
  maxDistanceKm: number = 10
): Property[] {
  const calculated = properties
    .map((prop) => {
      if (prop.latitude == null || prop.longitude == null) {
        return {
          ...prop,
          distanceKm: undefined,
          distanceText: undefined
        };
      }

      const dist = calculateDistanceKm(
        landmark.lat,
        landmark.lng,
        Number(prop.latitude),
        Number(prop.longitude)
      );

      return {
        ...prop,
        distanceKm: dist,
        distanceText: formatDistanceText(dist)
      };
    })
    .filter((prop) => {
      // ถ้าไม่ได้กำหนดรัศมีจำกัด (maxDistanceKm <= 0) ให้นำทรัพย์ทั้งหมดมารวม
      if (maxDistanceKm <= 0) return true;
      // กรองเฉพาะทรัพย์ที่มีพิกัดและอยู่ในรัศมี
      if (prop.distanceKm != null) {
        return prop.distanceKm <= maxDistanceKm;
      }
      return false;
    });

  // จัดเรียง: ใกล้ที่สุดขึ้นก่อน
  return calculated.sort((a, b) => {
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}

/**
 * 6. ดึงรายการแลนด์มาร์กยอดนิยมสำหรับแสดงปุ่มลัด / Autocomplete
 */
export function getPopularLandmarks(): LandmarkTarget[] {
  // ดึง 6 สถานที่สำคัญหลัก
  return CURATED_LANDMARKS.slice(0, 6);
}
