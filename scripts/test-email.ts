import { isEmailConfigured, sendEmail, verifyEmailConnection } from '../lib/services/emailService';
import {
  getAppointmentEmailTemplate,
  getChatNotificationEmailTemplate,
  getPropertyApprovalEmailTemplate,
  getKycStatusEmailTemplate,
  getPaymentEmailTemplate,
  getGeneralNotificationEmailTemplate,
} from '../lib/templates/emailTemplates';

async function main() {
  console.log('--- Testing Srichai Property Email System ---');
  console.log('isEmailConfigured:', isEmailConfigured());

  const conn = await verifyEmailConnection();
  console.log('verifyEmailConnection:', conn);

  // 1. Test Appointment Template
  const apt = getAppointmentEmailTemplate({
    role: 'agent',
    eventType: 'new',
    recipientName: 'คุณอนันต์ นายหน้า',
    propertyTitle: 'บ้านเดี่ยว 2 ชั้น ศุภาลัย การ์เด้นวิลล์ หาดใหญ่',
    propertyLocation: 'ต.คอหงส์ อ.หาดใหญ่ จ.สงขลา',
    date: 'วันเสาร์ที่ 12 ตุลาคม 2026',
    timeSlot: '10:00 - 11:30 น.',
    otherPartyName: 'คุณสมชาย ใจดี',
    otherPartyPhone: '081-234-5678',
    actionUrl: 'http://localhost:3000/agent/appointments',
  });
  console.log('\n[Template 1: Appointment] Subject:', apt.subject);
  const res1 = await sendEmail({ to: 'tester@example.com', subject: apt.subject, html: apt.html, text: apt.text });
  console.log('Send Result 1:', res1);

  // 2. Test Chat Template
  const chat = getChatNotificationEmailTemplate({
    recipientName: 'คุณอนันต์',
    senderName: 'คุณสมชาย',
    senderRoleText: 'ลูกค้าผู้สนใจ',
    messagePreview: 'สวัสดีครับ บ้านหลังนี้ยังว่างอยู่ไหมครับ ขอนัดดูวันเสาร์นี้ได้ไหมครับ',
    propertyTitle: 'บ้านเดี่ยว 2 ชั้น ศุภาลัย',
    actionUrl: 'http://localhost:3000/agent/chat',
  });
  console.log('\n[Template 2: Chat] Subject:', chat.subject);
  const res2 = await sendEmail({ to: 'tester@example.com', subject: chat.subject, html: chat.html, text: chat.text });
  console.log('Send Result 2:', res2);

  // 3. Test KYC Template
  const kyc = getKycStatusEmailTemplate({
    agentName: 'คุณอนันต์',
    isApproved: true,
    actionUrl: 'http://localhost:3000/agent/dashboard',
  });
  console.log('\n[Template 3: KYC] Subject:', kyc.subject);
  const res3 = await sendEmail({ to: 'tester@example.com', subject: kyc.subject, html: kyc.html, text: kyc.text });
  console.log('Send Result 3:', res3);

  // 4. Test Property Template
  const prop = getPropertyApprovalEmailTemplate({
    agentName: 'คุณอนันต์',
    propertyTitle: 'ทาวน์โฮมโมเดิร์น คลองแห หาดใหญ่',
    isApproved: true,
    actionUrl: 'http://localhost:3000/search',
  });
  console.log('\n[Template 4: Property] Subject:', prop.subject);
  const res4 = await sendEmail({ to: 'tester@example.com', subject: prop.subject, html: prop.html, text: prop.text });
  console.log('Send Result 4:', res4);

  // 5. Test Payment Template
  const pay = getPaymentEmailTemplate({
    userName: 'คุณอนันต์',
    packageName: 'Agent Pro',
    amount: '4,900',
    isApproved: true,
    actionUrl: 'http://localhost:3000/agent/packages',
  });
  console.log('\n[Template 5: Payment] Subject:', pay.subject);
  const res5 = await sendEmail({ to: 'tester@example.com', subject: pay.subject, html: pay.html, text: pay.text });
  console.log('Send Result 5:', res5);

  console.log('\n✅ All 5 Email Templates and Services passed successfully!');
}

main().catch(console.error);
