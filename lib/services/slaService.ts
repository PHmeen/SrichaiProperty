

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

// ==============================================================================
// ส่วนที่ 2: วัดผล SLA ย้อนหลัง (ใช้ได้หลังประกาศถูกตรวจแล้วเท่านั้น)
// ==============================================================================
// ส่วนบนตอบได้แค่ "ยังเหลือเวลาอีกเท่าไหร่" ของประกาศที่ยังรอตรวจ
// พอแอดมินกดอนุมัติ/ตีกลับ ข้อมูลนั้นก็หมดประโยชน์ทันที
// ส่วนนี้ใช้ reviewed_at คู่กับ created_at ตอบว่า "จริงๆ แล้วใช้เวลาไปเท่าไหร่
// และทันกำหนดหรือไม่" ซึ่งเป็นสิ่งที่ต้องใช้ตอนรายงานผล

export interface ReviewDurationInfo {
  /** เวลาที่ใช้ตรวจจริง (ชั่วโมงแบบทศนิยม) */
  hoursUsed: number;
  /** ข้อความพร้อมแสดง เช่น "3 ชม. 12 นาที" */
  label: string;
  /** ตรวจเสร็จภายใน MODERATION_SLA_HOURS หรือไม่ */
  withinSla: boolean;
}

/**
 * คำนวณว่าประกาศหนึ่งใบใช้เวลาตรวจไปเท่าไหร่
 * คืน null ถ้ายังไม่ถูกตรวจ หรือเป็นประกาศเก่าที่ยังไม่มี reviewed_at
 * (ข้อมูลก่อนฟีเจอร์นี้จะไม่มีค่า จึงต้องเผื่อกรณี null ไว้ทุกที่ที่เรียกใช้)
 */
export function calculateReviewDuration(
  createdAt: Date | string | null,
  reviewedAt: Date | string | null
): ReviewDurationInfo | null {
  if (!createdAt || !reviewedAt) return null;

  const ms = new Date(reviewedAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;

  const hoursUsed = ms / MS_PER_HOUR;
  return {
    hoursUsed,
    label: formatDurationLabel(ms),
    withinSla: hoursUsed <= MODERATION_SLA_HOURS
  };
}

/** แปลงช่วงเวลาเป็นข้อความภาษาไทย เช่น "3 ชม. 12 นาที" / "45 นาที" */
function formatDurationLabel(ms: number): string {
  const totalMinutes = Math.round(ms / MS_PER_MINUTE);
  if (totalMinutes < 60) return `${totalMinutes} นาที`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} วัน ${hours % 24} ชม.`;
  }
  return minutes === 0 ? `${hours} ชม.` : `${hours} ชม. ${minutes} นาที`;
}

export interface SlaSummary {
  /** จำนวนประกาศที่ตรวจเสร็จแล้วและมีข้อมูลเวลาครบ */
  reviewedCount: number;
  /** เวลาเฉลี่ยที่ใช้ตรวจ (ชั่วโมง) */
  averageHours: number;
  /** ข้อความเวลาเฉลี่ยพร้อมแสดง */
  averageLabel: string;
  /** จำนวนที่ตรวจทันกำหนด */
  withinSlaCount: number;
  /** เปอร์เซ็นต์ที่ตรวจทันกำหนด (ปัดเป็นจำนวนเต็ม) */
  withinSlaPercent: number;
}

/**
 * สรุปผล SLA จากรายการประกาศที่ตรวจแล้ว
 * ใบที่ยังไม่มี reviewed_at จะถูกข้าม ไม่นับรวมในค่าเฉลี่ย
 * (ไม่งั้นประกาศเก่าก่อนมีฟีเจอร์นี้จะทำให้ตัวเลขเพี้ยน)
 */
export function summarizeReviewSla(
  rows: { created_at: Date | string | null; reviewed_at: Date | string | null }[]
): SlaSummary {
  const durations = rows
    .map((r) => calculateReviewDuration(r.created_at, r.reviewed_at))
    .filter((d): d is ReviewDurationInfo => d !== null);

  if (durations.length === 0) {
    return { reviewedCount: 0, averageHours: 0, averageLabel: 'ยังไม่มีข้อมูล', withinSlaCount: 0, withinSlaPercent: 0 };
  }

  const totalHours = durations.reduce((sum, d) => sum + d.hoursUsed, 0);
  const averageHours = totalHours / durations.length;
  const withinSlaCount = durations.filter((d) => d.withinSla).length;

  return {
    reviewedCount: durations.length,
    averageHours,
    averageLabel: formatDurationLabel(averageHours * MS_PER_HOUR),
    withinSlaCount,
    withinSlaPercent: Math.round((withinSlaCount / durations.length) * 100)
  };
}
