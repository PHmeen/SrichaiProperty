import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'provinces') {
      const list = await db.provinces.findMany({ 
        orderBy: { name_th: 'asc' } 
      });
      return NextResponse.json(list);
    }

    if (type === 'amphures') {
      const provinceId = parseInt(searchParams.get('provinceId') || '0');
      if (!provinceId) {
        return NextResponse.json({ error: 'provinceId is required' }, { status: 400 });
      }
      const list = await db.amphures.findMany({
        where: { province_id: provinceId },
        orderBy: { name_th: 'asc' }
      });
      return NextResponse.json(list);
    }

    if (type === 'districts') {
      const amphureId = parseInt(searchParams.get('amphureId') || '0');
      if (!amphureId) {
        return NextResponse.json({ error: 'amphureId is required' }, { status: 400 });
      }
      const list = await db.districts.findMany({
        where: { amphure_id: amphureId },
        orderBy: { name_th: 'asc' }
      });
      return NextResponse.json(list);
    }

    return NextResponse.json({ error: 'Invalid or missing type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
