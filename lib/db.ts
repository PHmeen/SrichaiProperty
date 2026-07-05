import { supabase } from "./supabaseClient";

/**
 * ดึงรายการประกาศอสังหาริมทรัพย์ที่ผ่านการอนุมัติแล้ว (Approved) ทั้งหมดจาก Supabase
 */
export async function getProperties() {
  try {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("status", "approved") // ดึงเฉพาะประกาศที่ผ่านการอนุมัติจากแอดมินแล้ว
      .order("created_at", { ascending: false }); // เรียงประกาศล่าสุดขึ้นก่อน

    if (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูล:", error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("ระบบฐานข้อมูลขัดข้อง:", err);
    return [];
  }
}

/**
 * เพิ่มประกาศอสังหาริมทรัพย์ใหม่ (สำหรับนายหน้า)
 */
export async function addProperty(propertyData: any) {
  try {
    const { data, error } = await supabase
      .from("properties")
      .insert([
        {
          ...propertyData,
          status: "pending", // ประกาศเริ่มต้นจะมีสถานะรอการตรวจสอบ (Pending) เสมอเพื่อความปลอดภัย
        }
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error("ไม่สามารถเพิ่มประกาศได้:", err.message);
    return { success: false, error: err.message };
  }
}
