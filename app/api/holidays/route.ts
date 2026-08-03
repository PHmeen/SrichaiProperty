import { NextResponse } from 'next/server';

// ดึงวันหยุดไทยจาก Google Calendar API เป็นหลัก (ไม่มีการ fallback ข้อมูลในโค้ดอีกต่อไป)
// ต้องตั้งค่า GOOGLE_CALENDAR_API_KEY ใน .env.local ก่อนใช้งาน
// วิธีขอ Key: https://console.cloud.google.com/apis/credentials → Create Credentials → API Key
// แล้วเปิดใช้งาน Google Calendar API ที่: https://console.cloud.google.com/apis/library/calendar-googleapis-com

const THAI_HOLIDAY_CALENDAR_ID = 'th.th#holiday@group.v.calendar.google.com';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

  // 1) ตรวจสอบว่ามี API Key หรือไม่
  if (!apiKey || apiKey.length <= 20) {
    return NextResponse.json(
      {
        success: false,
        error: 'GOOGLE_CALENDAR_API_KEY ยังไม่ได้ตั้งค่าใน .env.local กรุณาเพิ่ม API Key ก่อนใช้งาน',
      },
      { status: 400 }
    );
  }

  try {
    // 2) ดึงวันหยุดไทยจาก Google Calendar API
    const calendarId = encodeURIComponent(THAI_HOLIDAY_CALENDAR_ID);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true`;

    const res = await fetch(url);

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error('Google Calendar API error:', res.status, errorData?.error?.message || 'Unknown error');
      return NextResponse.json(
        {
          success: false,
          error: `Google Calendar API ตอบกลับด้วยสถานะ ${res.status}: ${errorData?.error?.message || 'Unknown error'}`,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const holidays = (data.items || [])
      .map((item: { start?: { date?: string } }) => item.start?.date)
      .filter((date?: string): date is string => Boolean(date));

    if (holidays.length === 0) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลวันหยุดจาก Google Calendar API' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, source: 'google_calendar', holidays });
  } catch (error) {
    console.error('Error fetching Google Calendar holidays:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Calendar API' },
      { status: 500 }
    );
  }
}