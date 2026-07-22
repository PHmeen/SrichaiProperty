import { db } from '@/lib/db';

/**
 * ดึงรายการนัดหมายตาม ID ผู้ใช้งาน
 */
export async function getAppointmentsByUserId(userId: string) {
  return await db.appointments.findMany({
    where: {
      OR: [
        { customer_id: userId },
        { agent_id: userId }
      ]
    },
    include: {
      properties: {
        include: {
          property_images: { take: 1 }
        }
      },
      users_appointments_agent_idTousers: true,
      users_appointments_customer_idTousers: true
    },
    orderBy: { appointment_date: 'desc' }
  });
}
