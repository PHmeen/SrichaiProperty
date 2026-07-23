import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  // รายการวันหยุดไทยหลัก (เป็น Fallback กรณีไม่ได้ใส่ Key หรือ Key ของ Google API ใช้งานไม่ได้)
  const defaultHolidays = [
    `${year}-01-01`, `${year}-02-26`, `${year}-04-06`,
    `${year}-04-13`, `${year}-04-14`, `${year}-04-15`,
    `${year}-05-01`, `${year}-05-04`, `${year}-05-22`,
    `${year}-06-03`, `${year}-07-20`, `${year}-07-28`,
    `${year}-08-12`, `${year}-10-13`, `${year}-10-23`,
    `${year}-12-05`, `${year}-12-10`, `${year}-12-31`
  ];

  try {
    const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;

    if (apiKey && apiKey.length > 20) {
      const calendarId = encodeURIComponent('th.th#holiday@group.v.calendar.google.com');
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${year}-01-01T00:00:00Z&timeMax=${year}-12-31T23:59:59Z&singleEvents=true`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const holidaysFromGoogle = (data.items || [])
          .map((item: { start?: { date?: string } }) => item.start?.date)
          .filter((date?: string): date is string => Boolean(date));

        if (holidaysFromGoogle.length > 0) {
          return NextResponse.json({ success: true, source: 'google_calendar', holidays: holidaysFromGoogle });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching Google Calendar holidays:', error);
  }

  // คืนค่าวันหยุดไทยพื้นฐานหากไม่มี Key หรือ Google API ทำงานไม่ได้
  return NextResponse.json({ success: true, source: 'default_fallback', holidays: defaultHolidays });
}
