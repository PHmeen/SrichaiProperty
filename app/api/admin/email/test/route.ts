import { NextResponse } from 'next/server';
import { sendEmail, isEmailConfigured, verifyEmailConnection } from '@/lib/services/emailService';
import {
  getAppointmentEmailTemplate,
  getChatNotificationEmailTemplate,
  getPropertyApprovalEmailTemplate,
  getKycStatusEmailTemplate,
  getPaymentEmailTemplate,
  getGeneralNotificationEmailTemplate,
} from '@/lib/templates/emailTemplates';

/**
 * GET: ตรวจสอบสถานะการเชื่อมต่อระบบอีเมล (SMTP Health Check)
 */
export async function GET() {
  const configured = isEmailConfigured();
  const connectionCheck = await verifyEmailConnection();

  return NextResponse.json({
    status: 'ok',
    isConfigured: configured,
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: process.env.SMTP_PORT || '465',
    emailFrom: process.env.EMAIL_FROM || 'Srichai Property',
    connection: connectionCheck,
    mode: configured ? 'production_smtp' : 'dev_mock_mode',
    instructions: configured
      ? 'ระบบพร้อมส่งอีเมลจริงแล้ว'
      : 'กรุณาระบุ SMTP_USER และ SMTP_PASS ในไฟล์ .env.local เพื่อส่งอีเมลจริงเข้า Inbox',
  });
}

/**
 * POST: ทดสอบส่งอีเมลตามประเภทที่เลือก (Send Test Email)
 * Request Body:
 * {
 *   "to": "your_email@gmail.com",
 *   "templateType": "appointment" | "chat" | "kyc" | "property" | "payment" | "general"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const to = body.to || process.env.SMTP_USER;
    const templateType = body.templateType || 'general';

    if (!to || typeof to !== 'string' || !to.includes('@')) {
      return NextResponse.json(
        { error: 'กรุณาระบุอีเมลปลายทางที่ถูกต้องในฟิลด์ "to"' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    let payload: { subject: string; html: string; text: string };

    switch (templateType) {
      case 'appointment':
        payload = getAppointmentEmailTemplate({
          role: 'agent',
          eventType: 'new',
          recipientName: 'คุณทดสอบ ระบบนายหน้า',
          propertyTitle: 'บ้านเดี่ยว 2 ชั้น ศุภาลัย การ์เด้นวิลล์ หาดใหญ่',
          propertyLocation: 'ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา',
          date: 'วันเสาร์ที่ 12 ตุลาคม 2026',
          timeSlot: '10:00 - 11:30 น.',
          otherPartyName: 'คุณสมชาย ใจดี',
          otherPartyPhone: '081-234-5678',
          actionUrl: `${baseUrl}/agent/appointments`,
        });
        break;

      case 'chat':
        payload = getChatNotificationEmailTemplate({
          recipientName: 'คุณทดสอบ สมาชิก',
          senderName: 'คุณวิชัย นายหน้ามืออาชีพ',
          senderRoleText: 'นายหน้าผู้ดูแลทรัพย์',
          messagePreview: 'สวัสดีครับ บ้านเดี่ยวหลังนี้ยังว่างอยู่ครับ สะดวกเข้ามาชมช่วงบ่ายวันอาทิตย์ไหมครับ?',
          propertyTitle: 'คอนโดมิเนียมหรู ใกล้ ม.อ. หาดใหญ่',
          actionUrl: `${baseUrl}/chat`,
        });
        break;

      case 'kyc':
        payload = getKycStatusEmailTemplate({
          agentName: 'คุณทดสอบ นายหน้า',
          isApproved: true,
          actionUrl: `${baseUrl}/agent/dashboard`,
        });
        break;

      case 'property':
        payload = getPropertyApprovalEmailTemplate({
          agentName: 'คุณทดสอบ นายหน้า',
          propertyTitle: 'ทาวน์โฮมสไตล์โมเดิร์น โซนคลองแห หาดใหญ่',
          isApproved: true,
          actionUrl: `${baseUrl}/search`,
        });
        break;

      case 'payment':
        payload = getPaymentEmailTemplate({
          userName: 'คุณทดสอบ พรีเมียม',
          packageName: 'Agent Pro (รายปี)',
          amount: '4,900',
          isApproved: true,
          actionUrl: `${baseUrl}/agent/packages`,
        });
        break;

      case 'general':
      default:
        payload = getGeneralNotificationEmailTemplate({
          recipientName: 'คุณผู้ใช้งาน Srichai Property',
          title: 'ทดสอบระบบส่งอีเมลแจ้งเตือนอัตโนมัติ (Test Notification)',
          leadText: 'นี่คืออีเมลทดสอบจากระบบ Srichai Property เพื่อยืนยันว่าการตั้งค่า Nodemailer และเทมเพลตอีเมลทำงานได้อย่างสมบูรณ์แบบ',
          details: [
            { label: 'โหมดการทำงาน', value: isEmailConfigured() ? 'SMTP จริง (Gmail)' : 'โหมดจำลอง (Mock)' },
            { label: 'เวลาส่ง', value: new Date().toLocaleString('th-TH') },
            { label: 'ความปลอดภัย', value: 'TLS / SSL Encrypted' },
          ],
          actionText: 'เข้าสู่เว็บไซต์ Srichai Property',
          actionUrl: baseUrl,
        });
        break;
    }

    const result = await sendEmail({
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return NextResponse.json({
      success: result.success,
      to,
      templateType,
      subject: payload.subject,
      mocked: result.mocked ?? false,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการทดสอบส่งอีเมล: ' + err.message },
      { status: 500 }
    );
  }
}
