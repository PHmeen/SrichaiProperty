import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { db } from '@/lib/db';

async function getAgent() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return await db.users.findUnique({ where: { email: session.user.email } });
}

// GET: ดึงเทมเพลตข้อความตอบกลับด่วนของนายหน้าคนนี้จากฐานข้อมูลจริง
export async function GET() {
  const agent = await getAgent();
  if (!agent || agent.role_id !== 'agent') {
    return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  let templates = await db.quick_reply_templates.findMany({
    where: { agent_id: agent.id },
    orderBy: { created_at: 'desc' }
  });

  // นายหน้าที่ยังไม่เคยสร้างเทมเพลตเลย -> สร้างเทมเพลตตัวอย่างเริ่มต้นให้ในฐานข้อมูลจริง (ครั้งเดียว)
  if (templates.length === 0) {
    const defaults = [
      { title: 'ส่งพิกัดจุดนัดพบ', content: '📍 [พิกัดจุดนัดพบ] แผนที่เดินทางหน้าโครงการ: https://maps.google.com/?q=7.0089,100.4975' },
      { title: 'ส่งไฟล์เอกสารบ้าน', content: '📄 [แนบเอกสาร] โบรชัวร์โครงการและแบบแปลนบ้าน.pdf' },
      { title: 'ขอเบอร์ติดต่อกลับ', content: '📋 [ขอเบอร์ติดต่อกลับ] สะดวกรบกวนขอเบอร์โทรศัพท์ติดต่อกลับเพื่อคุยรายละเอียดเพิ่มเติมด้วยครับ' }
    ];
    await db.quick_reply_templates.createMany({
      data: defaults.map(d => ({ agent_id: agent.id, title: d.title, content: d.content }))
    });
    templates = await db.quick_reply_templates.findMany({
      where: { agent_id: agent.id },
      orderBy: { created_at: 'desc' }
    });
  }

  return NextResponse.json({
    success: true,
    templates: templates.map(t => ({ id: t.id, title: t.title, content: t.content }))
  });
}

// POST: สร้างเทมเพลตข้อความตอบกลับด่วนใหม่
export async function POST(request: Request) {
  const agent = await getAgent();
  if (!agent || agent.role_id !== 'agent') {
    return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  const body = await request.json();
  const { title, content } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'กรุณากรอกชื่อหัวข้อและข้อความให้ครบถ้วน' }, { status: 400 });
  }

  const count = await db.quick_reply_templates.count({ where: { agent_id: agent.id } });
  if (count >= 20) {
    return NextResponse.json({ error: 'สร้างเทมเพลตได้สูงสุด 20 รายการ' }, { status: 400 });
  }

  const template = await db.quick_reply_templates.create({
    data: { agent_id: agent.id, title: title.trim().slice(0, 100), content: content.trim() }
  });

  return NextResponse.json({ success: true, template: { id: template.id, title: template.title, content: template.content } });
}

// DELETE: ลบเทมเพลตข้อความตอบกลับด่วน
export async function DELETE(request: Request) {
  const agent = await getAgent();
  if (!agent || agent.role_id !== 'agent') {
    return NextResponse.json({ error: 'สิทธิ์ไม่ถูกต้อง หรือยังไม่ได้เข้าสู่ระบบ' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'กรุณาระบุรหัสเทมเพลตที่ต้องการลบ' }, { status: 400 });
  }

  const template = await db.quick_reply_templates.findUnique({ where: { id } });
  if (!template || template.agent_id !== agent.id) {
    return NextResponse.json({ error: 'ไม่พบเทมเพลตนี้ หรือคุณไม่มีสิทธิ์ลบ' }, { status: 404 });
  }

  await db.quick_reply_templates.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
