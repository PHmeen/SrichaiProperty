// 🔑 KEYWORD: กันนายหน้าเปิดวันว่างชนกันข้ามบ้าน
import { db } from '@/lib/db';

/**
 * เช็คว่านายหน้าคนนี้เปิดวันว่างช่วงเวลานี้ไว้ที่ "บ้านหลังอื่น" อยู่แล้วหรือยัง
 * ป้องกันนายหน้าคนเดียวเปิดวันว่างซ้อนกันข้ามประกาศ (ซึ่งจะทำให้ถูกจอง 2 ที่พร้อมกันได้)
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
