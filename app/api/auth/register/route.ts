import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { email, password, fullName, phone, role } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const existingUser = await db.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "อีเมลนี้ถูกใช้งานไปแล้ว" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // แยก fullName เป็น first_name และ last_name
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const newUser = await db.users.create({
      data: {
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone,
        role_id: role || "buyer"
      }
    });

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
    const err = error as Error;
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดของระบบ: " + err.message },
      { status: 500 }
    );
  }
}