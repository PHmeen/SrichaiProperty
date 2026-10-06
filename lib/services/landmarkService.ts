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
  priceMin?: string;
  priceMax?: string;
  bedrooms?: string;
  facilities?: {
    pool?: boolean;
    petFriendly?: boolean;
    parking?: boolean;
    gym?: boolean;
    furnished?: boolean;
    security?: boolean;
  };
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
  {
    id: 'songkhla-koh-yor',
    name: 'เกาะยอ (สงขลา)',
    category: 'attraction',
    lat: 7.1580,
    lng: 100.5500,
    aliases: ['เกาะยอ', 'สะพานติณ', 'สะพานติณสูลานนท์', 'ติณสูลานนท์', 'เกาะยอสงขลา', 'บ้านเกาะยอ'],
    province: 'สงขลา',
    description: 'เกาะยอและสะพานติณสูลานนท์ ทะเลสาบสงขลา'
  },
  {
    id: 'hatyai-hospital',
    name: 'โรงพยาบาลหาดใหญ่',
    category: 'hospital',
    lat: 7.0142,
    lng: 100.4731,
    aliases: ['รพ.หาดใหญ่', 'รพ หาดใหญ่', 'โรงพยาบาลหาดใหญ่', 'รพ. ศูนย์หาดใหญ่'],
    province: 'สงขลา',
    description: 'โรงพยาบาลศูนย์หาดใหญ่ ถ.รัถการ'
  },
  {
    id: 'bangkok-hatyai-hospital',
    name: 'โรงพยาบาลกรุงเทพหาดใหญ่',
    category: 'hospital',
    lat: 7.0012,
    lng: 100.4932,
    aliases: ['รพ.กรุงเทพหาดใหญ่', 'รพ.กรุงเทพ หาดใหญ่', 'โรงพยาบาลกรุงเทพหาดใหญ่', 'รพ.กรุงเทพ', 'กรุงเทพหาดใหญ่'],
    province: 'สงขลา',
    description: 'โรงพยาบาลเอกชนชั้นนำเครือ BDMS ถ.คลองเรียน 1'
  },
  {
    id: 'sikarin-hatyai-hospital',
    name: 'โรงพยาบาลศิครินทร์ หาดใหญ่',
    category: 'hospital',
    lat: 7.0125,
    lng: 100.4862,
    aliases: ['รพ.ศิครินทร์', 'รพ ศิครินทร์', 'โรงพยาบาลศิครินทร์', 'ศิครินทร์หาดใหญ่', 'ศิครินทร์'],
    province: 'สงขลา',
    description: 'โรงพยาบาลเอกชน ถ.นิพัทธ์สงเคราะห์ 1'
  },
  {
    id: 'songkhla-hospital',
    name: 'โรงพยาบาลสงขลา (เกาะยอ)',
    category: 'hospital',
    lat: 7.1520,
    lng: 100.5620,
    aliases: ['รพ.สงขลา', 'รพ สงขลา', 'โรงพยาบาลสงขลา'],
    province: 'สงขลา',
    description: 'โรงพยาบาลศูนย์ประจำจังหวัดสงขลา ใกล้หัวสะพานติณฯ'
  },
  {
    id: 'thaksin-university',
    name: 'มหาวิทยาลัยทักษิณ สงขลา',
    category: 'education',
    lat: 7.1645,
    lng: 100.6120,
    aliases: ['ม.ทักษิณ', 'ม ทักษิณ', 'มหาวิทยาลัยทักษิณ', 'ม.ทักษิณ สงขลา', 'thaksin university'],
    province: 'สงขลา',
    description: 'สถาบันอุดมศึกษา ถ.กาญจนวนิช เมืองสงขลา'
  },
  {
    id: 'hatyai-university',
    name: 'มหาวิทยาลัยหาดใหญ่',
    category: 'education',
    lat: 6.9855,
    lng: 100.4725,
    aliases: ['ม.หาดใหญ่', 'ม หาดใหญ่', 'มหาวิทยาลัยหาดใหญ่', 'คลองหวะ', 'ม.หาดใหญ่ คลองหวะ'],
    province: 'สงขลา',
    description: 'มหาวิทยาลัยเอกชนย่านคลองหวะ หาดใหญ่'
  },
  {
    id: 'rmutsv-songkhla',
    name: 'มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย',
    category: 'education',
    lat: 7.2025,
    lng: 100.5980,
    aliases: ['มทร.ศรีวิชัย', 'มทร ศรีวิชัย', 'ราชมงคลสงขลา', 'เทคโนสงขลา', 'มทร.'],
    province: 'สงขลา',
    description: 'มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย เมืองสงขลา'
  },
  {
    id: 'skru-songkhla',
    name: 'มหาวิทยาลัยราชภัฏสงขลา',
    category: 'education',
    lat: 7.1720,
    lng: 100.6150,
    aliases: ['ราชภัฏสงขลา', 'ม.ราชภัฏสงขลา', 'มรภ.สงขลา', 'ราชภัฏ สงขลา'],
    province: 'สงขลา',
    description: 'มหาวิทยาลัยราชภัฏสงขลา ถ.กาญจนวนิช'
  },
  {
    id: 'yordwittayalai-school',
    name: 'โรงเรียนหาดใหญ่วิทยาลัย (ญ.ว.)',
    category: 'education',
    lat: 7.0122,
    lng: 100.4755,
    aliases: ['ญว', 'ญ.ว.', 'รร.ญ.ว.', 'โรงเรียนญว', 'หาดใหญ่วิทยาลัย', 'โรงเรียนหาดใหญ่วิทยาลัย'],
    province: 'สงขลา',
    description: 'โรงเรียนมัธยมศึกษาชั้นนำ ถ.เพชรเกษม หาดใหญ่'
  },
  {
    id: 'yorsor-school',
    name: 'โรงเรียนหาดใหญ่วิทยาลัยสมบูรณ์กุลกันยา (ญ.ส.)',
    category: 'education',
    lat: 7.0090,
    lng: 100.4680,
    aliases: ['ญส', 'ญ.ส.', 'รร.ญ.ส.', 'โรงเรียนญส', 'หาดใหญ่วิทยาลัย 2'],
    province: 'สงขลา',
    description: 'โรงเรียนมัธยมศึกษา ถ.พลพิชัย หาดใหญ่'
  },
  {
    id: 'saengthong-school',
    name: 'โรงเรียนแสงทองวิทยา',
    category: 'education',
    lat: 7.0040,
    lng: 100.4780,
    aliases: ['แสงทอง', 'แสงทองวิทยา', 'รร.แสงทอง', 'โรงเรียนแสงทอง'],
    province: 'สงขลา',
    description: 'โรงเรียนชื่อดังใจกลางเมืองหาดใหญ่'
  },
  {
    id: 'thida-school',
    name: 'โรงเรียนธิดานุเคราะห์',
    category: 'education',
    lat: 7.0020,
    lng: 100.4760,
    aliases: ['ธิดานุเคราะห์', 'ธิดา', 'รร.ธิดานุเคราะห์', 'โรงเรียนธิดานุเคราะห์'],
    province: 'สงขลา',
    description: 'โรงเรียนคาทอลิกชื่อดัง ถ.แสงศรี หาดใหญ่'
  },
  {
    id: 'zone-khet-8',
    name: 'ย่านเขต 8 (ถนนราษฎร์อุทิศ หาดใหญ่)',
    category: 'other',
    lat: 7.0095,
    lng: 100.4635,
    aliases: ['เขต 8', 'เขต8', 'ราษฎร์อุทิศ', 'ถ.ราษฎร์อุทิศ', 'ถนนราษฎร์อุทิศ', 'ย่านเขต 8'],
    province: 'สงขลา',
    description: 'ย่านการค้าและแหล่งของกินยอดนิยมเมืองหาดใหญ่'
  },
  {
    id: 'lee-gardens-downtown',
    name: 'ใจกลางเมืองหาดใหญ่ (สาย 1-2-3 / ลีการ์เดนส์)',
    category: 'shopping',
    lat: 7.0055,
    lng: 100.4705,
    aliases: ['ลีการ์เดนส์', 'สาย 1', 'สาย 2', 'สาย 3', 'เสน่หานุสรณ์', 'นิพัทธ์อุทิศ', 'ใจกลางเมืองหาดใหญ่', 'ตัวเมืองหาดใหญ่', 'ลีการ์เด้น'],
    province: 'สงขลา',
    description: 'ย่านใจกลางเมืองและถนนคนเดินการค้าสำคัญ'
  },
  {
    id: 'zone-khuan-lang',
    name: 'โซนควนลัง หาดใหญ่',
    category: 'other',
    lat: 6.9950,
    lng: 100.4320,
    aliases: ['ควนลัง', 'ต.ควนลัง', 'ตำบลควนลัง', 'แยกควนลัง', 'สนามบินนอก'],
    province: 'สงขลา',
    description: 'พื้นที่อยู่อาศัยขยายตัวและเส้นทางสู่สนามบิน'
  },
  {
    id: 'zone-ban-phru',
    name: 'โซนบ้านพรุ หาดใหญ่',
    category: 'other',
    lat: 6.9550,
    lng: 100.4850,
    aliases: ['บ้านพรุ', 'ต.บ้านพรุ', 'ตำบลบ้านพรุ', 'เทศบาลเมืองบ้านพรุ'],
    province: 'สงขลา',
    description: 'พื้นที่ชุมชนอยู่อาศัยตอนใต้ของหาดใหญ่'
  },
  {
    id: 'zone-nam-noi',
    name: 'โซนน้ำน้อย หาดใหญ่-สงขลา',
    category: 'other',
    lat: 7.0780,
    lng: 100.5420,
    aliases: ['น้ำน้อย', 'ต.น้ำน้อย', 'ตำบลน้ำน้อย', 'ทางไปสงขลา'],
    province: 'สงขลา',
    description: 'พื้นที่เชื่อมต่อระหว่างเมืองหาดใหญ่และเมืองสงขลา'
  },
  {
    id: 'zone-singhanakhon',
    name: 'โซนสิงหนคร (สงขลา)',
    category: 'other',
    lat: 7.2350,
    lng: 100.5480,
    aliases: ['สิงหนคร', 'อ.สิงหนคร', 'อำเภอสิงหนคร', 'หัวเขา'],
    province: 'สงขลา',
    description: 'พื้นที่ท่าเรือน้ำลึกและศูนย์กลางเศรษฐกิจฝั่งสิงหนคร'
  },
  {
    id: 'songkhla-old-town',
    name: 'ย่านเมืองเก่าสงขลา (ถนนนางงาม)',
    category: 'attraction',
    lat: 7.1950,
    lng: 100.5890,
    aliases: ['เมืองเก่าสงขลา', 'ถนนนางงาม', 'ย่านเมืองเก่าสงขลา', 'ตัวเมืองสงขลา', 'เมืองสงขลา'],
    province: 'สงขลา',
    description: 'ย่านสถาปัตยกรรมชิโน-โปรตุกีสและวัฒนธรรมสงขลา'
  },
  {
    id: 'zone-sadao',
    name: 'โซนอำเภอสะเดา / ด่านนอก',
    category: 'other',
    lat: 6.5240,
    lng: 100.4210,
    aliases: ['สะเดา', 'อ.สะเดา', 'ด่านนอก', 'ด่านสะเดา', 'ชายแดนสะเดา'],
    province: 'สงขลา',
    description: 'อำเภอเศรษฐกิจการค้าชายแดนไทย-มาเลเซีย'
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
 * แปลง "บ้านแถวเซ้นทรัล ไม่เกิน 3 ล้าน 3 นอน มีสระว่ายน้ำ"
 * -> { type: 'house', priceMax: '3000000', bedrooms: '3', facilities: { pool: true }, landmark: CentralFestival }
 */
export function parseSearchIntent(rawQuery: string): ParsedSearchIntent {
  const normalized = normalizeThaiText(rawQuery);
  const lower = normalized.toLowerCase();

  let spatialIntent = false;
  let propertyType: ParsedSearchIntent['propertyType'] = undefined;
  let listingType: ParsedSearchIntent['listingType'] = undefined;
  let priceMin: string | undefined = undefined;
  let priceMax: string | undefined = undefined;
  let bedrooms: string | undefined = undefined;
  const facilities: NonNullable<ParsedSearchIntent['facilities']> = {};

  let workingText = lower;

  // 1.1 สกัดงบประมาณ / ราคา (Budget Extraction)
  // กรณี 1: ช่วงราคา X - Y ล้าน หรือ X ถึง Y ล้าน
  const rangeMatch = workingText.match(/(\d+(?:\.\d+)?)\s*(?:-|ถึง)\s*(\d+(?:\.\d+)?)\s*ล้าน/);
  if (rangeMatch) {
    priceMin = Math.round(parseFloat(rangeMatch[1]) * 1000000).toString();
    priceMax = Math.round(parseFloat(rangeMatch[2]) * 1000000).toString();
    workingText = workingText.replace(rangeMatch[0], ' ');
  }

  // กรณี 2: ไม่เกิน / ต่ำกว่า / งบ X ล้าน
  if (!priceMax) {
    const maxMilMatch = workingText.match(/(?:ไม่เกิน|ต่ำกว่า|งบไม่เกิน|งบ)\s*(\d+(?:\.\d+)?)\s*ล้าน/);
    if (maxMilMatch) {
      priceMax = Math.round(parseFloat(maxMilMatch[1]) * 1000000).toString();
      workingText = workingText.replace(maxMilMatch[0], ' ');
    }
  }

  // กรณี 3: ไม่เกิน / ต่ำกว่า / งบ X แสน
  if (!priceMax) {
    const maxSaenMatch = workingText.match(/(?:ไม่เกิน|ต่ำกว่า|งบไม่เกิน|งบ)\s*(\d+(?:\.\d+)?)\s*แสน/);
    if (maxSaenMatch) {
      priceMax = Math.round(parseFloat(maxSaenMatch[1]) * 100000).toString();
      workingText = workingText.replace(maxSaenMatch[0], ' ');
    }
  }

  // กรณี 4: มากกว่า / เกิน X ล้าน
  if (!priceMin) {
    const minMilMatch = workingText.match(/(?:มากกว่า|เกิน|ตั้งแต่)\s*(\d+(?:\.\d+)?)\s*ล้าน/);
    if (minMilMatch) {
      priceMin = Math.round(parseFloat(minMilMatch[1]) * 1000000).toString();
      workingText = workingText.replace(minMilMatch[0], ' ');
    }
  }

  // กรณี 5: ไม่เกิน / ต่ำกว่า / งบ X,XXX (บาท) เช่น ค่าเช่าไม่เกิน 15,000
  if (!priceMax) {
    const maxNumMatch = workingText.match(/(?:ไม่เกิน|ต่ำกว่า|งบไม่เกิน|งบ)\s*(\d[\d,]{3,})\s*(?:บาท)?/);
    if (maxNumMatch) {
      priceMax = maxNumMatch[1].replace(/,/g, '');
      workingText = workingText.replace(maxNumMatch[0], ' ');
    }
  }

  // 1.2 สกัดห้องนอน (Bedrooms Extraction)
  const bedMatch = workingText.match(/(\d+)\s*(?:ห้องนอน|ห้อง นอน|นอน)/);
  if (bedMatch) {
    bedrooms = bedMatch[1];
    workingText = workingText.replace(bedMatch[0], ' ');
  } else if (/สตูดิโอ|studio/i.test(workingText)) {
    bedrooms = '0';
    workingText = workingText.replace(/สตูดิโอ|studio/gi, ' ');
  }

  // 1.3 สกัดสิ่งอำนวยความสะดวก (Facilities Extraction)
  if (/สระว่ายน้ำ|สระน้ำ|มีสระ|pool/i.test(workingText)) {
    facilities.pool = true;
    workingText = workingText.replace(/สระว่ายน้ำ|สระน้ำ|มีสระ|pool/gi, ' ');
  }
  if (/สัตว์เลี้ยงได้|เลี้ยงสัตว์ได้|เลี้ยงสัตว์|สัตว์เลี้ยง|pet friendly|pet/i.test(workingText)) {
    facilities.petFriendly = true;
    workingText = workingText.replace(/สัตว์เลี้ยงได้|เลี้ยงสัตว์ได้|เลี้ยงสัตว์|สัตว์เลี้ยง|pet friendly|pet/gi, ' ');
  }
  if (/ที่จอดรถ|จอดรถ|ที่จอด|parking/i.test(workingText)) {
    facilities.parking = true;
    workingText = workingText.replace(/ที่จอดรถ|จอดรถ|ที่จอด|parking/gi, ' ');
  }
  if (/ฟิตเนส|ยิม|fitness|gym/i.test(workingText)) {
    facilities.gym = true;
    workingText = workingText.replace(/ฟิตเนส|ยิม|fitness|gym/gi, ' ');
  }
  if (/แต่งครบ|พร้อมอยู่|เฟอร์นิเจอร์|เฟอร์ฯ ครบ|เฟอร์ครบ|furnished/i.test(workingText)) {
    facilities.furnished = true;
    workingText = workingText.replace(/แต่งครบ|พร้อมอยู่|เฟอร์นิเจอร์|เฟอร์ฯ ครบ|เฟอร์ครบ|furnished/gi, ' ');
  }
  if (/รักษาความปลอดภัย|cctv|รปภ|security/i.test(workingText)) {
    facilities.security = true;
    workingText = workingText.replace(/รักษาความปลอดภัย|cctv|รปภ|security/gi, ' ');
  }

  // 1.4 ตรวจจับประเภทอสังหาริมทรัพย์
  if (/บ้านเดี่ยว|บ้านสองชั้น|บ้านพัก|บ้าน/i.test(workingText)) {
    propertyType = 'house';
  } else if (/คอนโดมิเนียม|คอนโด/i.test(workingText)) {
    propertyType = 'condo';
  } else if (/ทาวน์โฮม|ทาวน์เฮ้าส์|ทาวน์เฮาส์/i.test(workingText)) {
    propertyType = 'townhome';
  } else if (/ที่ดิน|แปลงที่ดิน/i.test(workingText)) {
    propertyType = 'land';
  }

  // 1.5 ตรวจจับประเภทสัญญา ซื้อ / ขาย / เช่า
  if (/เช่า|ให้เช่า|ค่าเช่า/i.test(workingText)) {
    listingType = 'rent';
  } else if (/ซื้อ|ขาย/i.test(workingText)) {
    listingType = 'sale';
  }

  // 1.6 ตัดคำบอกประเภททรัพย์และคำซื้อขายออกเพื่อหาคำบอกตำแหน่ง
  workingText = workingText
    .replace(/บ้านเดี่ยว|บ้าน|คอนโดมิเนียม|คอนโด|ทาวน์โฮม|ทาวน์เฮ้าส์|ทาวน์เฮาส์|ที่ดิน/gi, ' ')
    .replace(/ขาย|เช่า|ให้เช่า|ซื้อ/gi, ' ')
    .replace(/พร้อม|มี|ราคา|งบ/gi, ' ')
    .trim();

  // 1.7 ตรวจสอบว่ามีคำบอกตำแหน่งหรือไม่ (เช่น "แถว", "ใกล้")
  for (const spatialWord of SPATIAL_KEYWORDS) {
    if (workingText.includes(spatialWord)) {
      spatialIntent = true;
      workingText = workingText.replace(new RegExp(spatialWord, 'g'), ' ');
    }
  }

  const landmarkCandidate = workingText.trim().replace(/\s+/g, ' ');

  // 1.8 ค้นหาใน Curated Landmarks
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

  const hasFacilities = Object.values(facilities).some(Boolean);

  return {
    originalQuery: rawQuery,
    cleanQuery: landmarkCandidate || rawQuery,
    spatialIntent,
    propertyType,
    listingType,
    detectedLandmark,
    landmarkCandidate,
    priceMin,
    priceMax,
    bedrooms,
    facilities: hasFacilities ? facilities : undefined,
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
  // ดึง 8 สถานที่สำคัญยอดนิยมในหาดใหญ่และสงขลา
  const popularIds = [
    'hatyai-central',
    'hatyai-airport',
    'psu-hatyai',
    'psu-hospital',
    'kimyong-market',
    'songkhla-koh-yor',
    'zone-khet-8',
    'chalatat-beach'
  ];
  const list = CURATED_LANDMARKS.filter((lm) => popularIds.includes(lm.id));
  return list.length > 0 ? list : CURATED_LANDMARKS.slice(0, 8);
}
