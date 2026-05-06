'use client';

import { useCallback, useRef } from 'react';

type Tone = 'check' | 'uncheck' | 'glucose' | 'levelup';

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (_ctx) return _ctx;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctor: typeof AudioContext | undefined = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

function envelope(ctx: AudioContext, gain: GainNode, peak: number, attack: number, hold: number, release: number, t0: number) {
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.setValueAtTime(peak, t0 + attack + hold);
  gain.gain.linearRampToValueAtTime(0, t0 + attack + hold + release);
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

function playCheck(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, t0);
  o.frequency.exponentialRampToValueAtTime(1320, t0 + 0.18);
  envelope(ctx, g, 0.18, 0.01, 0.06, 0.13, t0);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.22);
  vibrate(12);
}

function playUncheck(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(660, t0);
  o.frequency.exponentialRampToValueAtTime(440, t0 + 0.13);
  envelope(ctx, g, 0.10, 0.01, 0.04, 0.10, t0);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.16);
  vibrate(4);
}

function playGlucose(ctx: AudioContext) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(700, t0);
  o.frequency.exponentialRampToValueAtTime(900, t0 + 0.18);
  envelope(ctx, g, 0.16, 0.01, 0.07, 0.12, t0);
  o.connect(g).connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + 0.22);
  vibrate(15);
}

function playLevelUp(ctx: AudioContext) {
  const tones = [523.25, 659.25, 783.99, 1046.5];
  const stagger = 0.08;
  tones.forEach((freq, i) => {
    const t0 = ctx.currentTime + i * stagger;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t0);
    envelope(ctx, g, 0.20, 0.005, 0.06, 0.18, t0);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + 0.26);
  });
  vibrate([20, 60, 20, 60, 30]);
}

export function useSound() {
  const enabledRef = useRef(true);

  const play = useCallback((tone: Tone) => {
    if (!enabledRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    switch (tone) {
      case 'check':    playCheck(ctx); break;
      case 'uncheck':  playUncheck(ctx); break;
      case 'glucose': playGlucose(ctx); break;
      case 'levelup': playLevelUp(ctx); break;
    }
  }, []);

  const setEnabled = useCallback((v: boolean) => { enabledRef.current = v; }, []);

  return { play, setEnabled };
}
