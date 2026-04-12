import { FRIENDLY_NAMES, MONTHS } from '@/types';

export function fmtValor(v: number): string {
  if (v === Math.floor(v)) return `R$ ${v.toFixed(0)}`;
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

export function friendlyName(cat: string): string {
  return FRIENDLY_NAMES[cat] || cat.toLowerCase();
}

export function monthLabel(date: Date = new Date()): string {
  return MONTHS[date.getMonth() + 1] || 'Janeiro';
}

export function fmtDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${d}/${m}`;
}

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function getLastDayOfWeek(dayOfWeek: number): Date {
  const now = new Date();
  let diff = now.getDay() - dayOfWeek;
  if (diff <= 0) diff += 7;
  return new Date(now.getTime() - diff * 86400000);
}
