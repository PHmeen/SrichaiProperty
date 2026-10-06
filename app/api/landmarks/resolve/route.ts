import { NextResponse } from 'next/server';
import { parseSearchIntent, LandmarkTarget } from '@/lib/services/landmarkService';

// In-Memory Cache เพื่อลด Request ไปยัง OSM Nominatim (1 ชั่วโมง)
const geocodeCache = new Map<string, { timestamp: number; data: LandmarkTarget | null }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q || !q.trim()) {
    return NextResponse.json(
      { success: false, error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  const cleanQuery = q.trim();
  const cacheKey = cleanQuery.toLowerCase();

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, landmark: cached.data });
  }

  // 1. ตรวจสอบจาก Curated Landmarks ภายในระบบก่อน (0ms - แม่นยำที่สุด)
  const parsed = parseSearchIntent(cleanQuery);
  if (parsed.detectedLandmark) {
    geocodeCache.set(cacheKey, { timestamp: Date.now(), data: parsed.detectedLandmark });
    return NextResponse.json({
      success: true,
      landmark: parsed.detectedLandmark,
      source: 'curated'
    });
  }

  // 2. ถ้าไม่พบ ให้ยิงค้นหาพิกัดแบบไดนามิกผ่าน OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=th&limit=1&q=${encodeURIComponent(
      parsed.landmarkCandidate || cleanQuery
    )}`;

    const res = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'SrichaiPropertyApp/2.0 (contact@srichaiproperty.com)',
        'Accept-Language': 'th,en'
      },
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const dynamicLandmark: LandmarkTarget = {
          id: `osm-${item.place_id}`,
          name: item.name || item.display_name?.split(',')[0] || cleanQuery,
          category: 'other',
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          aliases: [cleanQuery],
          description: item.display_name
        };

        geocodeCache.set(cacheKey, { timestamp: Date.now(), data: dynamicLandmark });
        return NextResponse.json({
          success: true,
          landmark: dynamicLandmark,
          source: 'osm'
        });
      }
    }

    geocodeCache.set(cacheKey, { timestamp: Date.now(), data: null });
    return NextResponse.json({
      success: false,
      message: 'Landmark not found'
    });
  } catch (error) {
    console.error('Failed to geocode landmark:', error);
    return NextResponse.json(
      { success: false, error: 'Geocoding service error' },
      { status: 500 }
    );
  }
}
