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
  if (!Number.isFinite(date.getTime()) || ![1, 3, 6, 12].includes(months)) return undefined;
  date.setUTCDate(date.getUTCDate() + months * 30);
  return date.toISOString().slice(0, 10);
}

export function getConnectionExpiry(connection: DthConnection): string | undefined {
  const months = connection.packDurationMonths ?? getPackDuration(connection.packName || '');
  if (months === 1) return undefined;
  if (months && connection.lastRechargeDate) {
    return calculateConnectionExpiry(connection.lastRechargeDate, months);
  }
  return connection.expiryDate || undefined;
}
