import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { getTodayDateBangkok } from './noShowService';

/** ชนิดการแจ้งเตือนสำหรับเตือนนัดหมาย (แมปกับ appointment เพื่อใช้ไอคอนปฏิทินที่สวยงาม) */
export const REMINDER_NOTIFICATION_TYPE = 'appointment';

/** แปลงรอบเวลาเป็นภาษาไทยที่อ่านง่าย */
function formatTimeSlot(slot: string | null): string {
  if (!slot) return 'ไม่ระบุเวลา';
  if (slot === 'morning' || slot.includes('เช้า')) return 'ช่วงเช้า (10:00 - 12:00 น.)';
  if (slot === 'afternoon' || slot.includes('บ่าย')) return 'ช่วงบ่าย (14:00 - 16:00 น.)';
  return slot;
}

/** แปลง Date เป็นรูปแบบ YYYY-MM-DD */
function toDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * ตรวจสอบและส่งการแจ้งเตือนเตือนความจำนัดหมายล่วงหน้า (Upcoming Reminder)
 * - ตรวจสอบนัดหมายที่ยืนยันแล้ว (status = 'approved') ภายในวันนี้หรือวันพรุ่งนี้
 * - มีระบบ Anti-Duplication Guard: ป้องกันไม่ให้เตือนนัดหมายรายการเดิมซ้ำภายใน 20 ชั่วโมง
 */
export async function checkAndSendAppointmentReminders(userId: string, role?: string | null): Promise<number> {
  if (!userId) return 0;

  const today = getTodayDateBangkok();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(tomorrow);

  const isAgent = role === 'agent';

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

  // 2. ดึงรายการแจ้งเตือนเตือนนัดหมายเดิมที่เคยส่งให้ผู้ใช้นี้ภายใน 20 ชั่วโมงล่าสุด
  const cooldownSince = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const recentReminders = await db.notifications.findMany({
    where: {
      user_id: userId,
      type: REMINDER_NOTIFICATION_TYPE,
      created_at: { gte: cooldownSince }
    },
    select: { link_url: true, title: true }
  });

  // สร้าง Set ของ id นัดหมายที่เคยเตือนไปแล้ววันนี้
  const alertedAppointmentIds = new Set<string>();
  for (const n of recentReminders) {
    if (n.link_url) {
      const match = n.link_url.match(/aptId=([a-f0-9-]+)/i);
      if (match?.[1]) {
        alertedAppointmentIds.add(match[1]);
      }
    }
  }

  let sentCount = 0;

  for (const apt of appointments) {
    if (alertedAppointmentIds.has(apt.id)) {
      continue; // ข้ามถ้านัดนี้เคยส่งแจ้งเตือนไปแล้วใน 20 ชม. ที่ผ่านมา
    }

    const aptDateKey = toDateKey(apt.appointment_date);
    const isToday = aptDateKey === todayKey;
    const dayLabel = isToday ? 'วันนี้' : 'วันพรุ่งนี้';
    const propertyTitle = apt.properties?.title || 'อสังหาริมทรัพย์';
    const timeLabel = formatTimeSlot(apt.time_slot);

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
      content = `${dayLabel}คุณมีนัดหมายเข้าชม "${propertyTitle}" (${timeLabel}) กรุณาเตรียมตัวและตรวจสอบเส้นทางการเดินทาง`;
    } else {
      const customer = apt.users_appointments_customer_idTousers;
      const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'ลูกค้า';
      title = isToday
        ? `เตือนความจำ: วันนี้คุณมีคิวนำชมโครงการ`
        : `เตือนความจำ: วันพรุ่งนี้คุณมีคิวนำชมโครงการ`;
      content = `${dayLabel}คุณมีคิวนำชม "${propertyTitle}" กับคุณ ${customerName} (${timeLabel})`;
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
