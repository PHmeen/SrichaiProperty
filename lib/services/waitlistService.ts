import { db } from '@/lib/db';

/**
 * ==============================================================================
 * คิวรอรอบเข้าชม (Waitlist)
 * ==============================================================================
 * ปัญหาเดิม: ลูกค้าเปิดหน้าจองแล้วเจอว่ารอบที่อยากได้ถูกจองไปแล้ว หรือนายหน้า
 * ติดนัดบ้านหลังอื่น ระบบทำได้แค่ปิดปุ่มไม่ให้กดแล้วจบ ลูกค้าต้องกลับมาเช็กเอง
 * เรื่อยๆ ซึ่งไม่มีใครทำจริง ทุกครั้งที่มีคนยกเลิกนัด รอบนั้นจึงถูกปล่อยทิ้งเปล่าๆ
 *
 * ไฟล์นี้ทำให้ "รอบที่ถูกปล่อยคืน" กลายเป็นโอกาสขายทันที โดยแจ้งเตือนคนที่รออยู่
 *
 * เสียบเข้ากับจุดที่ปล่อยรอบว่างคืนซึ่งมีอยู่แล้ว 5 จุดใน api/appointments:
 * ปฏิเสธนัด / ลูกค้ายกเลิก / นายหน้ายกเลิก / ขอเลื่อนวัน / auto-cancel ข้อเสนอที่ไม่ตอบ
 * ==============================================================================
 */

/** ชนิดการแจ้งเตือนเวลารอบที่รออยู่ว่างขึ้นมา */
export const WAITLIST_ALERT_TYPE = 'waitlist_slot_open';

/** ลูกค้า 1 คน ลงคิวค้างไว้ได้สูงสุดกี่รอบ (กันลงคิวรัวทุกรอบจนแจ้งเตือนท่วม) */
export const WAITLIST_MAX_PER_CUSTOMER = 10;

/** แจ้งคนเดิมเรื่องรอบเดิมซ้ำได้เร็วสุดกี่ชั่วโมง */
export const WAITLIST_NOTIFY_COOLDOWN_HOURS = 6;

const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** เที่ยงคืนวันนี้ตามเวลาไทย แปลงกลับเป็น UTC เพื่อเทียบกับคอลัมน์ Date */
function startOfTodayBangkok(now: Date = new Date()): Date {
  const bkk = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate()));
}

/**
 * แจ้งเตือนทุกคนที่รอรอบนี้อยู่ว่ารอบว่างแล้ว
 *
 * ตั้งใจแจ้ง "ทุกคนพร้อมกัน" ไม่ใช่ทีละคนตามลำดับคิว เพราะถ้าแจ้งคนแรกคนเดียว
 * แล้วเขาไม่เปิดอ่าน รอบจะค้างว่างทิ้งไว้เปล่าๆ ซึ่งขัดกับเป้าหมายของฟีเจอร์นี้
 * จึงใช้กติกา "ใครจองก่อนได้ก่อน" และบอกไว้ในข้อความแจ้งเตือนให้ชัด
 *
 * คืนค่าเป็นข้อมูลที่พอสำหรับสร้างการแจ้งเตือน ให้ฝั่ง API เป็นคนยิง notify เอง
 * (service นี้จะได้ไม่ผูกกับระบบแจ้งเตือน และเขียนเทสง่าย)
 */
export async function collectWaitlistToNotify(
  propertyId: string,
  availableDate: Date,
  timeSlot: string,
  now: Date = new Date()
): Promise<{ customerIds: string[]; propertyTitle: string; dateKey: string; timeSlot: string }> {
  const cooldownSince = new Date(now.getTime() - WAITLIST_NOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000);

  const rows = await db.appointment_waitlist.findMany({
    where: {
      property_id: propertyId,
      available_date: availableDate,
      time_slot: timeSlot,
      // ยังไม่เคยแจ้ง หรือแจ้งไปนานกว่า cooldown แล้ว
      OR: [{ notified_at: null }, { notified_at: { lt: cooldownSince } }]
    },
    select: { id: true, customer_id: true, properties: { select: { title: true } } },
    orderBy: { created_at: 'asc' } // มารอก่อนอยู่ต้นรายการ (ไว้ใช้ตอนอยากเปลี่ยนเป็นแจ้งทีละคน)
  });

  if (rows.length === 0) {
    return { customerIds: [], propertyTitle: '', dateKey: toDateKey(availableDate), timeSlot };
  }

  await db.appointment_waitlist.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: { notified_at: now }
  });

  return {
    customerIds: rows.map((r) => r.customer_id),
    propertyTitle: rows[0].properties?.title ?? 'อสังหาริมทรัพย์',
    dateKey: toDateKey(availableDate),
    timeSlot
  };
}

/** ข้อความแจ้งเตือนเวลารอบที่รออยู่ว่างขึ้นมา */
export function buildWaitlistAlert(propertyId: string, propertyTitle: string, dateKey: string, timeSlot: string) {
  const time = timeSlot === 'afternoon' ? 'รอบบ่าย' : 'รอบเช้า';
  return {
    title: 'รอบที่คุณรออยู่ว่างแล้ว',
    content: `"${propertyTitle}" วันที่ ${dateKey} ${time} เพิ่งว่างขึ้นมา — ใครจองก่อนได้ก่อน`,
    type: WAITLIST_ALERT_TYPE,
    linkUrl: `/book-appointment?propertyId=${propertyId}`
  };
}

/** ลบคิวรอของลูกค้ารายนี้กับรอบนี้ (ใช้ตอนจองสำเร็จแล้ว ไม่ต้องรออีก) */
export async function removeFromWaitlist(customerId: string, propertyId: string, availableDate: Date, timeSlot: string) {
  await db.appointment_waitlist.deleteMany({
    where: { customer_id: customerId, property_id: propertyId, available_date: availableDate, time_slot: timeSlot }
  });
}

/** ลบคิวรอที่เลยวันไปแล้ว เรียกตอนลูกค้าเปิดหน้ารายการนัด (โปรเจกต์นี้ไม่มี cron) */
export async function purgeExpiredWaitlist(now: Date = new Date()) {
  await db.appointment_waitlist.deleteMany({
    where: { available_date: { lt: startOfTodayBangkok(now) } }
  });
}

/** จำนวนคิวที่ลูกค้ารายนี้ค้างอยู่ ใช้เช็คเพดาน WAITLIST_MAX_PER_CUSTOMER */
export async function countActiveWaitlist(customerId: string, now: Date = new Date()): Promise<number> {
  return db.appointment_waitlist.count({
    where: { customer_id: customerId, available_date: { gte: startOfTodayBangkok(now) } }
  });
}

/** รอบที่ลูกค้ารายนี้ลงคิวรอไว้กับบ้านหลังนี้ (ให้หน้าจองรู้ว่าปุ่มไหนควรขึ้นว่า "รออยู่แล้ว") */
export async function findCustomerWaitlistForProperty(customerId: string, propertyId: string): Promise<string[]> {
  const rows = await db.appointment_waitlist.findMany({
    where: { customer_id: customerId, property_id: propertyId },
    select: { available_date: true, time_slot: true }
  });
  return rows.map((r) => `${toDateKey(r.available_date)}|${r.time_slot}`);
}
