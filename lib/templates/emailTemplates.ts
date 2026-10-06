/**
 * ==============================================================================
 * emailTemplates.ts - คลังเทมเพลตอีเมลแจ้งเตือนระดับพรีเมียม (Srichai Property)
 * ==============================================================================
 * ออกแบบด้วย HTML/CSS สไตล์ Responsive รองรับการเปิดบนมือถือ (iOS, Android)
 * และโปรแกรมเปิดอีเมลทุกชนิด (Gmail, Outlook, Apple Mail)
 * ธีมสีหลัก: Deep Navy (#0f172a / #1e3a8a) ตัดสีทอง Amber (#d97706)
 * ==============================================================================
 */

interface BaseEmailOptions {
  title: string;
  badge?: string;
  badgeColor?: string;
  recipientName: string;
  leadText: string;
  details?: { label: string; value: string }[];
  contentHtml?: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

/**
 * โครงสร้างพื้นฐานของอีเมล (Master Layout)
 */
export function renderMasterEmailTemplate({
  title,
  badge = 'Srichai Property Alert',
  badgeColor = '#2563eb',
  recipientName,
  leadText,
  details = [],
  contentHtml = '',
  ctaText,
  ctaUrl,
  footerNote = 'อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติของ Srichai Property'
}: BaseEmailOptions): string {
  const detailsHtml = details.length > 0
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${details.map(d => `
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 38%; vertical-align: top;">${d.label}:</td>
              <td style="padding: 8px 0; color: #0f172a; font-weight: 600; vertical-align: top;">${d.value}</td>
            </tr>
          `).join('')}
        </table>
      </div>
    `
    : '';

  const ctaButtonHtml = ctaText && ctaUrl
    ? `
      <div style="text-align: center; margin: 32px 0 24px 0;">
        <a href="${ctaUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: bold; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          ${ctaText} →
        </a>
      </div>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 28px; text-align: left; border-bottom: 3px solid #d97706;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td>
            <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
              SRICHAI <span style="color: #fbbf24; font-weight: 400;">PROPERTY</span>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; letter-spacing: 0.5px;">
              ศูนย์รวมอสังหาริมทรัพย์หาดใหญ่ สงขลา
            </div>
          </td>
          <td style="text-align: right;">
            <span style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
              ${badge}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Main Content -->
    <div style="padding: 32px 28px;">
      <h1 style="margin: 0 0 16px 0; font-size: 21px; font-weight: 800; color: #0f172a; line-height: 1.35;">
        ${title}
      </h1>
      
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569; line-height: 1.6;">
        เรียน <strong>${recipientName}</strong>,
      </p>

      <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569; line-height: 1.6;">
        ${leadText}
      </p>

      ${detailsHtml}
      ${contentHtml}
      ${ctaButtonHtml}

      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 28px; font-size: 13px; color: #64748b; line-height: 1.5;">
        หากมีข้อสงสัยหรือต้องการความช่วยเหลือเพิ่มเติม สามารถติดต่อทีมงานได้ทางเว็บไซต์ หรือติดต่อผ่านศูนย์ดูแลลูกค้า Srichai Property
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 20px 28px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0 0 6px 0;">${footerNote}</p>
      <p style="margin: 0;">© ${new Date().getFullYear()} Srichai Property. All rights reserved.</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * 1. เทมเพลต: นัดหมายชมบ้าน (Viewing Appointment)
 */
export function getAppointmentEmailTemplate(params: {
  role: 'agent' | 'customer';
  eventType: 'new' | 'confirmed' | 'cancelled' | 'rescheduled' | 'reminder';
  recipientName: string;
  propertyTitle: string;
  propertyLocation?: string;
  date: string;
  timeSlot: string;
  otherPartyName: string;
  otherPartyPhone?: string;
  notes?: string;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const isAgent = params.role === 'agent';
  let subject = '';
  let title = '';
  let badge = 'นัดหมายชมบ้าน';
  let badgeColor = '#2563eb';
  let leadText = '';

  switch (params.eventType) {
    case 'new':
      if (isAgent) {
        subject = `[Srichai Property] 📅 มีการขอนัดหมายชมบ้านใหม่: ${params.propertyTitle}`;
        title = 'มีการส่งคำขอนัดหมายชมบ้านใหม่เข้ามา!';
        badge = 'คำขอนัดหมายใหม่';
        badgeColor = '#ea580c';
        leadText = `มีลูกค้าสนใจเข้าชมทรัพย์สินของคุณ กรุณาตรวจสอบวันเวลาและกดตอบรับนัดหมาย`;
      } else {
        subject = `[Srichai Property] ✅ ส่งคำขอนัดหมายชมบ้านเรียบร้อยแล้ว`;
        title = 'ระบบได้รับคำขอนัดหมายของคุณแล้ว';
        badge = 'รอนายหน้ายืนยัน';
        badgeColor = '#0284c7';
        leadText = `เราได้ส่งคำขอนัดหมายชมบ้านไปยังนายหน้าผู้ดูแลทรัพย์เรียบร้อยแล้ว กรุณารอการตอบรับ`;
      }
      break;

    case 'confirmed':
      subject = `[Srichai Property] 🎉 นายหน้ายืนยันเวลานัดหมายแล้ว: ${params.propertyTitle}`;
      title = 'เวลานัดหมายได้รับการยืนยันเรียบร้อยแล้ว!';
      badge = 'นัดหมายสำเร็จ';
      badgeColor = '#16a34a';
      leadText = `นายหน้าได้ยืนยันเวลานัดหมายเข้าชมบ้านเรียบร้อยแล้ว กรุณาไปถึงตามวันและเวลาที่นัดหมาย`;
      break;

    case 'cancelled':
      subject = `[Srichai Property] ⚠️ นัดหมายชมบ้านถูกยกเลิก: ${params.propertyTitle}`;
      title = 'การนัดหมายชมบ้านถูกยกเลิก';
      badge = 'ยกเลิกนัดหมาย';
      badgeColor = '#dc2626';
      leadText = `รายการนัดหมายเข้าชมทรัพย์สินนี้ถูกยกเลิกแล้ว ${params.notes ? `(เหตุผล: ${params.notes})` : ''}`;
      break;

    case 'rescheduled':
      subject = `[Srichai Property] 📅 มีการขอเลื่อนเวลานัดหมาย: ${params.propertyTitle}`;
      title = 'มีการขอเลื่อนเวลานัดหมายเข้าชมบ้าน';
      badge = 'ขอเลื่อนเวลา';
      badgeColor = '#ca8a04';
      leadText = `อีกฝ่ายได้ขอเสนอวันและเวลานัดหมายใหม่ กรุณาตรวจสอบและยืนยันรอบเวลา`;
      break;

    case 'reminder':
      subject = `[Srichai Property] ⏰ แจ้งเตือน: พรุ่งนี้คุณมีนัดหมายชมบ้าน`;
      title = 'แจ้งเตือนนัดหมายชมบ้านล่วงหน้า';
      badge = 'เตือนล่วงหน้า';
      badgeColor = '#2563eb';
      leadText = `เตือนความจำ คุณมีนัดหมายเข้าชมทรัพย์สินในวันพรุ่งนี้ กรุณาเตรียมตัวและตรวจสอบการเดินทาง`;
      break;
  }

  const details = [
    { label: 'ทรัพย์สิน', value: params.propertyTitle },
    ...(params.propertyLocation ? [{ label: 'ทำเล/ที่ตั้ง', value: params.propertyLocation }] : []),
    { label: 'วันที่นัดหมาย', value: params.date },
    { label: 'ช่วงเวลา', value: params.timeSlot },
    { label: isAgent ? 'ข้อมูลลูกค้า' : 'นายหน้าผู้ดูแล', value: params.otherPartyName + (params.otherPartyPhone ? ` (${params.otherPartyPhone})` : '') },
  ];

  const html = renderMasterEmailTemplate({
    title,
    badge,
    badgeColor,
    recipientName: params.recipientName,
    leadText,
    details,
    ctaText: isAgent ? 'ดูรายละเอียดและจัดการนัดหมาย' : 'ดูรายละเอียดการนัดหมาย',
    ctaUrl: params.actionUrl,
  });

  const text = `${title}\nเรียน ${params.recipientName}\n${leadText}\nทรัพย์สิน: ${params.propertyTitle}\nวันที่: ${params.date} (${params.timeSlot})\nลิงก์: ${params.actionUrl}`;

  return { subject, html, text };
}

/**
 * 2. เทมเพลต: ข้อความแชทใหม่ (New Chat Message Notification)
 */
export function getChatNotificationEmailTemplate(params: {
  recipientName: string;
  senderName: string;
  senderRoleText: string;
  messagePreview: string;
  propertyTitle?: string;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Srichai Property] 💬 ข้อความใหม่จาก ${params.senderName}`;
  const title = `คุณมีข้อความใหม่จาก ${params.senderName}`;

  const details = [
    { label: 'ผู้ส่งข้อความ', value: `${params.senderName} (${params.senderRoleText})` },
    ...(params.propertyTitle ? [{ label: 'เกี่ยวกับทรัพย์สิน', value: params.propertyTitle }] : []),
    { label: 'ข้อความล่าสุด', value: `"${params.messagePreview}"` },
  ];

  const html = renderMasterEmailTemplate({
    title,
    badge: 'ข้อความใหม่',
    badgeColor: '#0284c7',
    recipientName: params.recipientName,
    leadText: `มีข้อความใหม่ส่งถึงคุณในระบบ Srichai Property คุณสามารถกดลิงก์ด้านล่างเพื่อเปิดห้องแชทและสนทนาได้ทันที`,
    details,
    ctaText: 'เปิดดูห้องแชทและตอบกลับ',
    ctaUrl: params.actionUrl,
    footerNote: 'เพื่อความเป็นส่วนตัวและความปลอดภัย กรุณาตอบกลับผ่านระบบแชทในเว็บไซต์ Srichai Property'
  });

  const text = `${title}\nเรียน ${params.recipientName}\nมีข้อความใหม่จาก: ${params.senderName}\nข้อความ: "${params.messagePreview}"\nเปิดดูแชทได้ที่: ${params.actionUrl}`;

  return { subject, html, text };
}

/**
 * 3. เทมเพลต: ผลการอนุมัติประกาศทรัพย์ (Property Approval / Rejection)
 */
export function getPropertyApprovalEmailTemplate(params: {
  agentName: string;
  propertyTitle: string;
  isApproved: boolean;
  reason?: string;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = params.isApproved
    ? `[Srichai Property] 🎉 ประกาศทรัพย์ของคุณได้รับการอนุมัติแล้ว: ${params.propertyTitle}`
    : `[Srichai Property] ℹ️ ประกาศทรัพย์ต้องแก้ไขข้อมูล: ${params.propertyTitle}`;

  const title = params.isApproved
    ? 'ประกาศทรัพย์สินของคุณได้รับการอนุมัติและเผยแพร่แล้ว!'
    : 'ประกาศทรัพย์สินต้องได้รับการแก้ไขเพิ่มเติม';

  const details = [
    { label: 'ชื่อประกาศ', value: params.propertyTitle },
    { label: 'สถานะการตรวจสอบ', value: params.isApproved ? 'อนุมัติเรียบร้อย (Active)' : 'ต้องแก้ไข (Action Required)' },
    ...(params.reason ? [{ label: 'ข้อเสนอแนะจากเจ้าหน้าที่', value: params.reason }] : []),
  ];

  const html = renderMasterEmailTemplate({
    title,
    badge: params.isApproved ? 'อนุมัติแล้ว' : 'ต้องแก้ไข',
    badgeColor: params.isApproved ? '#16a34a' : '#ea580c',
    recipientName: params.agentName,
    leadText: params.isApproved
      ? 'ทีมงานได้ตรวจสอบและอนุมัติประกาศของคุณเรียบร้อยแล้ว ขณะนี้ประกาศได้ถูกเผยแพร่สู่สายตาผู้ค้นหาทั่วประเทศ'
      : 'ทีมงานได้ตรวจสอบประกาศแล้ว พบว่ามีข้อมูลบางส่วนที่ต้องได้รับการปรับปรุงก่อนจึงจะสามารถเผยแพร่ได้',
    details,
    ctaText: params.isApproved ? 'ดูประกาศบนเว็บไซต์' : 'แก้ไขประกาศทันที',
    ctaUrl: params.actionUrl,
  });

  const text = `${title}\nเรียน ${params.agentName}\nประกาศ: ${params.propertyTitle}\nสถานะ: ${params.isApproved ? 'อนุมัติ' : 'ต้องแก้ไข'}\nลิงก์: ${params.actionUrl}`;

  return { subject, html, text };
}

/**
 * 4. เทมเพลต: ผลการตรวจสอบเอกสาร KYC ยืนยันตัวตนนายหน้า
 */
export function getKycStatusEmailTemplate(params: {
  agentName: string;
  isApproved: boolean;
  reason?: string;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = params.isApproved
    ? `[Srichai Property] 🛡️ บัญชีนายหน้าของคุณผ่านการยืนยันตัวตน (Verified Pro) แล้ว`
    : `[Srichai Property] ⚠️ เอกสารยืนยันตัวตน KYC ต้องส่งใหม่`;

  const title = params.isApproved
    ? 'ยินดีด้วย! บัญชีของคุณผ่านการยืนยันตัวตนเรียบร้อยแล้ว'
    : 'เอกสารยืนยันตัวตน (KYC) ไม่ผ่านการอนุมัติ';

  const details = [
    { label: 'ชื่อผู้ลงทะเบียน', value: params.agentName },
    { label: 'สถานะ KYC', value: params.isApproved ? 'ผ่านการตรวจสอบ (Verified)' : 'ไม่ผ่านการตรวจสอบ (Rejected)' },
    ...(params.reason ? [{ label: 'เหตุผล/สิ่งที่ต้องแนบเพิ่ม', value: params.reason }] : []),
  ];

  const html = renderMasterEmailTemplate({
    title,
    badge: params.isApproved ? 'KYC ผ่านแล้ว' : 'KYC ไม่ผ่าน',
    badgeColor: params.isApproved ? '#16a34a' : '#dc2626',
    recipientName: params.agentName,
    leadText: params.isApproved
      ? 'ทีมงานได้อนุมัติเอกสารยืนยันตัวตนของคุณเรียบร้อยแล้ว บัญชีของคุณได้รับตราสัญลักษณ์ Verified Pro Agent เพิ่มความน่าเชื่อถือ'
      : 'เอกสารยืนยันตัวตนที่คุณแนบมาไม่ผ่านเกณฑ์การตรวจสอบ กรุณาตรวจสอบเหตุผลและแนบเอกสารใหม่อีกครั้ง',
    details,
    ctaText: params.isApproved ? 'เข้าสู่หน้าแดชบอร์ดนายหน้า' : 'ส่งเอกสารยืนยันตัวตนใหม่',
    ctaUrl: params.actionUrl,
  });

  const text = `${title}\nเรียน ${params.agentName}\nสถานะ: ${params.isApproved ? 'ผ่านการยืนยัน' : 'ไม่ผ่าน'}\nเข้าสู่ระบบ: ${params.actionUrl}`;

  return { subject, html, text };
}

/**
 * 5. เทมเพลต: การชำระเงินและอัปเกรดแพ็กเกจ (Payment & Package)
 */
export function getPaymentEmailTemplate(params: {
  userName: string;
  packageName: string;
  amount: string;
  isApproved: boolean;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = params.isApproved
    ? `[Srichai Property] 💎 ยืนยันการอัปเกรดแพ็กเกจ ${params.packageName} เรียบร้อยแล้ว`
    : `[Srichai Property] ⚠️ สลิปชำระเงินแพ็กเกจ ${params.packageName} ไม่ผ่านการตรวจสอบ`;

  const title = params.isApproved
    ? 'การชำระเงินและอัปเกรดแพ็กเกจสำเร็จ!'
    : 'ไม่สามารถยืนยันการชำระเงินได้';

  const details = [
    { label: 'แพ็กเกจที่เลือก', value: params.packageName },
    { label: 'ยอดชำระ', value: `฿${params.amount}` },
    { label: 'สถานะ', value: params.isApproved ? 'อนุมัติเรียบร้อย' : 'ปฏิเสธ (กรุณาแนบสลิปใหม่)' },
  ];

  const html = renderMasterEmailTemplate({
    title,
    badge: params.isApproved ? 'ชำระเงินสำเร็จ' : 'ชำระเงินไม่ผ่าน',
    badgeColor: params.isApproved ? '#16a34a' : '#dc2626',
    recipientName: params.userName,
    leadText: params.isApproved
      ? `ระบบได้เปิดใช้งานสิทธิพิเศษแพ็กเกจ ${params.packageName} ให้กับบัญชีของคุณเรียบร้อยแล้ว`
      : 'เจ้าหน้าที่ไม่สามารถยืนยันสลิปการโอนเงินได้ กรุณาตรวจสอบยอดเงินและส่งสลิปใหม่อีกครั้ง',
    details,
    ctaText: 'ดูสถานะแพ็กเกจของฉัน',
    ctaUrl: params.actionUrl,
  });

  const text = `${title}\nเรียน ${params.userName}\nแพ็กเกจ: ${params.packageName}\nยอด: ${params.amount}\nดูรายละเอียด: ${params.actionUrl}`;

  return { subject, html, text };
}

/**
 * 6. เทมเพลตทั่วไป / การแจ้งเตือนระบบ (General Notification Template)
 */
export function getGeneralNotificationEmailTemplate(params: {
  recipientName: string;
  title: string;
  leadText: string;
  badge?: string;
  details?: { label: string; value: string }[];
  actionText?: string;
  actionUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Srichai Property] ${params.title}`;

  const html = renderMasterEmailTemplate({
    title: params.title,
    badge: params.badge || 'แจ้งเตือนระบบ',
    recipientName: params.recipientName,
    leadText: params.leadText,
    details: params.details,
    ctaText: params.actionText,
    ctaUrl: params.actionUrl,
  });

  const text = `${params.title}\nเรียน ${params.recipientName}\n${params.leadText}\n${params.actionUrl ? `ลิงก์: ${params.actionUrl}` : ''}`;

  return { subject, html, text };
}
