import { db } from '@/lib/db';

/**
 * ==============================================================================
 * แจ้งเตือนลูกค้าที่บันทึกบ้านไว้ เมื่อนายหน้าเปิดวันว่างเพิ่ม
 * ==============================================================================
 * เดิมลูกค้ากดหัวใจเก็บบ้านไว้แล้วก็จบ ถ้าตอนนั้นยังไม่มีรอบว่างให้จอง
 * ต้องกลับมาเปิดดูเองเรื่อยๆ ว่านายหน้าเปิดรอบใหม่หรือยัง ซึ่งไม่มีใครทำจริง
 * นายหน้าจึงเสียลูกค้าที่สนใจอยู่แล้วไปฟรีๆ
 *
 * ยืมโครงเดิมมาจาก slotAvailabilityService / appointmentReminderService
 * (หา -> กรองคนที่เพิ่งเตือนไป -> ส่ง) เพราะเงื่อนไขเดียวกันคือห้ามเตือนถี่เกิน
 * ==============================================================================
 */

/** ชนิดการแจ้งเตือน ใช้ทั้งตอนสร้างและตอนเช็คว่าเพิ่งเตือนไปหรือยัง */
export const SAVED_ALERT_TYPE = 'saved_property_slots';

/** เตือนลูกค้าคนเดิมเรื่องบ้านหลังเดิมซ้ำได้เร็วสุดกี่ชั่วโมง */
export const SAVED_ALERT_COOLDOWN_HOURS = 24;

/**
 * คืนรายชื่อ userId ที่ควรได้รับการแจ้งเตือนว่าบ้านหลังนี้เปิดวันว่างเพิ่ม
 *
 * ตัดออก 2 กลุ่ม:
 * 1. เจ้าของประกาศเอง (นายหน้าอาจกดบันทึกบ้านตัวเองไว้)
 * 2. คนที่เพิ่งได้รับแจ้งเตือนเรื่องบ้านหลังนี้ไปภายใน cooldown
 *    (นายหน้าอาจกดบันทึกหลายครั้งติดกันตอนจัดตาราง ไม่ควรเด้ง 5 อันรวด)
 */
export async function findUsersToAlertForNewSlots(
  propertyId: string,
  now: Date = new Date()
): Promise<string[]> {
  const [saved, property] = await Promise.all([
    db.saved_properties.findMany({ where: { property_id: propertyId }, select: { user_id: true } }),
    db.properties.findUnique({ where: { id: propertyId }, select: { agent_id: true } })
  ]);
  if (saved.length === 0) return [];

  const candidates = saved
    .map((s) => s.user_id)
    .filter((uid) => uid !== property?.agent_id);
  if (candidates.length === 0) return [];

  const cooldownSince = new Date(now.getTime() - SAVED_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000);
  const recent = await db.notifications.findMany({
    where: {
      user_id: { in: candidates },
      type: SAVED_ALERT_TYPE,
      link_url: { contains: propertyId },
      created_at: { gte: cooldownSince }
    },
    select: { user_id: true }
  });
  const alreadyAlerted = new Set(recent.map((n) => n.user_id));

  return candidates.filter((uid) => !alreadyAlerted.has(uid));
}

/** ข้อความแจ้งเตือน แยกออกมาให้ API และเทสใช้ชุดเดียวกัน */
export function buildSavedPropertyAlert(propertyId: string, propertyTitle: string, addedCount: number) {
  return {
    title: 'บ้านที่คุณบันทึกไว้เปิดวันว่างเพิ่ม',
    content: `"${propertyTitle}" เพิ่งเปิดรอบเข้าชมเพิ่มอีก ${addedCount} รอบ กดเข้าไปจองได้เลย`,
    type: SAVED_ALERT_TYPE,
    linkUrl: `/book-appointment?propertyId=${propertyId}`
  };
}
