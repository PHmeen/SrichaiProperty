import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { getTodayDateBangkok } from './noShowService';
import { APPOINTMENT_STATUS } from '@/lib/constants';

/**
 * ==============================================================================
 * ระบบเตือนก่อนถึงวันนัด (Appointment Reminder)
 * ==============================================================================
 * ระบบเตือนความจำล่วงหน้าให้ทั้งลูกค้าและนายหน้าก่อนถึงวันนัด
 * - ตรวจสอบนัดหมายที่ยืนยันแล้ว (status = 'approved') ภายในวันนี้หรือวันพรุ่งนี้
 * - มีระบบ Anti-Duplication Guard: ป้องกันไม่ให้เตือนนัดหมายรายการเดิมซ้ำภายใน 20 ชั่วโมง
 * ==============================================================================
 */

/** ชนิดการแจ้งเตือน ใช้ทั้งตอนสร้างและตอนเช็คว่าเพิ่งเตือนไปหรือยัง */
export const REMINDER_TYPE = 'appointment_reminder';

/** ชนิดการแจ้งเตือนสำหรับเตือนนัดหมาย (แมปกับ appointment เพื่อใช้ไอคอนปฏิทิน) */
export const REMINDER_NOTIFICATION_TYPE = 'appointment';

/**
 * เตือนนัดที่จะถึงภายในกี่วันข้างหน้า
 * 1 = เตือนทั้งนัดของ "วันนี้" และ "พรุ่งนี้"
 */
export const REMINDER_LOOKAHEAD_DAYS = 1;

/** เตือนนัดใบเดิมซ้ำได้เร็วสุดกี่ชั่วโมง (20 = ราววันละครั้ง ไม่เด้งทุกครั้งที่รีเฟรช) */
export const REMINDER_COOLDOWN_HOURS = 20;

export interface UpcomingAppointment {
  appointmentId: string;
  /** "YYYY-MM-DD" */
  date: string;
  timeSlot: string;
  propertyTitle: string;
  /** ชื่ออีกฝ่าย — ฝั่งลูกค้าจะเป็นชื่อนายหน้า ฝั่งนายหน้าจะเป็นชื่อลูกค้า */
  counterpartName: string;
  /** true = นัดวันนี้ (ต้องเตือนให้ด่วนกว่านัดพรุ่งนี้) */
  isToday: boolean;
}

/** แปลง Date เป็น "YYYY-MM-DD" อ่านแบบ UTC เพราะ appointment_date เป็นชนิด Date ล้วน */
const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/** เที่ยงคืนของวันนี้ตามเวลาไทย แปลงกลับเป็น UTC เพื่อเทียบกับคอลัมน์ Date */
function startOfTodayBangkok(now: Date = new Date()): Date {
  const bangkok = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return new Date(Date.UTC(bangkok.getUTCFullYear(), bangkok.getUTCMonth(), bangkok.getUTCDate()));
}

const timeLabel = (slot: string) => (slot === 'afternoon' ? '13:00 น.' : '10:00 น.');

/** แปลงรอบเวลาเป็นภาษาไทยที่อ่านง่าย */
function formatTimeSlot(slot: string | null): string {
  if (!slot) return 'ไม่ระบุเวลา';
  if (slot === 'morning' || slot.includes('เช้า')) return 'ช่วงเช้า (10:00 - 12:00 น.)';
  if (slot === 'afternoon' || slot.includes('บ่าย')) return 'ช่วงบ่าย (14:00 - 16:00 น.)';
  return slot;
}

/**
 * หานัดที่ยืนยันแล้วและกำลังจะถึงภายใน REMINDER_LOOKAHEAD_DAYS วัน
 */
export async function findUpcomingAppointments(
  userId: string,
  isAgent: boolean,
  now: Date = new Date()
): Promise<UpcomingAppointment[]> {
  const today = startOfTodayBangkok(now);
  const until = new Date(today.getTime() + REMINDER_LOOKAHEAD_DAYS * 24 * 60 * 60 * 1000);
  const todayKey = toDateKey(today);

  const rows = await db.appointments.findMany({
    where: {
      ...(isAgent ? { agent_id: userId } : { customer_id: userId }),
      status: APPOINTMENT_STATUS.APPROVED,
      appointment_date: { gte: today, lte: until }
    },
    select: {
      id: true,
      appointment_date: true,
      time_slot: true,
      properties: { select: { title: true } },
      users_appointments_agent_idTousers: { select: { first_name: true, last_name: true } },
      users_appointments_customer_idTousers: { select: { first_name: true, last_name: true } }
    },
    orderBy: [{ appointment_date: 'asc' }, { time_slot: 'asc' }]
  });

  return rows.map((a) => {
    const other = isAgent ? a.users_appointments_customer_idTousers : a.users_appointments_agent_idTousers;
    const dateKey = toDateKey(a.appointment_date);
    return {
      appointmentId: a.id,
      date: dateKey,
      timeSlot: a.time_slot ?? 'morning',
      propertyTitle: a.properties?.title ?? 'อสังหาริมทรัพย์',
      counterpartName: `${other?.first_name ?? ''} ${other?.last_name ?? ''}`.trim() || (isAgent ? 'ลูกค้า' : 'นายหน้า'),
      isToday: dateKey === todayKey
    };
  });
}

/**
 * คืนรายชื่อ appointmentId ที่เพิ่งเตือนผู้ใช้คนนี้ไปแล้วภายใน REMINDER_COOLDOWN_HOURS
 */
export async function findRecentlyRemindedAppointmentIds(
  userId: string,
  now: Date = new Date()
): Promise<Set<string>> {
  const cooldownSince = new Date(now.getTime() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000);

  const recent = await db.notifications.findMany({
    where: {
      user_id: userId,
      type: { in: [REMINDER_TYPE, REMINDER_NOTIFICATION_TYPE] },
      created_at: { gte: cooldownSince }
    },
    select: { link_url: true }
  });

  const ids = new Set<string>();
  for (const n of recent) {
    if (!n.link_url) continue;
    const hashId = n.link_url.split('#').pop();
    if (hashId) ids.add(hashId);
    const match = n.link_url.match(/aptId=([a-f0-9-]+)/i);
    if (match?.[1]) ids.add(match[1]);
  }

  return ids;
}

/** ข้อความแจ้งเตือนของนัดหนึ่งใบ */
export function buildReminderMessage(apt: UpcomingAppointment, isAgent: boolean) {
  const when = apt.isToday ? 'วันนี้' : 'พรุ่งนี้';
  return {
    title: apt.isToday ? 'วันนี้คุณมีนัดเข้าชมบ้าน' : 'พรุ่งนี้คุณมีนัดเข้าชมบ้าน',
    content: isAgent
      ? `${when} ${timeLabel(apt.timeSlot)} คุณมีนัดพาคุณ ${apt.counterpartName} ชม "${apt.propertyTitle}"`
      : `${when} ${timeLabel(apt.timeSlot)} คุณมีนัดชม "${apt.propertyTitle}" กับคุณ ${apt.counterpartName}`,
    linkUrl: `${isAgent ? '/agent/appointments' : '/appointments'}#${apt.appointmentId}`
  };
}

/**
 * ตรวจสอบและส่งการแจ้งเตือนเตือนความจำนัดหมายล่วงหน้า (Upcoming Reminder)
 */
export async function checkAndSendAppointmentReminders(userId: string, role?: string | null): Promise<number> {
  if (!userId) return 0;

  const today = getTodayDateBangkok();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const todayKey = toDateKey(today);

  // 1. ค้นหานัดหมายที่ยืนยันแล้วของวันนี้และวันพรุ่งนี้
  const appointments = await db.appointments.findMany({
    where: {
      OR: [
        { customer_id: userId },
        { agent_id: userId }
      ],
      status: 'approved',
      appointment_date: {
        in: [today, tomorrow]
      }
    },
    include: {
      properties: {
        select: { id: true, title: true }
      },
      users_appointments_customer_idTousers: {
        select: { first_name: true, last_name: true }
      },
      users_appointments_agent_idTousers: {
        select: { first_name: true, last_name: true }
      }
    }
  });

  if (appointments.length === 0) return 0;

  // 2. ดึงรายการแจ้งเตือนที่เคยส่งไปแล้วใน cooldown
  const alertedAppointmentIds = await findRecentlyRemindedAppointmentIds(userId);

  let sentCount = 0;

  for (const apt of appointments) {
    if (alertedAppointmentIds.has(apt.id)) {
      continue;
    }

    const aptDateKey = toDateKey(apt.appointment_date);
    const isToday = aptDateKey === todayKey;
    const dayLabel = isToday ? 'วันนี้' : 'วันพรุ่งนี้';
    const propertyTitle = apt.properties?.title || 'อสังหาริมทรัพย์';
    const timeSlotLabel = formatTimeSlot(apt.time_slot);

    const isCustomerRecipient = apt.customer_id === userId;
    const targetUrl = isCustomerRecipient 
      ? `/appointments?aptId=${apt.id}`
      : `/agent/appointments?aptId=${apt.id}`;

    let title = '';
    let content = '';

    if (isCustomerRecipient) {
      title = isToday 
        ? `เตือนความจำ: วันนี้คุณมีนัดหมายเข้าชมโครงการ`
        : `เตือนความจำ: วันพรุ่งนี้คุณมีนัดหมายเข้าชมโครงการ`;
      content = `${dayLabel}คุณมีนัดหมายเข้าชม "${propertyTitle}" (${timeSlotLabel}) กรุณาเตรียมตัวและตรวจสอบเส้นทางการเดินทาง`;
    } else {
      const customer = apt.users_appointments_customer_idTousers;
      const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'ลูกค้า';
      title = isToday
        ? `เตือนความจำ: วันนี้คุณมีคิวนำชมโครงการ`
        : `เตือนความจำ: วันพรุ่งนี้คุณมีคิวนำชมโครงการ`;
      content = `${dayLabel}คุณมีคิวนำชม "${propertyTitle}" กับคุณ ${customerName} (${timeSlotLabel})`;
    }

    await notifyUser({
      userId,
      title,
      content,
      type: REMINDER_NOTIFICATION_TYPE,
      linkUrl: targetUrl
    }).catch(err => console.error('Error sending appointment reminder:', err));

    alertedAppointmentIds.add(apt.id);
    sentCount++;
  }

  return sentCount;
}
