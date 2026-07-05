import { createClient } from "@supabase/supabase-js";

// ดึงรหัสเชื่อมต่อจากไฟล์ .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// สร้าง Client สำหรับเชื่อมต่อและส่งออกไปใช้ในหน้าอื่น ๆ
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
