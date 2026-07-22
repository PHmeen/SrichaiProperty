import { db } from '@/lib/db';

/**
 * ดึงรายการอสังหาริมทรัพย์ทั้งหมดในระบบ
 */
export async function getAllProperties() {
  return await db.properties.findMany({
    include: {
      users: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          phone: true,
          email: true,
        }
      },
      property_types: true,
      property_images: {
        orderBy: { order_index: 'asc' }
      },
      property_amenities: {
        include: { amenities: true }
      },
      property_nearbies: {
        include: { nearby_places: true }
      }
    },
    orderBy: { created_at: 'desc' }
  });
}

/**
 * ดึงรายละเอียดอสังหาริมทรัพย์ด้วย ID
 */
export async function getPropertyById(id: string) {
  return await db.properties.findUnique({
    where: { id },
    include: {
      users: true,
      property_types: true,
      property_images: true,
      property_amenities: { include: { amenities: true } },
      property_nearbies: { include: { nearby_places: true } }
    }
  });
}
