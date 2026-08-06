import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

//  API สำหรับ "สมัครสมาชิกใหม่" ทั้งลูกค้า (customer) และนายหน้า (agent)
// รับ POST request จากฟอร์ม register แล้วสร้าง user ใหม่ลงฐานข้อมูล
export async function POST(request: Request) {
  try {
    // ดึงข้อมูลทั้งหมดจาก body ของ request (ส่งมาเป็น JSON)
    // ฟิลด์ experience/zone/propertyType/kycDoc ใช้เฉพาะกรณีสมัครเป็น agent เท่านั้น
    const { email, password, fullName, phone, role, lineId, experience, zone, propertyType, profileImage, kycDoc } = await request.json();

    // 1. เช็คว่ากรอกข้อมูลจำเป็น (email, password, ชื่อ) มาครบหรือไม่
    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบความแข็งแกร่งของรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" },
        { status: 400 }
      );
    }
    // เงื่อนไขเช็คว่ารหัสผ่านต้องมีทั้งตัวอักษร+ตัวเลขถูก comment ปิดไว้ (ยังไม่บังคับใช้งาน)
    // if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    //   return NextResponse.json(
    //     { error: "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อย 1 ตัว" },
    //     { status: 400 }
    //   );
    // }

    // 3. เช็คว่า email นี้มีคนใช้สมัครไปแล้วหรือยัง (email ต้องไม่ซ้ำในระบบ)
    const existingUser = await db.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานไปแล้ว" },
        { status: 400 }
      );
    }

    // 4. เข้ารหัสรหัสผ่านด้วย bcrypt ก่อนเก็บลงฐานข้อมูล (ห้ามเก็บรหัสผ่านตัวจริงเด็ดขาด)
    // เลข 10 คือ "salt rounds" ยิ่งมากยิ่งปลอดภัยแต่ช้าลง
    const passwordHash = await bcrypt.hash(password, 10);

    // 5. แยกชื่อเต็มที่กรอกมา (fullName) ออกเป็น first_name และ last_name
    // เช่น "สมชาย ใจดี" -> firstName = "สมชาย", lastName = "ใจดี"
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 6. กำหนด role: ถ้าฟอร์มส่ง role มาเป็น 'buyer' ให้แปลงเป็น 'customer' (ชื่อ role ในฐานข้อมูล)
    // ถ้าไม่ได้ส่ง role มาเลย ให้ default เป็น 'customer'
    const userRole = role === 'buyer' ? 'customer' : (role || 'customer');

    // 7. กำหนด status: ถ้าสมัครเป็น agent ต้อง "pending" รอแอดมินอนุมัติก่อนถึงจะ login ได้
    // (ตรงกับเงื่อนไขที่เช็คใน authOptions.ts บรรทัด authorize())
    // ถ้าเป็น customer ธรรมดา อนุมัติทันที (approved) ไม่ต้องรอ
    const userStatus = userRole === 'agent' ? 'pending' : 'approved';

    // 8. สร้าง user ใหม่ลงฐานข้อมูล พร้อมข้อมูลเสริมสำหรับ agent (ถ้ามี)
    const newUser = await db.users.create({
      data: {
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone,
        role_id: userRole,
        status: userStatus,
        is_verified: userRole !== 'agent', // customer ถือว่า verified ทันที ส่วน agent ต้องรอตรวจสอบก่อน
        line_id: lineId || null,
        experience: experience || null,       // ประสบการณ์ทำงาน (เฉพาะ agent)
        specialty_zone: zone || null,          // โซนที่เชี่ยวชาญ (เฉพาะ agent)
        specialty_type: propertyType || null,  // ประเภทอสังหาที่เชี่ยวชาญ (เฉพาะ agent)
        profile_image: profileImage || null,
        kyc_doc: kycDoc || null                // เอกสารยืนยันตัวตน (เฉพาะ agent)
      }
    });

    // 9. สมัครสำเร็จ -> ส่งข้อมูล user (บางส่วน ไม่ส่ง password กลับ) ให้ frontend
    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: `${newUser.first_name} ${newUser.last_name}`,
        role: newUser.role_id
      }
    });
  } catch (error) {
    // ดัก error อื่นๆ ที่ไม่คาดคิด (เช่น ฐานข้อมูลล่ม) แล้วส่ง 500 กลับพร้อมข้อความ
    const err = error as Error;
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดของระบบ: " + err.message },
      { status: 500 }
    );
  }
}