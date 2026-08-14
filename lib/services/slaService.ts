// 🔑 KEYWORD: SLA คำนวณเวลาที่แอดมินเหลือในการตรวจประกาศ

/** กรอบเวลาที่แอดมินต้องตรวจประกาศให้เสร็จ นับจากเวลาที่นายหน้ากดส่ง (ชั่วโมง) */
export const MODERATION_SLA_HOURS = 24;

/** เหลือน้อยกว่านี้ถือว่า "ด่วน" (ชั่วโมง) */
export const MODERATION_SLA_URGENT_HOURS = 4;

/** เหลือน้อยกว่านี้ถือว่า "ใกล้ครบกำหนด" (ชั่วโมง) */
export const MODERATION_SLA_WARNING_HOURS = 12;

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

/** ระดับความด่วน ใช้เลือกสีที่หน้าเว็บ */
export type SlaLevel = 'normal' | 'warning' | 'urgent' | 'overdue';

export interface SlaInfo {
  /** เวลาครบกำหนดตรวจ (created_at + MODERATION_SLA_HOURS) */
  deadline: Date;
  /** นาทีที่เหลือ (ติดลบ = เลยกำหนดมาแล้ว) */
  minutesLeft: number;
  /** ชั่วโมงที่เหลือแบบทศนิยม (ติดลบ = เลยกำหนดมาแล้ว) */
  hoursLeft: number;
  /** ข้อความพร้อมแสดง เช่น "เหลือ 45 นาที" / "เกินกำหนด 3 ชม." */
  label: string;
  /** ระดับความด่วน ใช้เลือกสีป้าย */
  level: SlaLevel;
  /** เลยกำหนดแล้วหรือยัง */
  isOverdue: boolean;
}

/**
 * คำนวณสถานะ SLA ของประกาศ 1 รายการ
 *
 * @param createdAt เวลาที่นายหน้ากดส่งประกาศเข้ามา
 * @param now       เวลาปัจจุบัน (ส่งเข้ามาได้เพื่อให้เทสต์ผลลัพธ์คงที่)
 */
export function calculateModerationSla(
  createdAt: Date | string,
  now: number = Date.now()
): SlaInfo {
  const deadline = new Date(new Date(createdAt).getTime() + MODERATION_SLA_HOURS * MS_PER_HOUR);
  const msLeft = deadline.getTime() - now;
  const minutesLeft = Math.ceil(msLeft / MS_PER_MINUTE);
  const hoursLeft = msLeft / MS_PER_HOUR;
  const isOverdue = msLeft <= 0;

  return {
    deadline,
    minutesLeft,
    hoursLeft,
    label: formatSlaLabel(minutesLeft),
    level: resolveSlaLevel(hoursLeft),
    isOverdue
  };
}

/**
 * แปลงนาทีที่เหลือเป็นข้อความภาษาไทย
 * เหลือไม่ถึง 1 ชม. จะบอกเป็นนาที เพื่อให้แอดมินเห็นความเร่งด่วนชัดขึ้น
 */
function formatSlaLabel(minutesLeft: number): string {
  if (minutesLeft <= 0) {
    const overdueMinutes = -minutesLeft;
    return overdueMinutes < 60
      ? `เกินกำหนด ${overdueMinutes} นาที`
      : `เกินกำหนด ${Math.floor(overdueMinutes / 60)} ชม.`;
  }
  return minutesLeft < 60
    ? `เหลือ ${minutesLeft} นาที`
    : `เหลือ ${Math.floor(minutesLeft / 60)} ชม.`;
}

/** จัดระดับความด่วนจากชั่วโมงที่เหลือ */
function resolveSlaLevel(hoursLeft: number): SlaLevel {
  if (hoursLeft <= 0) return 'overdue';
  if (hoursLeft <= MODERATION_SLA_URGENT_HOURS) return 'urgent';
  if (hoursLeft <= MODERATION_SLA_WARNING_HOURS) return 'warning';
  return 'normal';
}
