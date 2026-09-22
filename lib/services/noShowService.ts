
// เดิมระบบเดาเองว่านัดที่ผ่านวันไปแล้ว = สำเร็จเสมอ (auto-complete ทันที) ทำให้สถิติ
// "นัดสำเร็จ" ของนายหน้าไม่ตรงความจริง และลูกค้าที่ไม่เคยไปดูบ้านก็รีวิวได้
// ไฟล์นี้รวม logic ที่เกี่ยวกับการยืนยันผลจริง (มาจริง/ไม่มาตามนัด) ไว้ที่เดียว
// ตามแพตเทิร์นเดิมของโปรเจกต์ (ดู slaService.ts, viewingSlotService.ts)
import { db } from '@/lib/db';
import { notifyUser } from '@/lib/notify';
import { NO_SHOW_LIMIT, VISIT_CONFIRM_GRACE_DAYS, APPOINTMENT_STATUS } from '@/lib/constants';

/**
 * วันที่ปัจจุบันแบบ "เที่ยงคืนตามเวลาไทย" สำหรับเทียบกับ appointment_date (เป็น @db.Date ไม่มีเวลา)
 * ใช้ Intl.DateTimeFormat timeZone Asia/Bangkok เหมือนที่ app/api/appointments/route.ts ใช้เดิม
 * เพื่อไม่ให้ผลเพี้ยนตอนใกล้เที่ยงคืน (server รันด้วยเวลา UTC)
 */
export function getTodayDateBangkok(): Date {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  return new Date(`${todayStr}T00:00:00.000Z`);
}

/**
 * นัดหมายนี้ "รอนายหน้ายืนยันผล" อยู่หรือไม่
 * เงื่อนไข: นายหน้ารับนัดแล้ว (approved) และวันนัดผ่านไปแล้ว แต่ยังไม่ถูกยืนยันผล/auto-complete
 * (ถ้าเลยกำหนด VISIT_CONFIRM_GRACE_DAYS ไปแล้ว autoCompleteOverdueAppointments() จะเปลี่ยนเป็น
 * completed ให้เองก่อนถึงจุดนี้ ดังนั้นถ้าเจอ status ยัง approved แปลว่ายังไม่เลยกำหนด)
 */
export function appointmentNeedsResult(appointment: { status: string | null; appointment_date: Date }): boolean {
  return appointment.status === 'approved' && appointment.appointment_date < getTodayDateBangkok();
}

/**
 * เปลี่ยนสถานะนัดที่ผ่านวันไปแล้วเกิน grace period ให้เป็น completed ให้เองอัตโนมัติ
 * (กันกรณีนายหน้าลืมกดยืนยันผล ไม่ให้นัดค้างสถานะ "รอผล" ตลอดไป — ให้ประโยชน์แก่ลูกค้า)
 * ไม่ตั้ง visit_confirmed_at เพราะไม่มีใครยืนยันจริง ต่างจากนายหน้ากด "ลูกค้ามาแล้ว" เอง
 */
export async function autoCompleteOverdueAppointments(): Promise<void> {
  const graceCutoff = new Date(getTodayDateBangkok());
  graceCutoff.setUTCDate(graceCutoff.getUTCDate() - VISIT_CONFIRM_GRACE_DAYS);

  await db.appointments.updateMany({
    where: {
      status: 'approved',
      appointment_date: { lt: graceCutoff }
    },
    data: { status: 'completed' }
  });
}

/**
 * 🔑 KEYWORD: นัดที่นายหน้าขอเลื่อนแล้วลูกค้าไม่ตอบจนวันนัดผ่านไป
 * นายหน้าเสนอวันใหม่ไว้ แต่ลูกค้าไม่เคยกดรับ และวันที่เสนอก็ผ่านไปแล้ว = นัดนั้นตายไปแล้วจริงๆ
 * ยกเลิกให้อัตโนมัติ + คืนรอบว่างเข้าระบบ ไม่ปล่อยค้างอยู่ในแท็บนัดที่จะถึงตลอดไป
 * ไม่นับเป็น no_show เพราะไม่ใช่ความผิดลูกค้า (นายหน้าเป็นฝ่ายขอเลื่อนเอง)
 */
export async function autoCancelExpiredRescheduleOffers(): Promise<void> {
  const today = getTodayDateBangkok();

  const expired = await db.appointments.findMany({
    where: {
      status: APPOINTMENT_STATUS.AWAITING_CUSTOMER,
      appointment_date: { lt: today }
    },
    select: { 
      id: true, 
      property_id: true, 
      appointment_date: true, 
      time_slot: true,
      customer_id: true,
      properties: { select: { title: true } }
    }
  });

  for (const apt of expired) {
    await db.appointments.update({
      where: { id: apt.id },
      data: {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancel_reason: 'ลูกค้าไม่ได้ยืนยันวันใหม่ภายในกำหนด ระบบจึงยกเลิกให้อัตโนมัติ'
      }
    });

    if (apt.property_id) {
      await db.property_viewing_slots.updateMany({
        where: { property_id: apt.property_id, available_date: apt.appointment_date, time_slot: apt.time_slot ?? undefined },
        data: { is_booked: false }
      });
    }

    if (apt.customer_id) {
      const propTitle = apt.properties?.title || 'อสังหาริมทรัพย์';
      notifyUser({
        userId: apt.customer_id,
        title: 'แจ้งยกเลิกคำขอนัดหมายอัตโนมัติ',
        content: `นัดหมายเข้าชม "${propTitle}" ถูกยกเลิกเนื่องจากพ้นกำหนดเวลายืนยันวันใหม่ ท่านสามารถเลือกจองรอบใหม่ที่สะดวกได้ตลอดเวลา`,
        type: 'appointment',
        linkUrl: '/appointments'
      }).catch(err => console.error('Error sending auto-cancel notification:', err));
    }
  }
}

/** นับจำนวนครั้งที่ลูกค้าคนนี้เคยเบี้ยวนัด (status = no_show) สะสมทั้งหมด */
export async function countNoShows(customerId: string): Promise<number> {
  return db.appointments.count({
    where: { customer_id: customerId, status: 'no_show' }
  });
}

/** ลูกค้าคนนี้เบี้ยวนัดครบ NO_SHOW_LIMIT แล้วหรือยัง (ครบแล้ว = จองนัดใหม่ไม่ได้) */
export async function isCustomerBlockedByNoShow(customerId: string): Promise<boolean> {
  const count = await countNoShows(customerId);
  return count >= NO_SHOW_LIMIT;
}
