// === API จัดการวันเวลาที่นายหน้าว่างสำหรับนัดหมายดูบ้าน (Agent Availability) ===
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

interface AgentSession {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
}

async function getCurrentAgent() {
  const session = (await getServerSession(authOptions)) as AgentSession | null;
  if (!session?.user?.id) {
    return { error: "กรุณาเข้าสู่ระบบก่อน", status: 401 as const };
  }
  if (session.user.role !== "agent") {
    return { error: "อนุญาตเฉพาะบัญชีนายหน้าเท่านั้น", status: 403 as const };
  }
  return { agentId: session.user.id };
}

export async function GET(req: Request) {
  try {
    const auth = await getCurrentAgent();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let dateFilter = {};
    if (year && month) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      dateFilter = { available_date: { gte: start, lt: end } };
    }

    const availabilities = await db.agent_availabilities.findMany({
      where: {
        agent_id: auth.agentId,
        ...dateFilter,
      },
      orderBy: [{ available_date: "asc" }, { time_slot: "asc" }],
    });

    const formatted = availabilities.map((a) => ({
      id: a.id,
      date: a.available_date.toISOString().split("T")[0],
      timeSlot: a.time_slot,
      isBooked: a.is_booked,
    }));

    return NextResponse.json({ success: true, availabilities: formatted });
  } catch (error) {
    const err = error as Error;
    console.error("Fetch Agent Availability Error:", err);
    return NextResponse.json(
      { error: "ดึงข้อมูลวันว่างล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getCurrentAgent();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { date, timeSlot } = body;

    if (!date || !timeSlot) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่และช่วงเวลา" },
        { status: 400 }
      );
    }
    if (timeSlot !== "morning" && timeSlot !== "afternoon") {
      return NextResponse.json(
        { error: "ช่วงเวลาต้องเป็น morning หรือ afternoon เท่านั้น" },
        { status: 400 }
      );
    }

    const availability = await db.agent_availabilities.upsert({
      where: {
        agent_id_available_date_time_slot: {
          agent_id: auth.agentId,
          available_date: new Date(date),
          time_slot: timeSlot,
        },
      },
      update: {},
      create: {
        agent_id: auth.agentId,
        available_date: new Date(date),
        time_slot: timeSlot,
        is_booked: false,
      },
    });

    return NextResponse.json({ success: true, data: availability });
  } catch (error) {
    const err = error as Error;
    console.error("Create Agent Availability Error:", err);
    return NextResponse.json(
      { error: "เปิดวันว่างล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getCurrentAgent();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { date, timeSlot } = body;

    if (!date || !timeSlot) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่และช่วงเวลา" },
        { status: 400 }
      );
    }

    const result = await db.agent_availabilities.deleteMany({
      where: {
        agent_id: auth.agentId,
        available_date: new Date(date),
        time_slot: timeSlot,
        is_booked: false,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "ไม่พบวันว่างนี้ หรือช่วงเวลานี้ถูกจองไปแล้วจึงลบไม่ได้" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    console.error("Delete Agent Availability Error:", err);
    return NextResponse.json(
      { error: "ปิดวันว่างล้มเหลว: " + err.message },
      { status: 500 }
    );
  }
}