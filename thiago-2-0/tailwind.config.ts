import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        bgElev: 'var(--c-bg-elev)',
        card: 'var(--c-card)',
        cardSoft: 'var(--c-card-soft)',
        border: 'var(--c-border)',
        borderHi: 'var(--c-border-hi)',
        ink: 'var(--c-ink)',
        inkSoft: 'var(--c-ink-soft)',
        muted: 'var(--c-muted)',
        dim: 'var(--c-dim)',
        indigo: 'var(--c-indigo)',
        indigoHi: 'var(--c-indigo-hi)',
        indigoSoft: 'var(--c-indigo-soft)',
        gold: 'var(--c-gold)',
        goldSoft: 'var(--c-gold-soft)',
        emerald: 'var(--c-emerald)',
        emeraldSoft: 'var(--c-emerald-soft)',
        coral: 'var(--c-coral)',
        coralSoft: 'var(--c-coral-soft)',
      },
      fontFamily: {
        display: ['var(--font-italiana)', 'serif'],
        serif: ['var(--font-dm-serif)', 'serif'],
        italic: ['var(--font-cormorant)', 'serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      letterSpacing: {
        ultra: '0.4em',
        wider2: '0.28em',
      },
      animation: {
        slideUp: 'slideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        pulseGlow: 'pulseGlow 1.6s ease-in-out infinite',
        fadeIn: 'fadeIn 0.4s ease-out',
        confetti: 'confetti 1.4s cubic-bezier(0.18, 0.7, 0.4, 1) forwards',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 oklch(0.62 0.230 270 / 0.0)' },
          '50%': { boxShadow: '0 0 28px 4px oklch(0.62 0.230 270 / 0.45)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        confetti: {
          '0%': { transform: 'translate(0, 0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translate(var(--cx), var(--cy)) rotate(var(--cr))', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
