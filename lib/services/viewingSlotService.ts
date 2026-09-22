
import { db } from '@/lib/db';

/**
 * สถานะนัดหมายที่ยัง "จองอยู่จริง" — กันชนเฉพาะนัดที่ยังไม่ถูกยกเลิก/ปฏิเสธ/ปิดงาน
 * awaiting_customer ต้องนับด้วย: นายหน้าเสนอวันใหม่ไปแล้วและรอบนั้นถูกล็อกไว้รอลูกค้าตอบ
 * ถ้าไม่นับ นายหน้าจะเลื่อนนัดอีกใบมาทับวัน+รอบเดียวกันได้
 */
export const ACTIVE_APPOINTMENT_STATUSES = ['pending', 'approved', 'awaiting_customer'];

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
