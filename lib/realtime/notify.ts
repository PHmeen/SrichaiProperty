import { db } from '@/lib/db';
import { getPusher } from './pusher';
import { notificationChannelName } from './channels';
import { sendEmail, checkChatEmailAllowed } from '@/lib/services/emailService';
import {
  getAppointmentEmailTemplate,
  getChatNotificationEmailTemplate,
  getPropertyApprovalEmailTemplate,
  getKycStatusEmailTemplate,
  getPaymentEmailTemplate,
  getGeneralNotificationEmailTemplate,
} from '@/lib/templates/emailTemplates';

export interface NotifyInput {
  userId: string;
  title: string;
  content: string;
  type: string;
  linkUrl?: string | null;
}

/**
 * ส่งการแจ้งเตือนไปยังผู้ใช้ (Realtime Pusher + Database + Automated Email Notification)
 */
export async function notifyUser({ userId, title, content, type, linkUrl }: NotifyInput) {
  // 1. บันทึกลงตาราง notifications ในฐานข้อมูล PostgreSQL
  const notification = await db.notifications.create({
    data: { user_id: userId, title, content, type, link_url: linkUrl ?? null, is_read: false }
  });

  // 2. กระจายสัญญาณ Realtime WebSocket ผ่าน Pusher
  await getPusher().trigger(notificationChannelName(userId), 'new-notification', {
    id: notification.id,
    title: notification.title,
    content: notification.content,
    isRead: false,
    type: notification.type,
    linkUrl: notification.link_url,
    createdAt: notification.created_at
  }).catch(err => console.error('Pusher trigger error (notification):', err));

  // 3. ส่งอีเมลแจ้งเตือนอัตโนมัติแบบ Asynchronous Non-blocking (ไม่ถ่วงเวลาการโหลดหน้าเว็บ)
  dispatchEmailNotification({ userId, title, content, type, linkUrl })
    .catch(err => console.error('Email dispatch error (notifyUser):', err));

  return notification;
}

export async function notifyUsers(userIds: string[], data: Omit<NotifyInput, 'userId'>) {
  return Promise.allSettled(userIds.map(userId => notifyUser({ userId, ...data })));
}

/**
 * ผู้ช่วยส่งอีเมลแจ้งเตือนโดยคัดเลือกเทมเพลตตามประเภท (Email Notification Dispatcher)
 */
async function dispatchEmailNotification({ userId, title, content, type, linkUrl }: NotifyInput) {
  try {
    // ดึงข้อมูลอีเมลและชื่อของผู้รับจากตาราง users
    const recipient = await db.users.findUnique({
      where: { id: userId },
      select: { email: true, first_name: true, last_name: true, role_id: true }
    });

    if (!recipient?.email || !recipient.email.includes('@')) {
      return; // ไม่มีอีเมลหรือรูปแบบไม่ถูกต้อง
    }

    const recipientName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'ผู้ใช้งาน';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fullActionUrl = linkUrl
      ? (linkUrl.startsWith('http') ? linkUrl : `${baseUrl}${linkUrl.startsWith('/') ? '' : '/'}${linkUrl}`)
      : baseUrl;

    let emailPayload: { subject: string; html: string; text: string } | null = null;

    // --------------------------------------------------------------------------
    // A. กรณีเป็นข้อความแชท (Chat Notification)
    // --------------------------------------------------------------------------
    if (type === 'chat') {
      let sessionId = 'general';
      if (linkUrl) {
        const match = linkUrl.match(/sessionId=([^&]+)/);
        if (match) sessionId = match[1];
      }

      // ตรวจสอบ Cooldown ป้องกันการส่งอีเมลถี่เกินไปเวลาแชทคุยกัน
      if (!checkChatEmailAllowed(sessionId, userId)) {
        return; // ข้ามการส่งอีเมลเพื่อป้องกันสแปม
      }

      const senderMatch = title.match(/จาก\s+(?:คุณ)?(.+)/);
      const senderName = senderMatch ? senderMatch[1].trim() : 'คู่สนทนา';
      const senderRoleText = recipient.role_id === 'agent' ? 'ลูกค้าผู้สนใจ' : 'นายหน้าผู้ดูแล';

      emailPayload = getChatNotificationEmailTemplate({
        recipientName,
        senderName,
        senderRoleText,
        messagePreview: content,
        actionUrl: fullActionUrl,
      });
    }
    // --------------------------------------------------------------------------
    // B. กรณีเป็นการนัดหมาย / เตือนนัด / คิวรอ (Appointment & Waitlist)
    // --------------------------------------------------------------------------
    else if (type === 'appointment' || type === 'reminder' || type === 'waitlist') {
      const isReminder = type === 'reminder' || title.includes('เตือน');
      const isCancelled = title.includes('ยกเลิก') || title.includes('ปฏิเสธ');
      const isConfirmed = title.includes('ยืนยัน') || title.includes('ตอบรับ');
      const isRescheduled = title.includes('เลื่อน');

      let eventType: 'new' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder' = 'new';
      if (isReminder) eventType = 'reminder';
      else if (isCancelled) eventType = 'cancelled';
      else if (isConfirmed) eventType = 'confirmed';
      else if (isRescheduled) eventType = 'rescheduled';

      emailPayload = getAppointmentEmailTemplate({
        role: recipient.role_id === 'agent' ? 'agent' : 'customer',
        eventType,
        recipientName,
        propertyTitle: content.length > 60 ? content.slice(0, 60) + '…' : content,
        date: 'ตามกำหนดการในระบบ',
        timeSlot: 'กรุณาดูรายละเอียดในใบนัด',
        otherPartyName: recipient.role_id === 'agent' ? 'ลูกค้าผู้ขอนัดหมาย' : 'นายหน้าผู้ดูแล',
        actionUrl: fullActionUrl,
      });
    }
    // --------------------------------------------------------------------------
    // C. กรณีเป็นเอกสารยืนยันตัวตน KYC (Agent KYC Status)
    // --------------------------------------------------------------------------
    else if (type === 'kyc') {
      const isApproved = title.includes('ผ่าน') || title.includes('อนุมัติ');
      emailPayload = getKycStatusEmailTemplate({
        agentName: recipientName,
        isApproved,
        reason: isApproved ? undefined : content,
        actionUrl: fullActionUrl,
      });
    }
    // --------------------------------------------------------------------------
    // D. กรณีเป็นประกาศทรัพย์ (Property Listings)
    // --------------------------------------------------------------------------
    else if (type === 'property') {
      const isApproved = title.includes('ผ่าน') || title.includes('อนุมัติ');
      emailPayload = getPropertyApprovalEmailTemplate({
        agentName: recipientName,
        propertyTitle: content.length > 60 ? content.slice(0, 60) + '…' : content,
        isApproved,
        reason: isApproved ? undefined : content,
        actionUrl: fullActionUrl,
      });
    }
    // --------------------------------------------------------------------------
    // E. กรณีเป็นการชำระเงินและแพ็กเกจ (Payment & Package Upgrade)
    // --------------------------------------------------------------------------
    else if (type === 'payment' || type === 'package') {
      const isApproved = title.includes('สำเร็จ') || title.includes('อนุมัติ');
      emailPayload = getPaymentEmailTemplate({
        userName: recipientName,
        packageName: 'Agent Pro',
        amount: 'ตามที่ทำรายการ',
        isApproved,
        actionUrl: fullActionUrl,
      });
    }
    // --------------------------------------------------------------------------
    // F. การแจ้งเตือนทั่วไป / ข่าวสารระบบ (General Notification)
    // --------------------------------------------------------------------------
    else {
      emailPayload = getGeneralNotificationEmailTemplate({
        recipientName,
        title,
        leadText: content,
        actionText: 'ดูรายละเอียดบนเว็บไซต์',
        actionUrl: fullActionUrl,
      });
    }

    if (emailPayload) {
      await sendEmail({
        to: recipient.email,
        subject: emailPayload.subject,
        html: emailPayload.html,
        text: emailPayload.text,
      });
    }
  } catch (error) {
    console.error('[dispatchEmailNotification Error]:', error);
  }
}
