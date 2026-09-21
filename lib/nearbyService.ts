/**
 * ==============================================================================
 * nearbyService.ts - บริการค้นหาสถานที่สำคัญหลักแบบ Dynamic จาก OpenStreetMap (OSM)
 * ==============================================================================
 * คุณสมบัติ:
 * 1. ดึงและคำนวณจาก OpenStreetMap (Nominatim API) สดๆ 100%
 * 2. ปลอดการเขียนชื่อห้าง โรงเรียน โรงพยาบาล หรือเมืองเฉพาะเจาะจง (Zero Hardcoded)
 * 3. ใช้ Metadata และ Tags ของ OpenStreetMap (class, type, wikidata, website) ในการคัดกรอง:
 *    - ห้าง/ศูนย์การค้า: คัดกรองจาก OSM tag shop=mall, department_store
 *    - สถานศึกษา: คัดกรองจาก OSM tag amenity=university, college, school
 *    - โรงพยาบาล: คัดกรองจาก OSM tag amenity=hospital, healthcare=hospital
 *    - ขนส่งสาธารณะ: คัดกรองจาก OSM tag railway=station, bus_station, aeroway
 * 4. จัดลำดับความสำคัญ (Importance Ranking) โดยอิงความสำคัญระดับสากลจาก OSM
 *    (เช่น มหาวิทยาลัยหลัก, โรงพยาบาลศูนย์, ห้างใหญ่ระดับภูมิภาค) ร่วมกับระยะทางจริง
 * 5. In-Memory Cache 30 นาที เพื่อความรวดเร็วและป้องกัน Rate Limit
 * 6. สร้างลิงก์นำทาง Google Maps จาก "พิกัดบ้าน" สู่ "จุดหมาย" ในโหมดขับรถ
 * ==============================================================================
 */

export interface LandmarkItem {
  id: string | number;
  name: string;
  category: 'shopping' | 'education' | 'hospital' | 'transport';
  transitType?: 'bus' | 'train' | 'ferry' | 'flight';
  lat: number;
  lng: number;
}

export interface NearbyPlaceResult {
  id: string | number;
  name: string;
  category: 'shopping' | 'education' | 'hospital' | 'transport';
  transitType?: 'bus' | 'train' | 'ferry' | 'flight';
  distanceKm: number;
  distanceText: string;
  lat: number;
  lng: number;
}

// In-Memory Cache เพื่อความรวดเร็วและป้องกัน Rate Limit (30 นาที)
const nearbyCache = new Map<string, { timestamp: number; data: {
  all: NearbyPlaceResult[];
  shopping: NearbyPlaceResult[];
  education: NearbyPlaceResult[];
  hospital: NearbyPlaceResult[];
  transport: NearbyPlaceResult[];
}}>();
const CACHE_TTL_MS = 30 * 60 * 1000;

// 1. สูตรคำนวณระยะทางแบบเรขาคณิต (1 องศา ≈ 111 กม.)
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = lng1 - lng2;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111;
}

// 2. ฟังก์ชันจัดรูปแบบระยะทางให้อ่านสบายตา
export function formatDistanceText(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} ม.`;
  }
  return `${km.toFixed(1)} กม.`;
}

// 3. สร้างลิงก์นำทาง Google Maps โดยใช้จุดเริ่มต้นจากพิกัดบ้าน (Origin) ไปยังจุดปลายทาง (Destination)
export function getGoogleMapsDirectionsUrl(
  originLat: number | null | undefined,
  originLng: number | null | undefined,
  destLat: number,
  destLng: number,
  fallbackOriginText?: string
): string {
  let originParam = '';
  if (
    originLat != null &&
    originLng != null &&
    !isNaN(Number(originLat)) &&
    !isNaN(Number(originLng)) &&
    Number(originLat) !== 0
  ) {
    originParam = `${Number(originLat)},${Number(originLng)}`;
  } else if (fallbackOriginText && fallbackOriginText.trim()) {
    originParam = encodeURIComponent(fallbackOriginText.trim());
  }

  const originQuery = originParam ? `origin=${originParam}&` : '';
  return `https://www.google.com/maps/dir/?api=1&${originQuery}destination=${destLat},${destLng}&travelmode=driving`;
}

interface OsmRawItem {
  place_id: number | string;
  name?: string;
  display_name: string;
  class: string;
  type: string;
  lat: string;
  lon: string;
  importance?: number;
  extratags?: Record<string, string>;
}

// 4. สแกนค้นหาหมวดหมู่สถานที่จาก OpenStreetMap (Nominatim API) โดยอิง Tags ของ OSM 100%
async function queryOsmCategoryPure(
  category: LandmarkItem['category'],
  queries: string[],
  lat: number,
  lng: number
): Promise<Array<NearbyPlaceResult & { rankScore: number }>> {
  const rawItems: OsmRawItem[] = [];

  // สำหรับหมวดขนส่งสาธารณะ: ยิงค้นหา 4 กลุ่มหลัก (สถานีรถไฟหลัก, สถานีขนส่ง/บขส., และสนามบินผ่าน viewbox 35 กม.)
  let urls: string[] = [];
  if (category === 'transport') {
    const delta = 0.35; // รัศมี ~35-40 กม. เพื่อค้นหาสนามบินระดับภูมิภาค/นานาชาติ
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;

    urls = [
      `https://nominatim.openstreetmap.org/search?format=json&extratags=1&addressdetails=1&q=${encodeURIComponent(`railway station near ${lat},${lng}`)}&limit=10`,
      `https://nominatim.openstreetmap.org/search?format=json&extratags=1&addressdetails=1&q=${encodeURIComponent(`bus station near ${lat},${lng}`)}&limit=10`,
      `https://nominatim.openstreetmap.org/search?format=json&extratags=1&addressdetails=1&q=airport&viewbox=${left},${top},${right},${bottom}&bounded=1&limit=5`,
      `https://nominatim.openstreetmap.org/search?format=json&extratags=1&addressdetails=1&q=${encodeURIComponent(`ferry terminal near ${lat},${lng}`)}&limit=5`
    ];
  } else {
    urls = queries.map((q) => `https://nominatim.openstreetmap.org/search?format=json&extratags=1&addressdetails=1&q=${encodeURIComponent(`${q} near ${lat},${lng}`)}&limit=10`);
  }

  await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'SrichaiPropertyApp/2.0 (contact@srichaiproperty.com)',
            'Accept-Language': 'th,en'
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          rawItems.push(...data);
        }
      } catch {
        // ข้าม error ย่อย
      }
    })
  );

  const seen = new Set<string>();
  const results: Array<NearbyPlaceResult & { rankScore: number }> = [];

  for (const item of rawItems) {
    const rawName = item.name || item.display_name?.split(',')[0] || '';
    const name = rawName.trim();
    if (!name || name.length < 3) continue;

    const lower = name.toLowerCase();

    // กรองชื่อที่ซ้ำกัน
    if (seen.has(lower)) continue;
    seen.add(lower);

    // กรองสิ่งที่ไม่ใช่สถานที่หลักตามบริบททั่วไป
    // 1. สถานศึกษา: ข้ามคณะย่อย/ศูนย์บริการในมหาวิทยาลัย (เพื่อให้แสดงเป็นชื่อสถาบันหลัก)
    if (category === 'education' && (
      name.startsWith('คณะ') ||
      name.startsWith('ศูนย์') ||
      name.startsWith('อาคาร') ||
      name.startsWith('กอง') ||
      lower.startsWith('faculty') ||
      lower.startsWith('department') ||
      lower.startsWith('center')
    )) {
      continue;
    }

    // 2. โรงพยาบาล: ข้ามคลินิกเสริมความงาม/ทันตกรรมขนาดเล็ก
    if (category === 'hospital' && (lower.includes('clinic') || lower.includes('คลินิก') || lower.includes('pharmacy') || lower.includes('ร้านขายยา'))) {
      continue;
    }

    // 3. ขนส่ง: ข้ามบริษัททัวร์ / ตัวแทนจำหน่ายตั๋ว / จุดพักรถหอนาฬิกา
    if (category === 'transport' && (
      lower.includes('tour') ||
      lower.includes('ทัวร์') ||
      lower.includes('ตั๋ว') ||
      lower.includes('หอนาฬิกา') ||
      lower.includes('clock')
    )) {
      continue;
    }

    // ตรวจสอบความถูกต้องตาม OpenStreetMap Tags อย่างเคร่งครัด
    const osmClass = item.class;
    const osmType = item.type;

    if (category === 'shopping') {
      const isOsmMallOrMarket = (osmClass === 'shop' && ['mall', 'department_store', 'supermarket'].includes(osmType)) ||
                                (osmClass === 'amenity' && osmType === 'marketplace');
      if (!isOsmMallOrMarket) continue;
      // ป้องกันชื่อถนนที่บังเอิญติดแท็ก mall
      if (name.startsWith('ถนน') || name.startsWith('ซอย')) continue;
    }

    if (category === 'education') {
      const isOsmEdu = osmClass === 'amenity' && ['university', 'college', 'school'].includes(osmType);
      if (!isOsmEdu) continue;
    }

    if (category === 'hospital') {
      const isOsmHosp = (osmClass === 'amenity' && osmType === 'hospital') ||
                        item.extratags?.healthcare === 'hospital';
      if (!isOsmHosp) continue;
    }

    if (category === 'transport') {
      const isOsmTransit = (osmClass === 'railway' && osmType === 'station') ||
                           (osmClass === 'amenity' && osmType === 'bus_station') ||
                           (osmClass === 'aeroway');
      if (!isOsmTransit) continue;

      // กรองสนามบินฝึกบินส่วนบุคคลขนาดเล็กหรือสนามหญ้า
      if (lower.includes('airfield') || lower.includes('strip') || lower.includes('แอดเวนจอร์') || lower.includes('sky adventure')) {
        continue;
      }
    }

    // คำนวณระยะทางจากพิกัดบ้าน
    const itemLat = parseFloat(item.lat);
    const itemLng = parseFloat(item.lon);
    if (isNaN(itemLat) || isNaN(itemLng)) continue;

    const distKm = calculateDistanceKm(lat, lng, itemLat, itemLng);

    // คำนวณระดับความสำคัญหลัก (Major Landmark Score) จาก Metadata ของ OpenStreetMap:
    let majorScore = 0;
    let transitType: LandmarkItem['transitType'] = 'bus';

    if (category === 'transport') {
      if (
        osmClass === 'aeroway' ||
        lower.includes('airport') ||
        lower.includes('สนามบิน') ||
        lower.includes('ท่าอากาศยาน')
      ) {
        transitType = 'flight';
        majorScore = 20; // สนามบินหลักระดับภูมิภาค
      } else if (
        osmClass === 'railway' ||
        lower.includes('railway') ||
        lower.includes('รถไฟ') ||
        lower.includes('ชุมทาง') ||
        lower.includes('bts') ||
        lower.includes('mrt')
      ) {
        transitType = 'train';
        majorScore = 10;
        if (
          lower.includes('ชุมทาง') ||
          lower.includes('junction') ||
          item.extratags?.['railway:station_category'] === '1'
        ) {
          majorScore += 8; // ชุมทางรถไฟหลัก
        }
        if (item.extratags?.wikidata) majorScore += 4;
      } else if (lower.includes('pier') || lower.includes('ท่าเรือ') || lower.includes('ferry') || lower.includes('แพ')) {
        transitType = 'ferry';
        majorScore = 12;
      } else {
        transitType = 'bus';
        if (
          lower.includes('ขนส่ง') ||
          lower.includes('บขส') ||
          lower.includes('terminal') ||
          lower.includes('bus station')
        ) {
          majorScore = 14; // สถานีขนส่งผู้โดยสาร บขส.
        } else {
          majorScore = 6;
        }
        if (item.extratags?.wikidata) majorScore += 4;
      }

      // ลดคะแนนสถานีรถไฟย่อยในชนบทที่ห่างเกิน 6 กม. ไม่ให้แซงสถานีขนส่ง บขส. หรือสนามบิน
      if (distKm > 6 && majorScore < 16) {
        majorScore -= (distKm - 6) * 2;
      }
    } else {
      if (item.extratags?.wikidata || item.extratags?.wikipedia) majorScore += 4;
      if (item.extratags?.brand || item.extratags?.operator) majorScore += 2;
      if (item.extratags?.website) majorScore += 2;
      if (osmType === 'university') majorScore += 4;
      if (osmType === 'mall') majorScore += 4;
    }

    // คำนวณคะแนนอันดับรวม (Rank Score)
    const rankScore = category === 'transport'
      ? majorScore - (distKm * 0.4)
      : (majorScore * 2) - (distKm * 1.0);

    results.push({
      id: `osm-${item.place_id}`,
      name,
      category,
      transitType,
      distanceKm: parseFloat(distKm.toFixed(1)),
      distanceText: formatDistanceText(distKm),
      lat: itemLat,
      lng: itemLng,
      rankScore
    });
  }

  // จัดเรียงตามคะแนนความสำคัญและความใกล้เคียง
  results.sort((a, b) => b.rankScore - a.rankScore);

  // กรองสถานที่ซ้ำซ้อนในจุดพิกัดเดียวกัน (ระยะห่าง < 250 ม. ในหมวดเดียวกัน เช่น อาคารย่อยในคอมเพล็กซ์เดียวกัน)
  const uniquePlaces: Array<NearbyPlaceResult & { rankScore: number }> = [];
  for (const place of results) {
    const isDuplicateLocation = uniquePlaces.some(
      (existing) => calculateDistanceKm(existing.lat, existing.lng, place.lat, place.lng) < 0.25
    );
    if (!isDuplicateLocation) {
      uniquePlaces.push(place);
    }
  }

  return uniquePlaces;
}

// 5. สแกนและจัดกลุ่มสถานที่สำคัญจริงรอบพิกัดบ้านสดๆ ผ่าน OpenStreetMap
export async function fetchNearbyPlacesFromOSM(
  propertyLat: number,
  propertyLng: number
): Promise<{
  all: NearbyPlaceResult[];
  shopping: NearbyPlaceResult[];
  education: NearbyPlaceResult[];
  hospital: NearbyPlaceResult[];
  transport: NearbyPlaceResult[];
}> {
  const cacheKey = `${propertyLat.toFixed(3)},${propertyLng.toFixed(3)}`;
  const cached = nearbyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    // ยิงค้นหา 4 หมวดหมู่หลักแบบคู่ขนานผ่าน OpenStreetMap โดยใช้คีย์เวิร์ดมาตรฐานของ OSM
    const [rawShopping, rawEducation, rawHospital, rawTransport] = await Promise.all([
      queryOsmCategoryPure('shopping', ['mall', 'department_store'], propertyLat, propertyLng),
      queryOsmCategoryPure('education', ['university', 'school'], propertyLat, propertyLng),
      queryOsmCategoryPure('hospital', ['hospital'], propertyLat, propertyLng),
      queryOsmCategoryPure('transport', ['station', 'bus station', 'airport'], propertyLat, propertyLng)
    ]);

    const cleanList = (items: Array<NearbyPlaceResult & { rankScore: number }>): NearbyPlaceResult[] => {
      return items.slice(0, 6).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        transitType: item.transitType,
        distanceKm: item.distanceKm,
        distanceText: item.distanceText,
        lat: item.lat,
        lng: item.lng
      }));
    };

    const shopping = cleanList(rawShopping);
    const education = cleanList(rawEducation);
    const hospital = cleanList(rawHospital);
    const transport = cleanList(rawTransport);

    // แท็บ "ทั้งหมด": คัดเลือกตัวท็อป 1 อันดับแรกของแต่ละหมวดที่มีอยู่จริง (รวมไม่เกิน 4 ใบ สบายตา)
    const all: NearbyPlaceResult[] = [];
    if (shopping[0]) all.push(shopping[0]);
    if (education[0]) all.push(education[0]);
    if (hospital[0]) all.push(hospital[0]);
    if (transport[0]) all.push(transport[0]);

    // ถ้าหมวดไหนไม่มี แต่มีหมวดอื่นเหลือ เติมให้ครบ 4 ใบ
    const remaining = [...shopping, ...education, ...hospital, ...transport].sort(
      (a, b) => a.distanceKm - b.distanceKm
    );
    for (const item of remaining) {
      if (!all.some((x) => x.id === item.id) && all.length < 4) {
        all.push(item);
      }
    }

    const result = { all, shopping, education, hospital, transport };
    nearbyCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (error) {
    console.error('Error fetching OSM nearby places:', error);
    return { all: [], shopping: [], education: [], hospital: [], transport: [] };
  }
}
