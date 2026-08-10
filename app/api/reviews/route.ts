import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";
import { notifyUser } from "@/lib/notify";

/**
 * ==============================================================================
 * API Endpoint สำหรับระบบรีวิวและให้คะแนนดาวนายหน้า (Agent Reviews API Route)
 * /app/api/reviews/route.ts
 * ==============================================================================
 * วัตถุประสงค์หลัก:
 * 1. GET: ดึงรายการรีวิวและคำนวณคะแนนเฉลี่ยดาว (Average Rating) ของนายหน้ารายนั้นๆ
 * 2. POST: บันทึก/อัปเดตรีวิวจากลูกค้า (Upsert) พร้อมส่งการแจ้งเตือนไปยังนายหน้า
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. GET: ดึงรีวิวและคะแนนเฉลี่ยดาวของนายหน้าตาม agentId
// ------------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "กรุณาระบุ agentId" }, { status: 400 });
    }

    // ดึงรายการรีวิวทั้งหมดของนายหน้านี้ใน Query เดียว โดยใช้ Prisma Relation Filter
    const reviewsList = await db.reviews.findMany({
      where: { appointments: { agent_id: agentId } },
      include: {
        appointments: {
          include: {
            users_appointments_customer_idTousers: {
              select: { first_name: true, last_name: true, profile_image: true }
            },
            properties: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { created_at: "desc" }
    });

    // คำนวณคะแนนเฉลี่ยดาว
    const count = reviewsList.length;
    const totalRating = reviewsList.reduce((sum, r) => sum + (r.rating || 5), 0);
    const averageRating = count > 0 ? (totalRating / count).toFixed(1) : "5.0";

    const formattedReviews = reviewsList.map(r => {
      const customer = r.appointments?.users_appointments_customer_idTousers;
      return {
        id: r.id,
        rating: r.rating || 5,
        comment: r.comment || "",
        createdAt: r.created_at,
        customerName: customer ? `${customer.first_name} ${customer.last_name}` : "ลูกค้าทั่วไป",
        customerImage: customer?.profile_image,
        propertyTitle: r.appointments?.properties?.title || "อสังหาริมทรัพย์"
      };
    });

    return NextResponse.json({
      success: true,
      averageRating: parseFloat(averageRating),
      totalReviews: count,
      reviews: formattedReviews
    });
  } catch (error) {
    console.error("GET Reviews Error:", error);
    return NextResponse.json({ error: "ดึงข้อมูลรีวิวล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}

// ------------------------------------------------------------------------------
// 2. POST: บันทึกรีวิวใหม่ หรือ อัปเดตรีวิวเดิมจากลูกค้า
// ------------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดำเนินการ" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const { appointmentId, rating, comment } = await req.json();

    if (!appointmentId || !rating) {
      return NextResponse.json({ error: "กรุณาระบุรหัสนัดหมายและคะแนนดาว" }, { status: 400 });
    }

    const appointment = await db.appointments.findUnique({
      where: { id: appointmentId }
    });

    if (!appointment) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการนัดหมายนี้" }, { status: 404 });
    }

    if (appointment.customer_id !== user.id) {
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์รีวิวการนัดหมายนี้" }, { status: 403 });
    }

    // บันทึก หรือ อัปเดตรีวิวกรณีเคยรีวิวไปแล้ว (Upsert)
    const newReview = await db.reviews.upsert({
      where: { appointment_id: appointmentId },
      update: {
        rating: parseInt(rating),
        comment: comment || ""
      },
      create: {
        appointment_id: appointmentId,
        rating: parseInt(rating),
        comment: comment || ""
      }
    });

    // ส่งการแจ้งเตือนไปยังนายหน้าผู้ดูแลการนัดหมาย
    if (appointment.agent_id) {
      await notifyUser({
        userId: appointment.agent_id,
        title: "⭐ คุณได้รับการรีวิวใหม่จากลูกค้า",
        content: `${user.first_name} ให้ ${rating} ดาว: "${comment || 'ไม่มีข้อความคอมเมนต์'}"`,
        type: "review"
      }).catch(err => console.error("Notification trigger error:", err));
    }

    return NextResponse.json({ success: true, data: newReview });
  } catch (error) {
    console.error("POST Review Error:", error);
    return NextResponse.json({ error: "บันทึกรีวิวล้มเหลว: " + (error as Error).message }, { status: 500 });
  }
}
