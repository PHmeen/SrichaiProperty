// 🔑 KEYWORD: กันนายหน้าเปิดวันว่างชนกันข้ามบ้าน
import { db } from '@/lib/db';

/**
 * เช็คว่านายหน้าคนนี้เปิดวันว่างช่วงเวลานี้ไว้ที่ "บ้านหลังอื่น" อยู่แล้วหรือยัง
 * ป้องกันนายหน้าคนเดียวเปิดวันว่างซ้อนกันข้ามประกาศ (ซึ่งจะทำให้ถูกจอง 2 ที่พร้อมกันได้)
 *
 * @deprecated เลิกใช้แล้ว — เปลี่ยนไปล็อกตอนลูกค้ากดจองจริง (ดู hasAgentBookingConflict)
 * ของเดิมล็อกเร็วเกินไปตั้งแต่ตอนนายหน้าเปิดวันว่าง ทำให้บ้านหลังอื่นเปิดวันเดียวกันไม่ได้เลย
 * ทั้งที่ยังไม่มีลูกค้าจองจริง เสียโอกาสฟรีๆ ถ้าวันนั้นไม่มีคนจอง
 */
export async function hasAgentSlotConflict(
  agentId: string,
  excludePropertyId: string,
  availableDate: Date,
  timeSlot: string
): Promise<boolean> {
  const conflict = await db.property_viewing_slots.findFirst({
    where: {
      available_date: availableDate,
      time_slot: timeSlot,
      property_id: { not: excludePropertyId },
      properties: { agent_id: agentId }
    },
    select: { id: true }
  });
  return !!conflict;
}

/** สถานะนัดหมายที่ยัง "จองอยู่จริง" — กันชนเฉพาะนัดที่ยังไม่ถูกยกเลิก/ปฏิเสธ/ปิดงาน */
const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'approved'];

/**
 * เช็คว่านายหน้าคนนี้มีนัดหมายที่ยัง active อยู่แล้วในวัน+เวลานี้ กับ "บ้านหลังอื่น" หรือไม่
 * ใช้ล็อกตอนลูกค้ากดจองจริง (จุดเดียวที่ต้องกันชน) แทนการล็อกตั้งแต่ตอนเปิดวันว่าง
 * นายหน้าไปนำชมได้ทีละที่ ถ้ามีนัดที่บ้าน A เวลานี้แล้ว จะรับนัดบ้าน B เวลาเดียวกันซ้อนไม่ได้
 */
export async function hasAgentBookingConflict(
  agentId: string,
  excludePropertyId: string,
  appointmentDate: Date,
  timeSlot: string
): Promise<boolean> {
  const conflict = await db.appointments.findFirst({
    where: {
      agent_id: agentId,
      property_id: { not: excludePropertyId },
      appointment_date: appointmentDate,
      time_slot: timeSlot,
      status: { in: ACTIVE_APPOINTMENT_STATUSES }
    },
    select: { id: true }
  });
  return !!conflict;
}
