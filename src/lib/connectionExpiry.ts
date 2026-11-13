import { DthConnection } from '../types';

export function getPackDuration(value: string): number | undefined {
  const days = value.match(/\b(30|90|180|360)\s*days?\b/i);
  if (days) return Number(days[1]) / 30;
  const months = value.match(/\b(1|3|6|12)\s*(?:months?|mos?)\b/i);
  if (months) return Number(months[1]);
  if (/\b(?:annual|yearly|1\s*year)\b/i.test(value)) return 12;
  return undefined;
}

export function calculateConnectionExpiry(rechargeDate: string, months: number): string | undefined {
  const date = new Date(rechargeDate);
  if (!Number.isFinite(date.getTime()) || ![6, 12].includes(months)) return undefined;
  // Use the completion calendar date in India, including completions after UTC midnight.
  const indianDate = new Date(date.getTime() + 330 * 60_000);
  indianDate.setUTCDate(indianDate.getUTCDate() + (months === 6 ? 180 : 360));
  return indianDate.toISOString().slice(0, 10);
}

export function getConnectionExpiry(connection: DthConnection): string | undefined {
  const months = connection.packDurationMonths ?? getPackDuration(connection.packName || '');
  if (![6, 12].includes(months!) || !connection.rechargeCompletedAt) return undefined;
  return calculateConnectionExpiry(connection.rechargeCompletedAt, months!);
}
