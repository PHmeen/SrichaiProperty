import { createClient } from '@supabase/supabase-js';

// ค่า Config สำหรับเชื่อมต่อ Supabase
// (ข้อมูลจะดึงจากไฟล์ .env.local ตอนรันระบบจริง)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* =========================================================================
   1. จัดการข้อมูลผู้ใช้งาน (Profiles)
   ========================================================================= */

// ดึงข้อมูลโปรไฟล์ผู้ใช้งาน
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
}

// อัปเดตข้อมูลโปรไฟล์ผู้ใช้งาน
export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { data, error };
}

/* =========================================================================
   2. จัดการข้อมูลบ้าน/ประกาศ (Properties)
   ========================================================================= */

// ดึงรายการประกาศบ้านทั้งหมดที่ได้รับอนุมัติแล้ว
export async function getProperties() {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  return { data, error };
}

// ดึงรายละเอียดประกาศบ้านรายชิ้น
export async function getPropertyById(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*, profiles(*)')
    .eq('id', id)
    .single();
  return { data, error };
}

// เพิ่มประกาศขายบ้านใหม่
export async function addProperty(propertyData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('properties')
    .insert([propertyData]);
  return { data, error };
}

/* =========================================================================
   3. จัดการการจองนัดหมาย (Appointments)
   ========================================================================= */

// จองคิวนัดหมายใหม่
export async function bookAppointment(appointmentData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData]);
  return { data, error };
}

// ดึงรายการจองของตนเอง (ของลูกค้า หรือของนายหน้า)
export async function getAppointments(role: 'customer' | 'agent', userId: string) {
  const query = supabase
    .from('appointments')
    .select('*, properties(*)');

  if (role === 'customer') {
    query.eq('customer_id', userId);
  } else {
    query.eq('agent_id', userId);
  }

  const { data, error } = await query.order('appointment_date', { ascending: true });
  return { data, error };
}

/* =========================================================================
   4. ระบบแชทเรียลไทม์ (Chat Messages)
   ========================================================================= */

// ดึงประวัติการคุยแชท
export async function getChatMessages(senderId: string, receiverId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
    .order('created_at', { ascending: true });
  return { data, error };
}

// ส่งข้อความแชทใหม่
export async function sendChatMessage(senderId: string, receiverId: string, content: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ sender_id: senderId, receiver_id: receiverId, content }]);
  return { data, error };
}
