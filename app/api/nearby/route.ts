import { NextResponse } from 'next/server';
import { fetchNearbyPlacesFromOSM } from '@/lib/nearbyService';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get('lat');
  const lngStr = searchParams.get('lng');

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { success: false, error: 'Missing lat or lng query parameters' },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: 'Invalid lat or lng values' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchNearbyPlacesFromOSM(lat, lng);
    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600'
        }
      }
    );
  } catch (error) {
    console.error('API /api/nearby error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch nearby places from OSM',
        data: { all: [], shopping: [], education: [], hospital: [], transport: [] }
      },
      { status: 500 }
    );
  }
}
