import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { db } from "@/lib/db";

interface SessionUser {
  user?: {
    id?: string;
    email?: string;
  };
}

// GET: ดึงรีวิวของนายหน้า หรือคะแนนเฉลี่ยดาว
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");

    if (!agentId) {
      return NextResponse.json({ error: "กรุณาระบุ agentId" }, { status: 400 });
    }

    const appointments = await db.appointments.findMany({
      where: { agent_id: agentId },
      select: { id: true }
    });

    const appointmentIds = appointments.map(a => a.id);

    const reviewsList = await db.reviews.findMany({
      where: { appointment_id: { in: appointmentIds } },
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

    let totalRating = 0;
    const count = reviewsList.length;
    reviewsList.forEach(r => {
      totalRating += r.rating || 5;
    });

    const averageRating = count > 0 ? (totalRating / count).toFixed(1) : "5.0";

    const formattedReviews = reviewsList.map(r => {
      const customer = r.appointments?.users_appointments_customer_idTousers;
      const customerName = customer ? `${customer.first_name} ${customer.last_name}` : "ลูกค้าทั่วไป";
      return {
        id: r.id,
        rating: r.rating || 5,
        comment: r.comment || "",
        createdAt: r.created_at,
        customerName,
        customerImage: customer?.profile_image,
        propertyTitle: r.appointments?.properties?.title || "อสังหาฯ"
      };
    });

    return NextResponse.json({
      success: true,
      averageRating: parseFloat(averageRating),
      totalReviews: count,
      reviews: formattedReviews
    });
  } catch (error) {
    const err = error as Error;
    console.error("GET Reviews Error:", err);
    return NextResponse.json({ error: "ดึงข้อมูลรีวิวล้มเหลว: " + err.message }, { status: 500 });
  }
}

// POST: บันทึกรีวิวใหม่จากลูกค้า
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as SessionUser | null;
    if (!session?.user?.email) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });
    }

    const user = await db.users.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้ในระบบ" }, { status: 404 });
    }

    const body = await req.json();
    const { appointmentId, rating, comment } = body;

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

    // ส่งการแจ้งเตือนถึงนายหน้า
    if (appointment.agent_id) {
      await db.notifications.create({
        data: {
          user_id: appointment.agent_id,
          title: "⭐ คุณได้รับการรีวิวใหม่จากลูกค้า",
          content: `${user.first_name} ให้ ${rating} ดาว: "${comment || 'ไม่มีข้อความคอมเมนต์'}"`,
          type: "review",
          is_read: false
        }
      }).catch(err => console.error("Notification trigger error:", err));
    }

    return NextResponse.json({ success: true, data: newReview });
  } catch (error) {
    const err = error as Error;
    console.error("POST Review Error:", err);
    return NextResponse.json({ error: "บันทึกรีวิวล้มเหลว: " + err.message }, { status: 500 });
  }
}
