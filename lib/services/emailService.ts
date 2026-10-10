/**
 * ==============================================================================
 * emailService.ts - บริการส่งอีเมลแจ้งเตือนกลาง (Central Email Notification Service)
 * ==============================================================================
 * วัตถุประสงค์:
 * 1. เชื่อมต่อส่งอีเมลผ่าน Gmail SMTP (Nodemailer) อย่างเสถียรและปลอดภัย
 * 2. มี Mock Mode อัตโนมัติ: หากยังไม่ได้ใส่ SMTP_USER/SMTP_PASS ใน .env.local
 *    ระบบจะจำลองการส่งและพิมพ์ Log สวยงามให้ดูใน Console ทันทีโดยไม่ทำให้เว็บ Error
 * 3. มีระบบ Chat Cooldown ป้องกันการยิงอีเมลรัวๆ เวลาแชทคุยกัน
 * 4. รองรับการทำงานแบบ Asynchronous Non-blocking ไม่ทำให้หน้าเว็บหน่วง
 * ==============================================================================
 */

import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  error?: string;
}

// ------------------------------------------------------------------------------
// 1. ตั้งค่าการเชื่อมต่อ SMTP (Transporter Configuration)
// ------------------------------------------------------------------------------
function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim().replace(/\s+/g, '');
  const from = process.env.EMAIL_FROM || `Srichai Property <${user || 'no-reply@srichaiproperty.com'}>`;
  return { host, port, secure, user, pass, from };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const cfg = getSmtpConfig();
  if (!cfg.user || !cfg.pass) {
    return null; // ยังไม่ได้ตั้งค่า SMTP -> เข้าสู่ Mock Mode
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  }

  return transporter;
}

/**
 * ตรวจสอบว่าระบบตั้งค่าการส่งอีเมลจริงไว้หรือยัง
 */
export function isEmailConfigured(): boolean {
  const cfg = getSmtpConfig();
  return Boolean(cfg.user && cfg.pass);
}

// ------------------------------------------------------------------------------
// 2. ระบบป้องกันการส่งอีเมลแชทถี่เกินไป (Chat Email Cooldown Cache)
// ------------------------------------------------------------------------------
// เก็บเวลาส่งล่าสุดตามคีย์: `session_${sessionId}_recipient_${recipientId}`
const chatEmailCooldownMap = new Map<string, number>();
const CHAT_COOLDOWN_MS = 5 * 60 * 1000; // 5 นาทีต่อ 1 ฉบับ

/**
 * ตรวจสอบว่าสามารถส่งอีเมลแจ้งเตือนแชทได้หรือไม่ (ป้องกันส่งรัวๆ)
 */
export function checkChatEmailAllowed(sessionId: string, recipientId: string): boolean {
  const key = `chat_${sessionId}_${recipientId}`;
  const lastSent = chatEmailCooldownMap.get(key);
  const now = Date.now();

  if (lastSent && now - lastSent < CHAT_COOLDOWN_MS) {
    return false; // ยังอยู่ในช่วง Cooldown
  }

  // อัปเดตเวลาล่าสุด
  chatEmailCooldownMap.set(key, now);
  
  // ทำความสะอาด Cache เก่าเมื่อมีขนาดใหญ่เกินไป (> 1,000 รายการ)
  if (chatEmailCooldownMap.size > 1000) {
    const expiredCutoff = now - CHAT_COOLDOWN_MS;
    for (const [k, time] of chatEmailCooldownMap.entries()) {
      if (time < expiredCutoff) chatEmailCooldownMap.delete(k);
    }
  }

  return true;
}

// ------------------------------------------------------------------------------
// 3. ฟังก์ชันหลักสำหรับส่งอีเมล (Send Email Engine)
// ------------------------------------------------------------------------------
/**
 * ส่งอีเมลแบบปลอดภัย ไม่บล็อกการทำงานหลักของเว็บ
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  try {
    if (!to || !to.includes('@')) {
      console.warn(`[EmailService] อีเมลผู้รับไม่ถูกต้อง: "${to}"`);
      return { success: false, error: 'อีเมลผู้รับไม่ถูกต้อง' };
    }

    const cfg = getSmtpConfig();
    const effectiveFrom = from || cfg.from;
    const mailer = getTransporter();

    // กรณีไม่มีการตั้งค่า SMTP ใน .env -> ทำงานในโหมด Mock จำลองอย่างปลอดภัย
    if (!mailer) {
      console.log(`\n================== [EMAIL SERVICE (DEV MOCK)] ==================`);
      console.log(`📬 ถึง (To):        ${to}`);
      console.log(`📌 หัวข้อ (Subject): ${subject}`);
      console.log(`🕒 เวลา (Time):     ${new Date().toLocaleString('th-TH')}`);
      console.log(`💡 หมายเหตุ: ใส่ SMTP_USER และ SMTP_PASS ใน .env.local เพื่อส่งอีเมลจริงเข้า Inbox`);
      console.log(`=================================================================\n`);
      return {
        success: true,
        mocked: true,
        messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      };
    }

    // กรณีมี SMTP จริง -> ส่งออกไปยังเครือข่ายอินเทอร์เน็ต
    const info = await mailer.sendMail({
      from: effectiveFrom,
      to,
      subject,
      html,
      text: text || subject,
    });

    console.log(`[EmailService] ส่งอีเมลสำเร็จถึง ${to} (MessageId: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      mocked: false,
    };
  } catch (error) {
    const err = error as Error;
    console.error(`[EmailService Error] ไม่สามารถส่งอีเมลถึง ${to}:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * ทดสอบการเชื่อมต่อ SMTP Server
 */
export async function verifyEmailConnection(): Promise<{ success: boolean; message: string }> {
  const mailer = getTransporter();
  const cfg = getSmtpConfig();
  if (!mailer) {
    return {
      success: false,
      message: 'ยังไม่ได้ระบุ SMTP_USER หรือ SMTP_PASS ใน .env.local (กำลังทำงานในโหมด Mock)',
    };
  }

  try {
    await mailer.verify();
    return {
      success: true,
      message: `เชื่อมต่อกับ SMTP Server สำเร็จพร้อมใช้งาน (${cfg.host}:${cfg.port})`,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `เชื่อมต่อ SMTP ล้มเหลว: ${err.message}`,
    };
  }
}
