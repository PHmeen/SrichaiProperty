// 🔑 KEYWORD: เตือนนายหน้าว่าวันว่างเหลือน้อย
import { db } from '@/lib/db';

/** เหลือรอบว่างในอนาคตน้อยกว่านี้ ถือว่าควรเปิดวันว่างเพิ่ม */
export const LOW_SLOT_THRESHOLD = 3;

/** นับเฉพาะรอบที่อยู่ภายในกี่วันข้างหน้า (ไกลกว่านี้ลูกค้ายังไม่ค่อยจอง) */
export const SLOT_LOOKAHEAD_DAYS = 30;

/** เตือนบ้านหลังเดิมซ้ำได้เร็วสุดกี่ชั่วโมง (กันกระดิ่งท่วมเวลานายหน้ารีเฟรชหน้าแรกบ่อยๆ) */
export const SLOT_ALERT_COOLDOWN_HOURS = 24;

/** ชนิดของการแจ้งเตือนเรื่องวันว่าง ใช้ทั้งตอนสร้างและตอนเช็คว่าเคยเตือนไปแล้วหรือยัง */
export const SLOT_ALERT_TYPE = 'viewing_slot';

export interface LowSlotProperty {
  propertyId: string;
  title: string;
  /** จำนวนรอบที่ยังว่างให้ลูกค้าจองได้ในช่วงที่มองไปข้างหน้า */
  remainingSlots: number;
  /** วันสุดท้ายที่ยังเปิดว่างอยู่ (YYYY-MM-DD) — null คือไม่เหลือเลย */
  lastAvailableDate: string | null;
}

/** แปลง Date เป็น "YYYY-MM-DD" อ่านแบบ UTC เพราะ available_date เป็นชนิด Date ล้วน ไม่มีเวลา */
const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** เที่ยงคืนของวันนี้ (UTC) ใช้เป็นเส้นแบ่งว่ารอบไหนคือ "อนาคต" */
function startOfTodayUTC(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * หาบ้านของนายหน้าที่ "วันว่างใกล้หมด" — เอาไว้เตือนให้เปิดรอบเพิ่ม
 *
 * นับเฉพาะประกาศที่เผยแพร่อยู่ (approved) เพราะประกาศที่ยังรออนุมัติหรือถูกตีกลับ
 * ลูกค้ายังจองไม่ได้อยู่แล้ว เตือนไปก็ไม่มีประโยชน์
 *
 * นับเฉพาะรอบที่ยังไม่มีคนจอง (is_booked = false) และอยู่ในอนาคตภายใน SLOT_LOOKAHEAD_DAYS วัน
 */
export async function findPropertiesWithLowSlots(
  agentId: string,
  now: Date = new Date()
): Promise<LowSlotProperty[]> {
  const today = startOfTodayUTC(now);
  const horizon = new Date(today.getTime() + SLOT_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);

  const properties = await db.properties.findMany({
    where: { agent_id: agentId, status: 'approved' },
    select: {
      id: true,
      title: true,
      property_viewing_slots: {
        where: {
          is_booked: false,
          available_date: { gte: today, lte: horizon }
        },
        select: { available_date: true },
        orderBy: { available_date: 'asc' }
      }
    }
  });

  return properties
    .map((p) => {
      const slots = p.property_viewing_slots;
      const lastSlot = slots[slots.length - 1];
      return {
        propertyId: p.id,
        title: p.title,
        remainingSlots: slots.length,
        lastAvailableDate: lastSlot ? toDateKey(lastSlot.available_date) : null
      };
    })
    .filter((p) => p.remainingSlots < LOW_SLOT_THRESHOLD);
}

/**
 * คืนรายชื่อ propertyId ที่เพิ่งเตือนไปแล้วภายใน SLOT_ALERT_COOLDOWN_HOURS ชั่วโมง
 *
 * จำเป็นเพราะการเช็คทำงานทุกครั้งที่นายหน้าเปิดหน้าแรก ถ้าไม่กันไว้
 * แค่รีเฟรช 10 ครั้งก็ได้แจ้งเตือนซ้ำ 10 อัน กระดิ่งจะใช้งานไม่ได้เลย
 *
 * ดูจาก link_url ของการแจ้งเตือนเดิม เพราะเก็บ propertyId อยู่ในนั้นอยู่แล้ว
 * (ตาราง notifications ไม่มีคอลัมน์อ้างอิงบ้านโดยตรง)
 */
export async function findRecentlyAlertedPropertyIds(
  agentId: string,
  now: Date = new Date()
): Promise<Set<string>> {
  const cooldownSince = new Date(now.getTime() - SLOT_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000);

  const recentAlerts = await db.notifications.findMany({
    where: {
      user_id: agentId,
      type: SLOT_ALERT_TYPE,
      created_at: { gte: cooldownSince }
    },
    select: { link_url: true }
  });

  return new Set(
    recentAlerts
      .map((n) => n.link_url?.split('/').pop())
      .filter((id): id is string => Boolean(id))
  );
}
