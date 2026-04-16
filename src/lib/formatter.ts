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

const LEADING_PREPS = /^(de|do|da|dos|das|no|na|nos|nas|em|com|pra|pro|para|ao|\u00e0|uns|umas|um|uma)\s+/i;

export function normalizeDescription(raw: string): string {
  let s = raw.trim();
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(LEADING_PREPS, '');
    if (s === before) break;
  }
  s = s.replace(/\s+/g, ' ').trim();
  if (!s) return raw.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function getLastDayOfWeek(dayOfWeek: number): Date {
  const now = new Date();
  let diff = now.getDay() - dayOfWeek;
  if (diff <= 0) diff += 7;
  return new Date(now.getTime() - diff * 86400000);
}
