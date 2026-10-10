import dotenv from 'dotenv';
dotenv.config();
import { sendEmail } from '../lib/services/emailService';

async function main() {
  const targetEmail = process.env.SMTP_USER || 'mean1940@gmail.com';
  console.log(`Sending live test email to: ${targetEmail}...`);

  const res = await sendEmail({
    to: targetEmail,
    subject: '[Srichai Property] 🎉 ยืนยันระบบส่งอีเมลจริงสำเร็จแล้ว!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #2563eb; margin-top: 0;">ยินดีด้วยครับ! 🎉 ระบบส่งอีเมลพร้อมใช้งานจริง 100%</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          อีเมลนี้เป็นข้อความยืนยันว่าการตั้งค่า <strong>Google App Password</strong> ใน <code>.env</code> ถูกต้องสมบูรณ์ และเชื่อมต่อกับ SMTP สำเร็จเรียบร้อยแล้วครับ
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #1e293b; font-weight: bold;">ฟีเจอร์ที่จะทำงานอัตโนมัติจากนี้:</p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #475569;">
            <li>เมื่อมีลูกค้านัดหมายชมบ้าน ➔ เมลแจ้งนายหน้าทันที</li>
            <li>เมื่อมีคนส่งข้อความแชทใหม่ ➔ เมลแจ้งเตือนทันที</li>
            <li>เมื่อ Admin อนุมัติ KYC / อนุมัติประกาศทรัพย์ ➔ เมลแจ้งผลทันที</li>
          </ul>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Srichai Property Real Estate Platform</p>
      </div>
    `,
    text: 'ยินดีด้วยครับ! ระบบส่งอีเมลแจ้งเตือนของ Srichai Property เชื่อมต่อกับ Gmail จริงเรียบร้อยแล้ว'
  });

  console.log('Result:', res);
}

main().catch(console.error);
