import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    // 1. ถ้ายังไม่ได้ใส่ GOOGLE_CALENDAR_API_KEY ให้ใช้วันหยุดไทยพื้นฐานอัตโนมัติ
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        holidays: [
          `${year}-01-01`, `${year}-04-13`, `${year}-04-14`, `${year}-04-15`,
          `${year}-05-01`, `${year}-07-28`, `${year}-08-12`, `${year}-12-05`, `${year}-12-31`
        ]
      });
    }

    // 2. ยิงดึงข้อมูลวันหยุดจาก Google Calendar API
    const calendarId = encodeURIComponent('th.th#holiday@group.v.calendar.google.com');
    const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Google API Error');

    const data = await res.json();
    const holidays = (data.items || [])
      .map((item: { start?: { date?: string } }) => item.start?.date)
      .filter(Boolean);

    return NextResponse.json({ success: true, holidays });
  } catch (error) {
    console.error('Error in holidays API:', error);
    return NextResponse.json({ success: false, holidays: [] });
  }
}
