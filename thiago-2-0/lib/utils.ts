import { TARGET_DATE } from './constants';

export function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function nowTimeISO(): string {
  return new Date().toTimeString().slice(0, 5);
}

export function daysUntilTarget(): number {
  const ms = TARGET_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function totalDays(start: Date | string): number {
  const startD = typeof start === 'string' ? new Date(start) : start;
  return Math.max(1, Math.ceil((TARGET_DATE.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
}

export function progressPct(start: Date | string): number {
  const startD = typeof start === 'string' ? new Date(start) : start;
  const total = TARGET_DATE.getTime() - startD.getTime();
  const elapsed = Date.now() - startD.getTime();
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function classNames(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ');
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari standalone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  return window.matchMedia('(display-mode: standalone)').matches || navAny.standalone === true;
}
